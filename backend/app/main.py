from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy import extract
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi.middleware.cors import CORSMiddleware
from . import models, database, schemas

# --- CONFIGURAÇÕES DE SEGURANÇA ---
SECRET_KEY = "segredo-super-secreto-do-cicero" # Em produção, isso fica numa variável de ambiente
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 300 # Token vale por 5 horas

# Ferramentas de Hash (Senha)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# Ferramenta que busca o token na URL (usaremos depois)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Cria as tabelas
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependência do Banco
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- FUNÇÕES ÚTEIS DE SEGURANÇA ---

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# --- ROTAS DE AUTENTICAÇÃO ---

# 1. CRIAR USUÁRIO (Cadastro)
@app.post("/users/", response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # Verifica se email já existe
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    # Cria usuário com senha criptografada
    hashed_password = get_password_hash(user.password)
    new_user = models.User(email=user.email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

# 2. LOGIN (Gera o Token)
@app.post("/token", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Busca usuário pelo email
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    
    # Verifica se usuário existe e se a senha bate
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Se deu tudo certo, cria o crachá (token)
    access_token = create_access_token(data={"sub": user.email, "id": user.id})
    return {"access_token": access_token, "token_type": "bearer"}


# --- ROTAS ANTIGAS (Mantidas para funcionar, mas vamos proteger em breve) ---

@app.post("/seed_categories")
def seed_categories(db: Session = Depends(get_db)):
    defaults = [
        {"name": "Alimentação", "icon": "utensils", "color": "#f87171"},
        {"name": "Transporte", "icon": "car", "color": "#fbbf24"},
        {"name": "Lazer", "icon": "gamepad-2", "color": "#a78bfa"},
        {"name": "Saúde", "icon": "activity", "color": "#34d399"},
        {"name": "Contas", "icon": "home", "color": "#60a5fa"},
        {"name": "Salário", "icon": "banknote", "color": "#34d399"},
        {"name": "Outros", "icon": "circle", "color": "#94a3b8"},
    ]
    created = []
    for cat in defaults:
        exists = db.query(models.Category).filter(models.Category.name == cat["name"]).first()
        if not exists:
            new_cat = models.Category(**cat)
            db.add(new_cat)
            created.append(cat["name"])
    db.commit()
    return {"message": "Categorias criadas!", "created": created}

@app.get("/categories", response_model=List[schemas.CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    return db.query(models.Category).all()

# ⚠️ Atenção: Estas rotas abaixo ainda estão abertas, vamos fechar na próxima etapa
@app.get("/transactions/{user_id}", response_model=List[schemas.TransactionResponse])
def read_transactions(user_id: int, month: Optional[int] = None, year: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(models.Transaction).filter(models.Transaction.user_id == user_id)
    if month and year:
        query = query.filter(extract('month', models.Transaction.date) == month)
        query = query.filter(extract('year', models.Transaction.date) == year)
    return query.options(joinedload(models.Transaction.category)).all()

# Para criar transação, agora precisamos do user_id manual (temporário até o front enviar token)
@app.post("/transactions/")
def create_transaction(transaction: schemas.TransactionCreate, user_id: int = 1, db: Session = Depends(get_db)):
    db_transaction = models.Transaction(
        description=transaction.description,
        amount=transaction.amount,
        type=transaction.type,
        user_id=user_id, # Temporário
        category_id=transaction.category_id,
        date=datetime.now()
    )
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

@app.delete("/transactions/{transaction_id}")
def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):
    transaction = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    if transaction:
        db.delete(transaction)
        db.commit()
        return {"message": "Transação deletada!"}
    return {"error": "Transação não encontrada"}

@app.put("/transactions/{transaction_id}")
def update_transaction(transaction_id: int, transaction: schemas.TransactionCreate, db: Session = Depends(get_db)):
    db_transaction = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    if not db_transaction:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    db_transaction.description = transaction.description
    db_transaction.amount = transaction.amount
    db_transaction.type = transaction.type
    db_transaction.category_id = transaction.category_id
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

@app.get("/reset_db")
def reset_database():
    models.Base.metadata.drop_all(bind=database.engine)
    models.Base.metadata.create_all(bind=database.engine)
    return {"message": "Banco de dados resetado com sucesso!"}