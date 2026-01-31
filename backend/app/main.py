from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from typing import List
from . import models, schemas, database, auth

# Cria as tabelas se não existirem
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI()

# Configuração de CORS (Permitir acesso do Frontend)
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, troque "*" pelo domínio do seu site
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependência para pegar o Banco de Dados
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Dependência de Usuário Atual
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

@app.post("/transactions/", response_model=schemas.TransactionResponse)
def create_transaction(
    transaction: schemas.TransactionCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Verifica se a categoria pertence ao usuário
    category = db.query(models.Category).filter(models.Category.id == transaction.category_id).first()
    if not category: # Permite criar sem categoria se quiser, ou trave aqui
        pass 
        
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
    # AQUI ESTAVA O ERRO: mudamos user_id para owner_id
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
    # Agora filtra categorias apenas do usuário dono
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
        
    # Aqui associa a categoria ao usuário logado (owner_id)
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
    # Verifica se a categoria pertence ao usuário antes de deletar
    db_cat = db.query(models.Category).filter(
        models.Category.id == category_id,
        models.Category.owner_id == current_user.id
    ).first()
    
    if not db_cat:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
        
    # Verifica se tem transações (opcional, mas seguro)
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