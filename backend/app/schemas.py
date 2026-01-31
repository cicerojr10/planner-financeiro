from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# --- TOKEN ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# --- CATEGORIAS ---
class CategoryBase(BaseModel):
    name: str
    icon: str
    color: str

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: int
    owner_id: int

    class Config:
        orm_mode = True

# --- USUÁRIOS ---
class UserBase(BaseModel):
    email: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    
    class Config:
        orm_mode = True

# --- TRANSAÇÕES ---
class TransactionBase(BaseModel):
    description: str
    amount: float
    type: str
    category_id: int
    is_fixed: bool = False # 👈 O SEGREDO ESTÁ AQUI!

class TransactionCreate(TransactionBase):
    # Data é opcional (se não vier, o banco usa a data atual)
    date: Optional[datetime] = None 

class TransactionResponse(TransactionBase):
    id: int
    date: datetime
    owner_id: int
    category: Optional[CategoryResponse] = None

    class Config:
        orm_mode = True