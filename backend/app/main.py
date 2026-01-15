from fastapi import FastAPI, Depends, Form, Response
from fastapi.middleware.cors import CORSMiddleware  # <--- IMPORTANTE
from sqlalchemy.orm import Session
from twilio.twiml.messaging_response import MessagingResponse
from datetime import datetime
import google.generativeai as genai
import json
import os

from . import models, database

# Configuração do Banco
models.Base.metadata.create_all(bind=database.engine)

# Configuração da IA
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

app = FastAPI()

# --- CONFIGURAÇÃO DE SEGURANÇA (CORS) ---
# Isso libera o seu Frontend (localhost) para acessar o Backend
origins = [
    "http://localhost",
    "http://localhost:5173",  # Porta padrão do Vite
    "http://localhost:3000",  # Porta padrão do React (por garantia)
    "https://meu-financeiro-8985.onrender.com", # Seu próprio backend
    "*" # Em desenvolvimento, podemos liberar geral (depois restringimos)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Liberando geral para facilitar seu teste agora
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ----------------------------------------

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "API Online e com CORS liberado! 🚀"}

# Nova rota para o Frontend puxar as transações
@app.get("/transactions/{user_id}")
def read_transactions(user_id: int, db: Session = Depends(get_db)):
    transactions = db.query(models.Transaction).filter(models.Transaction.user_id == user_id).all()
    return transactions

@app.post("/whatsapp")
async def whatsapp_webhook(Body: str = Form(...), From: str = Form(...), db: Session = Depends(get_db)):
    print(f"📩 Mensagem recebida de {From}: {Body}")
    resp = MessagingResponse()

    try:
        categories = db.query(models.Category).all()
        cat_list = ", ".join([c.name for c in categories]) 

        prompt = f"""
        Analise o gasto: "{Body}".
        Categorias disponíveis: [{cat_list}].
        Responda APENAS JSON puro:
        {{
            "description": "descrição curta",
            "amount": 0.00,
            "type": "expense",
            "category_name": "Nome da Categoria"
        }}
        """

        model = genai.GenerativeModel('models/gemini-2.5-flash-lite')
        response = model.generate_content(prompt)
        
        clean_text = response.text.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean_text)

        category = db.query(models.Category).filter(models.Category.name == data['category_name']).first()
        category_id = category.id if category else (categories[0].id if categories else None)

        new_transaction = models.Transaction(
            user_id=1,
            description=data['description'],
            amount=data['amount'],
            type=data['type'],
            category_id=category_id,
            date=datetime.now()
        )
        db.add(new_transaction)
        db.commit()

        msg = f"✅ *Salvo!*\n📝 {data['description']}\n💰 R$ {data['amount']:.2f}\n📂 {data['category_name']}"
        resp.message(msg)

    except Exception as e:
        print(f"❌ Erro: {e}")
        resp.message("Ops! Não entendi. Tente: 'Gastei 10 na padaria'")

    return Response(content=str(resp), media_type="application/xml")

# Rota para DELETAR uma transação
@app.delete("/transactions/{transaction_id}")
def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):
    # 1. Procura a transação no banco
    transaction = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    
    # 2. Se achar, deleta
    if transaction:
        db.delete(transaction)
        db.commit()
        return {"message": "Transação deletada!"}
    
    # 3. Se não achar, avisa
    return {"error": "Transação não encontrada"}
