from fastapi import FastAPI, Depends, HTTPException, status, Form, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from datetime import datetime
from twilio.twiml.messaging_response import MessagingResponse

# Importa suas configurações (certifique-se que database.py e models.py existem na pasta app)
from . import models, schemas, auth, database

# Cria as tabelas no Banco Neon (Postgres) se não existirem
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI()

# --- CONFIGURAÇÃO DO CORS (PARA O SITE FUNCIONAR) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Libera geral (Site, Mobile, Localhost)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DEPENDÊNCIA DE CONEXÃO ---
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ==========================================
# ROTA 1: CADASTRO DE USUÁRIO (SIGNUP)
# ==========================================
@app.post("/signup", response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # Verifica se email já existe
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    # Cria usuário
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(email=user.email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user

# ==========================================
# ROTA 2: LOGIN
# ==========================================
@app.post("/token", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = auth.create_access_token(data={"sub": user.email})
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "id": user.id,
        "email": user.email
    }

# ==========================================
# ROTAS DE DADOS (TRANSAÇÕES)
# ==========================================

@app.get("/categories")
def get_categories(db: Session = Depends(get_db)):
    # Se estiver vazio, cria as categorias padrão (Hack para inicializar)
    if db.query(models.Category).count() == 0:
        default_cats = [
            models.Category(name='Alimentação', icon='fast-food', type='expense'),
            models.Category(name='Transporte', icon='car-sport', type='expense'),
            models.Category(name='Casa', icon='home', type='expense'),
            models.Category(name='Lazer', icon='film', type='expense'),
            models.Category(name='Saúde', icon='medkit', type='expense'),
            models.Category(name='Mercado', icon='cart', type='expense'),
            models.Category(name='Educação', icon='school', type='expense'),
            models.Category(name='Salário', icon='cash-outline', type='income'),
            models.Category(name='Investimento', icon='trending-up', type='income')
        ]
        db.add_all(default_cats)
        db.commit()

    return db.query(models.Category).all()

@app.get("/users/{user_id}/transactions/")
def read_transactions(
    user_id: int, 
    month: Optional[str] = None, 
    year: Optional[str] = None, 
    db: Session = Depends(get_db)
):
    query = db.query(models.Transaction).filter(models.Transaction.user_id == user_id)
    
    if month and year:
        # Nota: Filtro de data simplificado para string 'YYYY-MM-DD'
        query = query.filter(func.substring(models.Transaction.date, 6, 2) == month)
        query = query.filter(func.substring(models.Transaction.date, 1, 4) == year)
    
    return query.order_by(models.Transaction.date.desc()).all()

@app.post("/users/{user_id}/transactions/", response_model=schemas.Transaction)
def create_transaction(
    user_id: int, 
    transaction: schemas.TransactionCreate, 
    db: Session = Depends(get_db)
):
    # Garante a data
    final_date = transaction.date if transaction.date else datetime.now().isoformat()
    
    new_transaction = models.Transaction(
        user_id=user_id,
        description=transaction.description,
        amount=transaction.amount,
        type=transaction.type,
        category_id=transaction.category_id,
        date=final_date
    )
    db.add(new_transaction)
    db.commit()
    db.refresh(new_transaction)
    return new_transaction

@app.delete("/users/{user_id}/transactions/{transaction_id}")
def delete_transaction(user_id: int, transaction_id: int, db: Session = Depends(get_db)):
    item = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    if item:
        db.delete(item)
        db.commit()
    return {"message": "Transação deletada"}

@app.get("/users/{user_id}/stats")
def get_stats(user_id: int, month: int, year: int, db: Session = Depends(get_db)):
    # Lógica simplificada de estatísticas para Postgres
    # (Para ser breve, vamos retornar zeros por enquanto se não houver dados complexos, 
    # mas a lógica completa iria aqui)
    return {
        "current": 0, "previous": 0, "diff": 0,
        "message": "Dados em manutenção", "status": "neutral"
    }

# ==========================================
# ROTA 3: WEBHOOK DO WHATSAPP
# ==========================================
@app.post("/whatsapp")
async def whatsapp_webhook(Body: str = Form(...), From: str = Form(...)):
    # 1. Imprime no Log do Render o que chegou (para debug)
    print(f"📩 Mensagem recebida de {From}: {Body}")

    # 2. Prepara a resposta para o WhatsApp (TwiML)
    resp = MessagingResponse()
    
    # Por enquanto, vamos fazer um "Papagaio" (Echo) só para testar
    msg = resp.message(f"🤖 O Python ouviu: {Body}")

    # 3. Retorna o XML que o Twilio exige
    return Response(content=str(resp), media_type="application/xml")