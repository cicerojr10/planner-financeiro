from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    
    # Um usuário tem várias transações
    transactions = relationship("Transaction", back_populates="owner")

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    icon = Column(String)
    type = Column(String) # 'income' ou 'expense' (Isso estava faltando!)

    # Categorias agora são globais (não têm user_id obrigatório)
    transactions = relationship("Transaction", back_populates="category")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    description = Column(String)
    amount = Column(Float)
    type = Column(String) # 'income' ou 'expense'
    category_id = Column(Integer, ForeignKey("categories.id"))
    date = Column(String) # Simplificado para String para evitar erro de fuso horário

    owner = relationship("User", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")