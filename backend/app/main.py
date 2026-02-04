from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import extract # 👈 Importante para filtrar por mês
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from typing import List
from . import models, schemas, database, auth

# Cria as tabelas se não existirem
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI()

# Configuração de CORS
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(token: str = Depends(auth.oauth2_scheme), db: Session = Depends(get_db)):
    user = auth.get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Token inválido")
    return user

# --- ROTAS DE AUTENTICAÇÃO ---

@app.post("/token", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = auth.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
    
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/users/", response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(email=user.email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

# --- ROTAS DE TRANSAÇÕES ---

# 👇 ROTA NOVA: CLONAR MÊS ANTERIOR
@app.post("/transactions/clone")
def clone_fixed_transactions(
    target_year: int,
    target_month: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # 1. Calcular qual é o mês anterior
    if target_month == 1:
        prev_month = 12
        prev_year = target_year - 1
    else:
        prev_month = target_month - 1
        prev_year = target_year

    # 2. Buscar transações FIXAS do mês anterior
    old_txs = db.query(models.Transaction).filter(
        models.Transaction.owner_id == current_user.id,
        models.Transaction.is_fixed == True,
        extract('month', models.Transaction.date) == prev_month,
        extract('year', models.Transaction.date) == prev_year
    ).all()

    if not old_txs:
        return {"message": "Nenhuma despesa fixa encontrada no mês anterior."}

    count = 0
    for tx in old_txs:
        # 3. Criar a nova data
        # TRUQUE: Forçamos hour=12 (meio-dia) para evitar que o fuso horário jogue pro dia anterior
        try:
            new_date = tx.date.replace(year=target_year, month=target_month, hour=12, minute=0, second=0)
        except ValueError:
            # Se cair num dia inválido (ex: 30 de fev), joga pro dia 1º ao meio-dia
            new_date = tx.date.replace(year=target_year, month=target_month, day=1, hour=12, minute=0, second=0)

        new_tx = models.Transaction(
            description=tx.description,
            amount=tx.amount,
            type=tx.type,
            date=new_date,
            is_fixed=True, 
            category_id=tx.category_id,
            owner_id=current_user.id
        )
        db.add(new_tx)
        count += 1

    db.commit()
    return {"message": f"{count} transações clonadas!"}

@app.post("/transactions/", response_model=schemas.TransactionResponse)
def create_transaction(
    transaction: schemas.TransactionCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    category = db.query(models.Category).filter(models.Category.id == transaction.category_id).first()
    db_transaction = models.Transaction(**transaction.dict(), owner_id=current_user.id)
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

@app.get("/transactions/", response_model=List[schemas.TransactionResponse])
def read_transactions(
    skip: int = 0, 
    limit: int = 1000, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    transactions = db.query(models.Transaction)\
                     .filter(models.Transaction.owner_id == current_user.id)\
                     .order_by(models.Transaction.date.desc())\
                     .offset(skip).limit(limit).all()
    return transactions

@app.put("/transactions/{transaction_id}", response_model=schemas.TransactionResponse)
def update_transaction(
    transaction_id: int, 
    transaction: schemas.TransactionCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_transaction = db.query(models.Transaction).filter(
        models.Transaction.id == transaction_id,
        models.Transaction.owner_id == current_user.id
    ).first()
    
    if not db_transaction:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    
    for key, value in transaction.dict().items():
        setattr(db_transaction, key, value)
    
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

@app.delete("/transactions/{transaction_id}")
def delete_transaction(
    transaction_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_transaction = db.query(models.Transaction).filter(
        models.Transaction.id == transaction_id,
        models.Transaction.owner_id == current_user.id
    ).first()
    
    if not db_transaction:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
        
    db.delete(db_transaction)
    db.commit()
    return {"detail": "Transação deletada"}

# --- ROTAS DE CATEGORIAS ---

@app.get("/categories", response_model=List[schemas.CategoryResponse])
def get_categories(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Category).filter(models.Category.owner_id == current_user.id).all()

@app.post("/categories/", response_model=schemas.CategoryResponse)
def create_category(
    category: schemas.CategoryCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    exists = db.query(models.Category).filter(
        models.Category.name == category.name,
        models.Category.owner_id == current_user.id
    ).first()
    
    if exists:
        raise HTTPException(status_code=400, detail="Categoria já existe")
        
    new_category = models.Category(
        name=category.name,
        icon=category.icon,
        color=category.color,
        owner_id=current_user.id
    )
    db.add(new_category)
    db.commit()
    db.refresh(new_category)
    return new_category

@app.delete("/categories/{category_id}")
def delete_category(
    category_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_cat = db.query(models.Category).filter(
        models.Category.id == category_id,
        models.Category.owner_id == current_user.id
    ).first()
    
    if not db_cat:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    
    if db_cat.transactions:
        raise HTTPException(status_code=400, detail="Não é possível apagar categoria com transações.")

    db.delete(db_cat)
    db.commit()
    return {"detail": "Categoria deletada"}

@app.put("/categories/{category_id}", response_model=schemas.CategoryResponse)
def update_category(
    category_id: int, 
    category: schemas.CategoryCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_cat = db.query(models.Category).filter(
        models.Category.id == category_id,
        models.Category.owner_id == current_user.id
    ).first()
    
    if not db_cat:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    
    db_cat.name = category.name
    db_cat.icon = category.icon
    db_cat.color = category.color
    
    db.commit()
    db.refresh(db_cat)
    return db_cat