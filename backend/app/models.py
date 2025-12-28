from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)

    # Relacionamentos (Um usuário tem várias transações e categorias)
    transactions = relationship("Transaction", back_populates="owner")
    categories = relationship("Category", back_populates="owner")

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    color = Column(String, default="#000000")
    icon = Column(String, nullable=True)
    
    # Chave estrangeira ligando ao usuário
    user_id = Column(Integer, ForeignKey("users.id"))
    
    owner = relationship("User", back_populates="categories")
    transactions = relationship("Transaction", back_populates="category")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    description = Column(String, index=True)
    amount = Column(Float)  # Valor da transação
    type = Column(String)   # "income" (receita) ou "expense" (despesa)
    date = Column(DateTime, default=datetime.utcnow)
    
    # Chaves estrangeiras
    user_id = Column(Integer, ForeignKey("users.id"))
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)

    owner = relationship("User", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")