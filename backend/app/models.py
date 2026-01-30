from sqlalchemy import Boolean, Column, Integer, String, Float, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)

    # Relacionamentos
    transactions = relationship("Transaction", back_populates="owner")
    categories = relationship("Category", back_populates="owner")

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    icon = Column(String)
    color = Column(String)
    
    owner_id = Column(Integer, ForeignKey("users.id"))
    
    # Relacionamentos
    owner = relationship("User", back_populates="categories")
    transactions = relationship("Transaction", back_populates="category")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    description = Column(String, index=True)
    amount = Column(Float)
    type = Column(String) # 'income' ou 'expense'
    date = Column(DateTime(timezone=True), server_default=func.now())
    is_fixed = Column(Boolean, default=False) # Nossa coluna nova aqui!

    category_id = Column(Integer, ForeignKey("categories.id"))
    owner_id = Column(Integer, ForeignKey("users.id"))
    
    # Relacionamentos
    category = relationship("Category", back_populates="transactions")
    owner = relationship("User", back_populates="transactions")