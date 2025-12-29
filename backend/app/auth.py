from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext

# --- CONFIGURAÇÕES DE SEGURANÇA ---
# Chave secreta para assinar os tokens (em produção, use uma string aleatória gigante)
SECRET_KEY = "sua_chave_super_secreta_e_aleatoria_aqui"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 3000 # Token dura bastante tempo (50 horas) para facilitar testes

# Configuração do Hashing de Senha
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- FUNÇÕES ÚTEIS ---

# 1. Verificar se a senha bate com o hash
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

# 2. Gerar o hash da senha (criptografar)
def get_password_hash(password):
    return pwd_context.hash(password)

# 3. Criar o Token de Acesso (O "Crachá")
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt