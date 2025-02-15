#!/bin/bash

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Inicializando projeto Jung AI Chat...${NC}"

# Criar diretórios do projeto
echo -e "${GREEN}Criando estrutura de diretórios...${NC}"
mkdir -p frontend/app/{api/{chat,transcribe},components,lib/{hooks,utils},types}

# Copiar arquivos de exemplo
echo -e "${GREEN}Copiando arquivos de configuração...${NC}"
cp frontend/.env.local.example frontend/.env.local

# Instalar dependências
echo -e "${GREEN}Instalando dependências do frontend...${NC}"
cd frontend
npm install

# Iniciar containers Docker
echo -e "${GREEN}Iniciando containers Docker...${NC}"
cd ..
docker-compose up -d

echo -e "${BLUE}Projeto inicializado com sucesso!${NC}"
echo -e "${GREEN}Para começar o desenvolvimento:${NC}"
echo "1. Configure suas variáveis de ambiente em frontend/.env.local"
echo "2. Execute 'npm run dev' no diretório frontend"
echo "3. Acesse http://localhost:3000" 