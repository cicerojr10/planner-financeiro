import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# 1. Tenta pegar a URL do Render. Se não achar, usa SQLite local.
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./financeiro.db")

# 2. CORREÇÃO CRÍTICA PARA O RENDER
# O Render manda "postgres://", mas o Python precisa de "postgresql://"
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# 3. Cria o Engine (Com configurações diferentes para Nuvem vs Local)
if "sqlite" in SQLALCHEMY_DATABASE_URL:
    # Configuração simples para rodar no seu PC
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
    print("🔋 Rodando Local (SQLite)")
else:
    # Configuração robusta para o Neon (Mantive suas configurações de pool!)
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_pre_ping=True,  # Testa conexão antes de usar (Ótimo!)
        pool_recycle=300     # Recicla conexões a cada 5 min (Ótimo para Neon)
    )
    print("☁️ Rodando na Nuvem (PostgreSQL)")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()