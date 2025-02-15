#!/bin/bash

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Configurando projeto frontend...${NC}"

# Navega para o diretório frontend
cd frontend

# Instala dependências
echo -e "${GREEN}Instalando dependências...${NC}"
npm install

# Instala dependências de desenvolvimento
echo -e "${GREEN}Instalando dependências de desenvolvimento...${NC}"
npm install --save-dev @types/node @types/react @types/react-dom typescript @types/uuid

# Configura Tailwind CSS
echo -e "${GREEN}Configurando Tailwind CSS...${NC}"
npx tailwindcss init -p

# Cria arquivo de ambiente local
echo -e "${GREEN}Criando arquivo .env.local...${NC}"
cp .env.local.example .env.local

echo -e "${BLUE}Configuração concluída!${NC}"
echo -e "${GREEN}Para iniciar o desenvolvimento:${NC}"
echo "1. Configure suas variáveis de ambiente em .env.local"
echo "2. Execute 'npm run dev'" 