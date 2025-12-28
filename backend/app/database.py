from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Define o arquivo do banco de dados SQLite local
SQLALCHEMY_DATABASE_URL = "sqlite:///./planner.db"

# Cria a conexão (check_same_thread=False é necessário apenas para SQLite)
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# Cria a sessão para conversar com o banco
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para nossos Models herdarem
Base = declarative_base()

# Função auxiliar para pegar o banco de dados nas rotas
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()