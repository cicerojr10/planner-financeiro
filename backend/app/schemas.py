from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# --- USUÁRIOS ---
# O que o usuário manda para criar conta
class UserCreate(BaseModel):
    email: str
    password: str

# O que devolvemos para o mundo (NUNCA devolvemos a senha)
class UserResponse(BaseModel):
    id: int
    email: str
    class Config:
        orm_mode = True

# --- TOKEN (O Crachá) ---
class Token(BaseModel):
    access_token: str
    token_type: str

# --- CATEGORIAS ---
class CategoryCreate(BaseModel):
    name: str
    icon: str
    color: str

class CategoryResponse(BaseModel):
    id: int
    name: str
    icon: str
    color: str
    class Config:
        orm_mode = True

# --- TRANSAÇÕES ---
class TransactionCreate(BaseModel):
    description: str
    amount: float
    type: str
    category_id: Optional[int] = None 
    # user_id não é mais necessário aqui, vamos pegar automático do token depois

class TransactionResponse(BaseModel):
    id: int
    description: str
    amount: float
    type: str
    date: datetime
    category: Optional[CategoryResponse] = None
    class Config:
        orm_mode = True

class TransactionBase(BaseModel):
    description: str
    amount: float
    type: str
    category_id: int
    is_fixed: bool = False  # 👈 ADICIONE AQUI (com valor padrão False)