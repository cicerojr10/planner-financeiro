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
    print(f"📩 Mensagem de {From}: {Body}")
    resp = MessagingResponse()

    # --- BLOCO DETETIVE: LISTA O CARDÁPIO DO GOOGLE ---
    print("🕵️‍♂️ INVESTIGANDO MODELOS DISPONÍVEIS NA SUA CONTA:")
    try:
        available_models = []
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(f"   ✅ {m.name}")
                available_models.append(m.name)
        if not available_models:
            print("   ⚠️ NENHUM modelo encontrado! Verifique se a API Key tem permissão.")
    except Exception as e:
        print(f"   ❌ Erro ao listar modelos: {e}")
    # --------------------------------------------------

    try:
        # Tenta pegar o primeiro modelo da lista que seja 'Gemini' para não errar o nome
        chosen_model = 'gemini-1.5-flash' # Preferido
        
        # Procura um nome válido na lista que o Google devolveu
        for m in available_models:
            if 'gemini-1.5-flash' in m:
                chosen_model = m
                break
            elif 'gemini-pro' in m:
                chosen_model = m
        
        print(f"🤖 Tentando usar o modelo: {chosen_model}")

        categories = db.query(models.Category).all()
        cat_list = ", ".join([c.name for c in categories]) 

        prompt = f"""
        Analise o gasto: "{Body}". Categorias: [{cat_list}].
        JSON puro: {{"description": "...", "amount": 0.00, "type": "expense", "category_name": "..."}}
        """

        model = genai.GenerativeModel(chosen_model)
        response = model.generate_content(prompt)
        
        clean_text = response.text.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean_text)

        category = db.query(models.Category).filter(models.Category.name == data['category_name']).first()
        category_id = category.id if category else (categories[0].id if categories else None)

        new_transaction = models.Transaction(
            user_id=1, description=data['description'], amount=data['amount'],
            type=data['type'], category_id=category_id, date=datetime.now()
        )
        db.add(new_transaction)
        db.commit()

        msg = f"✅ *Salvo com {chosen_model.split('/')[-1]}!*\n📝 {data['description']}\n💰 R$ {data['amount']:.2f}\n📂 {data['category_name']}"
        resp.message(msg)

    except Exception as e:
        print(f"❌ Erro na IA: {e}")
        resp.message("Desculpe, deu erro na conexão com o cérebro da IA.")

    return str(resp)
