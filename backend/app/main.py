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

# CONFIGURAÇÕES
SECRET_KEY = "segredo-super-secreto-do-cicero"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 300

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI()

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

# --- SEGURANÇA ---

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

# 🔐 FUNÇÃO MÁGICA: Pega o usuário baseado no Token
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido ou expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

# --- ROTAS ---

@app.post("/users/", response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    hashed_password = get_password_hash(user.password)
    new_user = models.User(email=user.email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/token", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

# 🚀 ROTA SEGURA: Agora exige `current_user` e não pede ID na URL
@app.get("/transactions/", response_model=List[schemas.TransactionResponse])
def read_transactions(
    month: Optional[int] = None, 
    year: Optional[int] = None, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user) # <--- O GUARDIÃO
):
    # Filtra pelo ID do usuário que está logado (current_user.id)
    query = db.query(models.Transaction).filter(models.Transaction.user_id == current_user.id)
    
    if month and year:
        query = query.filter(extract('month', models.Transaction.date) == month)
        query = query.filter(extract('year', models.Transaction.date) == year)
    
    return query.options(joinedload(models.Transaction.category)).all()

# 🚀 CRIAR TRANSAÇÃO SEGURA
@app.post("/transactions/")
def create_transaction(
    transaction: schemas.TransactionCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user) # <--- O GUARDIÃO
):
    db_transaction = models.Transaction(
        description=transaction.description,
        amount=transaction.amount,
        type=transaction.type,
        user_id=current_user.id, # Pega o ID do Token, não do Frontend
        category_id=transaction.category_id,
        date=datetime.now()
    )
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

# As outras rotas (Deletar/Editar) também deveriam ser protegidas no futuro...
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

@app.get("/categories", response_model=List[schemas.CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    return db.query(models.Category).all()

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

@app.get("/reset_db")
def reset_database():
    models.Base.metadata.drop_all(bind=database.engine)
    models.Base.metadata.create_all(bind=database.engine)
    return {"message": "Banco resetado"}