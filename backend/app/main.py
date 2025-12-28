import sqlite3
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from . import schemas  # <--- IMPORTANTE: Importando os esquemas

DB_NAME = "financeiro.db"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MODELO DE DADOS LOCAL (Para Updates) ---
# Mantemos este modelo simples para a rota de atualização
class Transaction(BaseModel):
    description: str
    amount: float
    type: str
    category_id: Optional[int] = None

# --- CONEXÃO ---
def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

# --- CRIAÇÃO DAS TABELAS E DADOS PADRÃO ---
def create_tables():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Tabela de Transações
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            description TEXT,
            amount REAL,
            type TEXT,
            category_id INTEGER,
            date TEXT
        )
    ''')

    # 2. Tabela de Categorias
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            icon TEXT,
            type TEXT
        )
    ''')

    # 3. Popula categorias padrão se estiver vazio
    cursor.execute('SELECT count(*) FROM categories')
    if cursor.fetchone()[0] == 0:
        default_cats = [
            # Despesas
            ('Alimentação', 'fast-food', 'expense'),
            ('Transporte', 'car-sport', 'expense'),
            ('Casa', 'home', 'expense'),
            ('Lazer', 'film', 'expense'),
            ('Saúde', 'medkit', 'expense'),
            ('Mercado', 'cart', 'expense'),
            ('Educação', 'school', 'expense'),
            # Receitas
            ('Salário', 'cash-outline', 'income'),
            ('Pix', 'swap-horizontal', 'income'),
            ('Investimento', 'trending-up', 'income'),
            ('Outros', 'wallet-outline', 'income')
        ]
        cursor.executemany('INSERT INTO categories (name, icon, type) VALUES (?, ?, ?)', default_cats)
        conn.commit()
        print("--- Categorias Padrão Criadas com Sucesso ---")

    conn.commit()
    conn.close()

@app.on_event("startup")
def startup():
    create_tables()

# --- ROTAS ---

# Listar Categorias
@app.get("/categories")
def get_categories():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM categories')
    items = cursor.fetchall()
    conn.close()
    return items

# --- LISTAR TRANSAÇÕES (COM FILTRO DE MÊS/ANO) ---
@app.get("/users/{user_id}/transactions/")
def read_transactions(user_id: int, month: Optional[str] = None, year: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Começamos a query básica
    query = '''
        SELECT t.*, c.name as category_name, c.icon as category_icon 
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = ?
    '''
    params = [user_id]
    
    # Se o celular mandou mês e ano, adicionamos o filtro
    if month and year:
        # SQLite: strftime('%m', date) pega o mês '01', '02'...
        query += ' AND strftime("%m", t.date) = ? AND strftime("%Y", t.date) = ?'
        params.append(month)
        params.append(year)
    
    # Ordena por data (mais recente primeiro)
    query += ' ORDER BY t.date DESC'

    cursor.execute(query, params)
    items = cursor.fetchall()
    conn.close()
    return items

# --- CRIAR TRANSAÇÃO (CORRIGIDO DATA) ---
# Usa schemas.TransactionCreate para aceitar a data opcional
@app.post("/users/{user_id}/transactions/", response_model=schemas.Transaction)
def create_transaction(user_id: int, transaction: schemas.TransactionCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # LÓGICA DE DATA: Se veio data no JSON, usa ela. Se não, usa Agora.
    if transaction.date:
        final_date = transaction.date
    else:
        final_date = datetime.now()
    
    cursor.execute('''
        INSERT INTO transactions (user_id, description, amount, type, category_id, date)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (user_id, transaction.description, transaction.amount, transaction.type, transaction.category_id, final_date))
    
    transaction_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    # --- A CORREÇÃO ESTÁ AQUI EMBAIXO 👇 ---
    # Adicionamos "user_id": user_id no retorno
    return {
        **transaction.dict(), 
        "id": transaction_id, 
        "date": final_date, 
        "user_id": user_id 
    }

# Deletar Transação
@app.delete("/users/{user_id}/transactions/{transaction_id}")
def delete_transaction(user_id: int, transaction_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM transactions WHERE id = ?', (transaction_id,))
    if cursor.fetchone() is None:
        conn.close()
        raise HTTPException(status_code=404, detail="Transação não encontrada")
        
    cursor.execute('DELETE FROM transactions WHERE id = ?', (transaction_id,))
    conn.commit()
    conn.close()
    
    return {"message": "Transação deletada"}

# --- ATUALIZAR TRANSAÇÃO (PUT) ---
@app.put("/users/{user_id}/transactions/{transaction_id}")
def update_transaction(user_id: int, transaction_id: int, transaction: Transaction):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Verifica se a transação existe
    cursor.execute('SELECT * FROM transactions WHERE id = ?', (transaction_id,))
    if cursor.fetchone() is None:
        conn.close()
        raise HTTPException(status_code=404, detail="Transação não encontrada")
        
    # 2. Atualiza os dados (SQL UPDATE)
    cursor.execute('''
        UPDATE transactions 
        SET description = ?, amount = ?, type = ?, category_id = ?
        WHERE id = ?
    ''', (transaction.description, transaction.amount, transaction.type, transaction.category_id, transaction_id))
    
    conn.commit()
    conn.close()
    
    return {"message": "Transação atualizada com sucesso"}

# --- ESTATÍSTICAS E COMPARAÇÃO ---
@app.get("/users/{user_id}/stats")
def get_stats(user_id: int, month: int, year: int):
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Calcular qual é o mês passado
    if month == 1:
        prev_month = 12
        prev_year = year - 1
    else:
        prev_month = month - 1
        prev_year = year

    # Função auxiliar para somar despesas de um mês específico
    def get_expense_sum(m, y):
        cursor.execute('''
            SELECT SUM(amount) FROM transactions 
            WHERE user_id = ? AND type = 'expense' 
            AND strftime('%m', date) = ? AND strftime('%Y', date) = ?
        ''', (user_id, f"{m:02d}", str(y)))
        result = cursor.fetchone()[0]
        return result if result else 0.0

    # 2. Busca os totais
    current_expense = get_expense_sum(month, year)
    previous_expense = get_expense_sum(prev_month, prev_year)

    conn.close()

    # 3. Analisa o resultado
    diff = current_expense - previous_expense
    
    if diff > 0.01: # Gastou mais (margem de erro de centavos)
        message = f"R$ {diff:.2f} a mais que mês passado ⚠️"
        status = "warning"
    elif diff < -0.01: # Gastou menos
        message = f"Economia de R$ {abs(diff):.2f} 🎉"
        status = "good"
    else:
        message = "Mesmo gasto do mês passado 😐"
        status = "neutral"

    return {
        "current": current_expense,
        "previous": previous_expense,
        "diff": diff,
        "message": message,
        "status": status
    }