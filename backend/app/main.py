from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from datetime import datetime
import sqlite3
from . import schemas
from . import auth
from fastapi.middleware.cors import CORSMiddleware 
from . import models, schemas, auth, database

DB_NAME = "financeiro.db"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CONEXÃO ---
def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

# --- CRIAÇÃO DAS TABELAS ---
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

    # 3. Tabela de Usuários (NOVA PARA LOGIN)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE,
            hashed_password TEXT
        )
    ''')

    # Popula categorias padrão se estiver vazio
    cursor.execute('SELECT count(*) FROM categories')
    if cursor.fetchone()[0] == 0:
        default_cats = [
            ('Alimentação', 'fast-food', 'expense'),
            ('Transporte', 'car-sport', 'expense'),
            ('Casa', 'home', 'expense'),
            ('Lazer', 'film', 'expense'),
            ('Saúde', 'medkit', 'expense'),
            ('Mercado', 'cart', 'expense'),
            ('Educação', 'school', 'expense'),
            ('Salário', 'cash-outline', 'income'),
            ('Pix', 'swap-horizontal', 'income'),
            ('Investimento', 'trending-up', 'income'),
            ('Outros', 'wallet-outline', 'income')
        ]
        cursor.executemany('INSERT INTO categories (name, icon, type) VALUES (?, ?, ?)', default_cats)
        conn.commit()
        print("--- Categorias Padrão Criadas ---")

    conn.commit()
    conn.close()

@app.on_event("startup")
def startup():
    create_tables()

# ==========================================
# ROTA 1: CADASTRO DE USUÁRIO (SIGNUP)
# ==========================================
@app.post("/signup", response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Verifica se email já existe
    cursor.execute("SELECT * FROM users WHERE email = ?", (user.email,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    # Cria o Hash da senha e salva
    hashed_password = auth.get_password_hash(user.password)
    cursor.execute("INSERT INTO users (email, hashed_password) VALUES (?, ?)", (user.email, hashed_password))
    user_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {"id": user_id, "email": user.email}

# ==========================================
# ROTA 2: LOGIN (GERAR TOKEN)
# ==========================================
@app.post("/token", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Busca usuário
    cursor.execute("SELECT * FROM users WHERE email = ?", (form_data.username,))
    user_row = cursor.fetchone()
    conn.close()
    
    # Verifica senha
    if not user_row or not auth.verify_password(form_data.password, user_row['hashed_password']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Gera Token
    access_token = auth.create_access_token(data={"sub": user_row['email']})
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "id": user_row['id'],
        "email": user_row['email']
    }

# ==========================================
# ROTAS ANTIGAS (TRANSAÇÕES E CATEGORIAS)
# ==========================================

@app.get("/categories")
def get_categories():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM categories')
    items = cursor.fetchall()
    conn.close()
    return items

@app.get("/users/{user_id}/transactions/")
def read_transactions(user_id: int, month: Optional[str] = None, year: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = '''
        SELECT t.*, c.name as category_name, c.icon as category_icon 
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = ?
    '''
    params = [user_id]
    
    if month and year:
        query += ' AND strftime("%m", t.date) = ? AND strftime("%Y", t.date) = ?'
        params.append(month)
        params.append(year)
    
    query += ' ORDER BY t.date DESC'

    cursor.execute(query, params)
    items = cursor.fetchall()
    conn.close()
    return items

@app.post("/users/{user_id}/transactions/", response_model=schemas.Transaction)
def create_transaction(user_id: int, transaction: schemas.TransactionCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    
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
    
    return {
        **transaction.dict(), 
        "id": transaction_id, 
        "date": final_date, 
        "user_id": user_id 
    }

@app.delete("/users/{user_id}/transactions/{transaction_id}")
def delete_transaction(user_id: int, transaction_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM transactions WHERE id = ?', (transaction_id,))
    conn.commit()
    conn.close()
    return {"message": "Transação deletada"}

# Atualizado para usar schemas.TransactionBase em vez da classe local antiga
@app.put("/users/{user_id}/transactions/{transaction_id}")
def update_transaction(user_id: int, transaction_id: int, transaction: schemas.TransactionBase):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE transactions 
        SET description = ?, amount = ?, type = ?, category_id = ?
        WHERE id = ?
    ''', (transaction.description, transaction.amount, transaction.type, transaction.category_id, transaction_id))
    
    conn.commit()
    conn.close()
    return {"message": "Transação atualizada com sucesso"}

@app.get("/users/{user_id}/stats")
def get_stats(user_id: int, month: int, year: int):
    conn = get_db_connection()
    cursor = conn.cursor()

    if month == 1:
        prev_month = 12
        prev_year = year - 1
    else:
        prev_month = month - 1
        prev_year = year

    def get_expense_sum(m, y):
        cursor.execute('''
            SELECT SUM(amount) FROM transactions 
            WHERE user_id = ? AND type = 'expense' 
            AND strftime('%m', date) = ? AND strftime('%Y', date) = ?
        ''', (user_id, f"{m:02d}", str(y)))
        result = cursor.fetchone()[0]
        return result if result else 0.0

    current_expense = get_expense_sum(month, year)
    previous_expense = get_expense_sum(prev_month, prev_year)

    conn.close()

    diff = current_expense - previous_expense
    
    if diff > 0.01:
        message = f"R$ {diff:.2f} a mais que mês passado ⚠️"
        status = "warning"
    elif diff < -0.01:
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