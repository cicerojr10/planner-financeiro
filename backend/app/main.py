from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
from . import models, database

# Cria as tabelas no banco (se não existirem)
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI()

# Configuração de CORS (Para o Frontend acessar)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

# --- SCHEMAS (VALIDAÇÃO DE DADOS) ---

# O que precisamos receber para criar uma transação
class TransactionCreate(BaseModel):
    description: str
    amount: float
    type: str
    user_id: int
    category_id: Optional[int] = None # Agora aceitamos o ID da categoria

# O que vamos devolver para o Frontend (incluindo os detalhes da categoria)
class CategoryResponse(BaseModel):
    id: int
    name: str
    icon: str
    color: str
    class Config:
        orm_mode = True

class TransactionResponse(BaseModel):
    id: int
    description: str
    amount: float
    type: str
    date: datetime
    category: Optional[CategoryResponse] = None # Aninha os dados da categoria
    class Config:
        orm_mode = True

# --- ROTAS ---

# 1. Rota Especial: "Resetar e Semear" (Rode isso uma vez para criar as categorias)
@app.post("/seed_categories")
def seed_categories(db: Session = Depends(get_db)):
    # Lista de categorias padrão
    defaults = [
        {"name": "Alimentação", "icon": "utensils", "color": "#f87171"}, # Vermelho
        {"name": "Transporte", "icon": "car", "color": "#fbbf24"},      # Amarelo
        {"name": "Lazer", "icon": "gamepad-2", "color": "#a78bfa"},    # Roxo
        {"name": "Saúde", "icon": "activity", "color": "#34d399"},     # Verde
        {"name": "Contas", "icon": "home", "color": "#60a5fa"},        # Azul
        {"name": "Salário", "icon": "banknote", "color": "#34d399"},   # Verde Income
        {"name": "Outros", "icon": "circle", "color": "#94a3b8"},      # Cinza
    ]
    
    created = []
    for cat in defaults:
        # Verifica se já existe para não duplicar
        exists = db.query(models.Category).filter(models.Category.name == cat["name"]).first()
        if not exists:
            new_cat = models.Category(**cat)
            db.add(new_cat)
            created.append(cat["name"])
    
    db.commit()
    return {"message": "Categorias criadas!", "created": created}

# ROTA DE EMERGÊNCIA (Use com cuidado!)
@app.get("/reset_db")
def reset_database():
    # 1. Apaga TODAS as tabelas (limpeza total)
    models.Base.metadata.drop_all(bind=database.engine)
    # 2. Cria tudo de novo (com a estrutura correta)
    models.Base.metadata.create_all(bind=database.engine)
    return {"message": "Banco de dados resetado com sucesso! Agora está limpo."}

# 2. Listar todas as categorias (Para o Dropdown do Frontend)
@app.get("/categories", response_model=List[CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    return db.query(models.Category).all()

# 3. Listar Transações (Agora traz a categoria junto)
@app.get("/transactions/{user_id}", response_model=List[TransactionResponse])
def read_transactions(user_id: int, db: Session = Depends(get_db)):
    # 'joinedload' faz a mágica de trazer os dados da categoria junto na consulta
    return db.query(models.Transaction).filter(models.Transaction.user_id == user_id).options(joinedload(models.Transaction.category)).all()

# 4. Criar Transação (Com Categoria)
@app.post("/transactions/")
def create_transaction(transaction: TransactionCreate, db: Session = Depends(get_db)):
    db_transaction = models.Transaction(
        description=transaction.description,
        amount=transaction.amount,
        type=transaction.type,
        user_id=transaction.user_id,
        category_id=transaction.category_id, # Salva o ID da categoria
        date=datetime.now()
    )
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

# 5. Deletar Transação
@app.delete("/transactions/{transaction_id}")
def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):
    transaction = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    if transaction:
        db.delete(transaction)
        db.commit()
        return {"message": "Transação deletada!"}
    return {"error": "Transação não encontrada"}