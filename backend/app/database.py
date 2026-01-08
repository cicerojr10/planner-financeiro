import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 1. Tenta pegar a URL do Banco nas Variáveis de Ambiente (Render)
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# 2. SE não tiver URL (estamos no PC local), usa o arquivo SQLite
if not SQLALCHEMY_DATABASE_URL:
    SQLALCHEMY_DATABASE_URL = "sqlite:///./financeiro.db"

# 3. FIX: O Render às vezes manda "postgres://" mas o Python quer "postgresql://"
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# 4. Configura o motor do banco (Engine)
if "sqlite" in SQLALCHEMY_DATABASE_URL:
    # Configuração específica para SQLite (Local)
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    # Configuração para Postgres (Nuvem/Neon)
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()