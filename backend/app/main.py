from fastapi import FastAPI, Depends, Form
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

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "O Pai ta on e roteando! 🚀"}

@app.post("/whatsapp")
async def whatsapp_webhook(Body: str = Form(...), From: str = Form(...), db: Session = Depends(get_db)):
    print(f"📩 Mensagem recebida de {From}: {Body}")
    resp = MessagingResponse()

    try:
        # 1. Pega categorias do banco
        categories = db.query(models.Category).all()
        cat_list = ", ".join([c.name for c in categories]) 

        # 2. O Prompt
        prompt = f"""
        Analise o gasto: "{Body}".
        Categorias disponíveis: [{cat_list}].
        
        Responda APENAS JSON puro neste formato:
        {{
            "description": "descrição",
            "amount": 0.00,
            "type": "expense",
            "category_name": "Nome da Categoria"
        }}
        """

        # 3. Chama o Gemini (Tenta o Flash, se falhar tenta o Pro)
        try:
            model = genai.GenerativeModel('gemini-1.5-flash')
            response = model.generate_content(prompt)
        except Exception as e:
            print(f"⚠️ Flash falhou ({e}), tentando Gemini Pro...")
            model = genai.GenerativeModel('gemini-pro')
            response = model.generate_content(prompt)
        
        # 4. Limpa e processa
        clean_text = response.text.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean_text)

        # 5. Salva
        category = db.query(models.Category).filter(models.Category.name == data['category_name']).first()
        # Se não achar a categoria, pega a primeira da lista como fallback
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
        resp.message(f"Erro: {e}")

    return str(resp)
