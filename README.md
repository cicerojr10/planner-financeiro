Planner Financeiro

API backend para gerenciamento financeiro pessoal, desenvolvida com FastAPI e PostgreSQL, com autenticação baseada em JWT e estrutura preparada para expansão futura.

🚀 Tecnologias

Python 3.10+

FastAPI

SQLAlchemy

PostgreSQL

Docker & Docker Compose

JWT (python-jose)

Passlib (bcrypt)

📌 Funcionalidades

Cadastro e autenticação de usuários

Criação, leitura, atualização e exclusão de registros financeiros

Estrutura preparada para geração de relatórios

Banco de dados containerizado via Docker

🛠 Como executar localmente

Clone o repositório:

git clone https://github.com/cicerojr10/planner-financeiro.git
cd planner-financeiro

Suba o banco de dados:

docker-compose up -d

Execute a aplicação:

uvicorn main:app --reload

Acesse:

http://localhost:8000/docs
📌 Status do Projeto

Projeto em desenvolvimento contínuo com foco em evolução de arquitetura e funcionalidades.
