from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from .database import Base

# --- TABELA DE USUÁRIOS (NOVA) ---
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True) # Email não pode repetir
    hashed_password = Column(String) # Senha criptografada (nunca salvamos a senha real)

    # Relacionamento: Um usuário tem várias transações
    transactions = relationship("Transaction", back_populates="owner")

# --- TABELA DE CATEGORIAS ---
class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    icon = Column(String)
    color = Column(String)
    
    # Relacionamento: Uma categoria tem várias transações
    transactions = relationship("Transaction", back_populates="category")

# --- TABELA DE TRANSAÇÕES ---
class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    description = Column(String, index=True)
    amount = Column(Float)
    type = Column(String) # 'income' ou 'expense'
    date = Column(DateTime)

    # Conexão com Usuário (Mudou aqui!)
    user_id = Column(Integer, ForeignKey("users.id")) 
    owner = relationship("User", back_populates="transactions")

    # Conexão com Categoria
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    category = relationship("Category", back_populates="transactions")