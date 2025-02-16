#!/bin/bash

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Configurando sistema de conhecimento...${NC}"

# Verifica se está no diretório correto
if [ ! -f "package.json" ]; then
    echo -e "${RED}Erro: Execute este script do diretório frontend${NC}"
    exit 1
fi

# Instala dependências
echo -e "${GREEN}Instalando dependências...${NC}"
npm install @pinecone-database/pinecone@1.1.2 \
           langchain@0.0.212 \
           zod@3.22.4

# Verifica se a instalação foi bem sucedida
if [ $? -ne 0 ]; then
    echo -e "${RED}Erro na instalação das dependências${NC}"
    exit 1
fi

# Cria diretórios necessários
echo -e "${GREEN}Criando estrutura de diretórios...${NC}"
mkdir -p app/lib/knowledge_system

# Verifica variáveis de ambiente
echo -e "${GREEN}Verificando variáveis de ambiente...${NC}"
if [ ! -f .env.local ]; then
    echo -e "${BLUE}Criando arquivo .env.local...${NC}"
    cat > .env.local << EOL
# Pinecone
PINECONE_API_KEY=sua_chave_aqui
PINECONE_ENVIRONMENT=seu_ambiente_aqui

# Já existentes
# OpenAI
# OPENAI_API_KEY=sua_chave_aqui

# Supabase
# NEXT_PUBLIC_SUPABASE_URL=sua_url_aqui
# NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_aqui
EOL
fi

echo -e "${GREEN}Verificando tipos TypeScript...${NC}"
# Verifica se o arquivo types.d.ts existe
if [ ! -f app/lib/knowledge_system/types.d.ts ]; then
    echo -e "${RED}Erro: types.d.ts não encontrado${NC}"
    echo -e "${BLUE}Por favor, certifique-se de que o arquivo types.d.ts está presente em app/lib/knowledge_system/${NC}"
    exit 1
fi

echo -e "${BLUE}Configuração concluída!${NC}"
echo -e "${GREEN}Próximos passos:${NC}"
echo "1. Configure suas variáveis de ambiente em .env.local"
echo "2. Inicialize o Pinecone com seus dados"
echo "3. Execute 'npm run dev' para testar" 