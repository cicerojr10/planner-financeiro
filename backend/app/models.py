from sqlalchemy import Column, ForeignKey, Integer, String, Float, DateTime
from sqlalchemy.orm import relationship
from .database import Base

# 1. Nova Tabela: Categorias
class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True) # Ex: Alimentação
    icon = Column(String)  # Ex: "utensils" (nome do ícone)
    color = Column(String) # Ex: "#ef4444" (cor vermelha)

    # Relacionamento: Uma categoria tem várias transações
    transactions = relationship("Transaction", back_populates="category")

# 2. Tabela Atualizada: Transações
class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    description = Column(String, index=True)
    amount = Column(Float)
    type = Column(String) # 'income' ou 'expense'
    date = Column(DateTime)
    user_id = Column(Integer)

    # NOVO: Link com a Categoria
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    
    # Relacionamento: Uma transação pertence a uma categoria
    category = relationship("Category", back_populates="transactions")