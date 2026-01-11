from fastapi import FastAPI, Depends, Form, HTTPException
from sqlalchemy.orm import Session
from twilio.twiml.messaging_response import MessagingResponse
from datetime import datetime
import google.generativeai as genai
import json
import os

from . import models, database

# Configuração do Banco
models.Base.metadata.create_all(bind=database.engine)

# Configuração da IA (Gemini)
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

app = FastAPI()

# Dependência para pegar o banco de dados
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "O Pai ta on! 🚀"}

@app.post("/whatsapp")
async def whatsapp_webhook(Body: str = Form(...), From: str = Form(...), db: Session = Depends(get_db)):
    print(f"📩 Mensagem recebida de {From}: {Body}")
    resp = MessagingResponse()

    try:
        # 1. Busca as categorias do banco para ensinar a IA
        categories = db.query(models.Category).all()
        # Cria uma lista de texto: "Alimentação, Transporte, Lazer..."
        cat_list = ", ".join([c.name for c in categories]) 

        # 2. O Prompt (A instrução para o Gemini)
        prompt = f"""
        Você é um assistente financeiro pessoal.
        Analise a mensagem do usuário: "{Body}".
        
        Sua missão é extrair os dados para registrar uma transação.
        
        Regras:
        1. Identifique se é 'expense' (gasto/compra) ou 'income' (ganho/salário).
        2. O valor deve ser um número decimal positivo (ex: 50.00).
        3. A categoria deve ser escolhida DENTRO desta lista: [{cat_list}]. 
           - Se não se encaixar perfeitamente, escolha a mais próxima ou 'Outros'.
        
        Responda APENAS um JSON puro, sem formatação de código (markdown), neste formato:
        {{
            "description": "descrição curta do gasto",
            "amount": 0.00,
            "type": "expense",
            "category_name": "Nome Da Categoria"
        }}
        """

        # 3. Envia para o Gemini
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content(prompt)
        
        # Limpeza do texto (caso a IA mande ```json ... ```)
        clean_text = response.text.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean_text)

        # 4. Encontra o ID da categoria no banco
        category = db.query(models.Category).filter(models.Category.name == data['category_name']).first()
        
        # Se a IA inventou uma categoria que não existe, usa a primeira da lista como fallback
        category_id = category.id if category else categories[0].id

        # 5. Salva no Banco de Dados
        # (Usando user_id=1 fixo por enquanto, já que é seu uso pessoal)
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

        # 6. Responde para o WhatsApp
        msg = f"✅ *Salvo com Sucesso!*\n\n📝 {data['description']}\n💰 R$ {data['amount']:.2f}\n📂 {data['category_name']}"
        resp.message(msg)

    except Exception as e:
        print(f"❌ Erro: {e}")
        # Se der erro (ex: mensagem não financeira), responde amigável
        resp.message("Desculpe, não entendi. Tente algo como: 'Gastei 50 reais no mercado'")

    return str(resp)
