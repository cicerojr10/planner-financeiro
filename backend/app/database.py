import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# O .replace é uma correção técnica: o Render entrega "postgres://", mas o Python exige "postgresql://"
database_url = os.getenv("DATABASE_URL", "sqlite:///./financeiro.db")
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

SQLALCHEMY_DATABASE_URL = database_url

# Verifica qual banco está sendo usado para configurar os argumentos certos
if "sqlite" in SQLALCHEMY_DATABASE_URL:
    # Configuração para SQLite (PC)
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
    print("🔋 Rodando com Banco LOCAL (SQLite)")
else:
    # Configuração para PostgreSQL (Nuvem)
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    print("☁️ Rodando com Banco NUVEM (PostgreSQL)")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()