from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

# --- Schemas de Transação ---
class TransactionBase(BaseModel):
    description: str
    amount: float
    type: str
    category_id: Optional[int] = None

# Input: Usado para CRIAR (Com a correção da data opcional)
class TransactionCreate(TransactionBase):
    date: Optional[datetime] = None

# Output: Usado para LER (Renomeado para 'Transaction' para bater com o main.py)
class Transaction(TransactionBase):
    id: int
    date: datetime
    user_id: int
    
    # Adicionamos estes dois para o Frontend mostrar ícones e nomes!
    category_name: Optional[str] = None
    category_icon: Optional[str] = None
    
    class Config:
        from_attributes = True

# --- Schemas de Usuário (Mantidos caso precise no futuro) ---
class UserBase(BaseModel):
    email: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    transactions: List[Transaction] = [] # Atualizado para usar a classe certa

    class Config:
        from_attributes = True