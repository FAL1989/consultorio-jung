# Diálogos Junguianos: Chatbot com Transcrição de Áudio e Backend em FastAPI

Este projeto é uma aplicação web que permite aos usuários conversar com um chatbot baseado em Carl Gustav Jung. Ele oferece suporte a entrada de texto e voz, utilizando a API Whisper da OpenAI para transcrição de áudio. A aplicação é construída com um frontend em Next.js (React) e um backend em FastAPI (Python), utilizando Pinecone como banco de dados vetorial para armazenamento e recuperação de informações relevantes.

## Funcionalidades

*   **🎙️ Entrada de Voz:** Gravação de áudio diretamente no navegador e upload de arquivos de áudio.
*   **🤖 Transcrição Automática:** Transcrição de áudio para texto usando a API Whisper da OpenAI.
*   **💬 Chat Interativo:** Interface de chat para interagir com um chatbot com personalidade de Carl Jung.
*   **🧠 Base de Conhecimento Junguiana:** Utiliza um modelo de linguagem (GPT-4) e um banco de dados vetorial (Pinecone) para fornecer respostas relevantes baseadas na teoria junguiana.
*   **🔒 Autenticação:** Login seguro de usuários via Supabase.
*   **🎨 Interface Moderna:** Design responsivo e agradável usando Tailwind CSS.
*   **🚀 Backend Escalável:** API REST construída com FastAPI, projetada para escalabilidade e manutenibilidade.
*   **☁️ Deploy:** Instruções para deploy no Google Cloud Platform (Cloud Run, Cloud Build, Secret Manager).

## Arquitetura

A aplicação é dividida em dois componentes principais:

*   **Frontend (Next.js):** Interface do usuário construída com React, utilizando componentes Tailwind CSS. Lida com a interação do usuário, gravação/upload de áudio, exibição do histórico do chat e comunicação com o backend.
*   **Backend (FastAPI):** API REST que gerencia a lógica de negócios, incluindo:
    *   Interação com a API da OpenAI (Whisper para transcrição e GPT-4 para geração de respostas).
    *   Comunicação com o Pinecone para armazenar e buscar embeddings (representações vetoriais) de conceitos junguianos.
    *   Processamento de texto e extração de metadados.
    *   Gerenciamento do histórico de conversas (usando Supabase, opcionalmente).
    *   Endpoints para transcrição de áudio, consulta à base de conhecimento e verificação de saúde.

## Pré-requisitos

*   **Node.js:** Versão 18 ou superior.
*   **npm (ou yarn/pnpm):** Gerenciador de pacotes para o frontend.
*   **Python:** Versão 3.9 ou superior.
*   **pip:** Gerenciador de pacotes para o backend.
*   **Conta na OpenAI:** Para obter uma chave da API (para Whisper e GPT-4).
*   **Conta no Pinecone:** Para criar um índice e obter uma chave da API.
*   **Conta no Supabase (opcional):** Para autenticação de usuários e armazenamento do histórico de conversas. Se você não quiser usar o Supabase, precisará adaptar a lógica de autenticação e armazenamento no frontend e backend.
*   **Google Cloud Platform (opcional):** Para deploy da aplicação (Cloud Run, Cloud Build, Secret Manager).

## Configuração

### 1. Clonar o Repositório

```bash
git clone <URL_DO_REPOSITORIO>
cd <NOME_DO_REPOSITORIO>
```

### 2. Configurar o Backend (FastAPI)

1.  **Navegar para o diretório do backend:**

    ```bash
    cd backend
    ```

2.  **Criar um ambiente virtual (recomendado):**

    ```bash
    python3 -m venv venv
    source venv/bin/activate  # No Windows: venv\Scripts\activate
    ```

3.  **Instalar as dependências:**

    ```bash
    pip install -r requirements.txt
    ```

4.  **Configurar as variáveis de ambiente:**

    Crie um arquivo `.env` na raiz do diretório `backend/`:

    ```
    PINECONE_API_KEY=<SUA_CHAVE_API_PINECONE>
    PINECONE_ENVIRONMENT=<SEU_AMBIENTE_PINECONE>
    PINECONE_INDEX_NAME=<NOME_DO_SEU_INDICE_PINECONE>
    OPENAI_API_KEY=<SUA_CHAVE_API_OPENAI>
    ENVIRONMENT=development  # Ou 'production'
    FRONTEND_URL=http://localhost:3000 # URL do frontend em desenvolvimento
    # Adicione outras variáveis, se necessário
    ```

    Substitua os valores `<...>` pelas suas credenciais.

### 3. Configurar o Frontend (Next.js)

1.  **Navegar para o diretório do frontend:**

    ```bash
    cd ../frontend
    ```

2.  **Instalar as dependências:**

    ```bash
    npm install
    ```

3.  **Configurar as variáveis de ambiente:**

    Crie um arquivo `.env.local` na raiz do diretório `frontend/`:

    ```
    NEXT_PUBLIC_SUPABASE_URL=<SUA_URL_SUPABASE>
    NEXT_PUBLIC_SUPABASE_ANON_KEY=<SUA_CHAVE_ANON_SUPABASE>
    # Remova as chaves da OpenAI e do Pinecone deste arquivo .env.local
    # O frontend *NÃO* deve ter acesso direto a essas chaves.
    ```
    Substitua os valores `<...>` pelas suas credenciais do Supabase.  **Importante:** *Não* coloque as chaves da OpenAI e do Pinecone no arquivo `.env.local` do frontend, pois isso seria um risco de segurança. O frontend deve se comunicar com o backend, que por sua vez, acessará as APIs da OpenAI e do Pinecone.

### 4. Executar a Aplicação

1.  **Iniciar o backend (em um terminal):**

    ```bash
    cd backend
    source venv/bin/activate  # Ou venv\Scripts\activate no Windows
    python main.py
    ```

    O backend estará disponível em `http://localhost:8000`.

2.  **Iniciar o frontend (em outro terminal):**

    ```bash
    cd frontend
    npm run dev
    ```

    O frontend estará disponível em `http://localhost:3000`.

## Estrutura do Projeto

```
.
├── backend/          # Código do backend (FastAPI)
│   ├── knowledge_system/   # Lógica do sistema de conhecimento
│   │   ├── __init__.py
│   │   ├── chunking.py     # Utilitário para processamento de texto
│   │   ├── knowledge_base.py # Lógica principal da base de conhecimento
│   │   ├── langchain_tools.py # Integração com Langchain
│   │   └── vector_store.py   # Interação com o Pinecone
│   ├── main.py             # Ponto de entrada da API FastAPI
│   ├── requirements.txt    # Dependências Python
│   ├── Dockerfile          # Dockerfile para produção
│   ├── Dockerfile.dev      # Dockerfile para desenvolvimento
│   ├── cloudbuild.yaml     # Configuração do Google Cloud Build
│   ├── .dockerignore       # Arquivos a serem ignorados no build do Docker
│   └── setup-secrets.sh    # Script para configurar secrets no GCP (opcional)
│
├── frontend/         # Código do frontend (Next.js)
│   ├── app/
│   │   ├── api/            # Next.js API Routes
│   │   │   ├── chat/       # Endpoint para o chat
│   │   │   │   └── route.ts
│   │   │   └── transcribe/ # Endpoint para transcrição de áudio
│   │   │       └── route.ts
│   │   ├── components/     # Componentes React
│   │   ├── lib/            # Funções e classes utilitárias
│   │   ├── types/          # Definições de tipos TypeScript
│   │   ├── layout.tsx
│   │   ├── page.tsx        # Página inicial
│   │   └── terms/
│   │       └── page.tsx    # Página de Termos de Serviço
│   ├── public/             # Arquivos estáticos
│   ├── .env.local.example  # Exemplo de arquivo .env.local
│   ├── next.config.js     # Configuração do Next.js
│   ├── package.json        # Dependências e scripts do frontend
│   ├── postcss.config.js   # Configuração do PostCSS
│   ├── tailwind.config.ts  # Configuração do Tailwind CSS
│   └── tsconfig.json       # Configuração do TypeScript
├── .devcontainer/      # Configuração para VS Code Dev Containers (opcional)
├── docker-compose.yml  # Configuração do Docker Compose para desenvolvimento local
└── README.md           # Este arquivo
```

## Deploy

### Deploy no Google Cloud Platform (Cloud Run)

1.  **Configurar o Google Cloud SDK:**

    ```bash
    gcloud auth login
    gcloud config set project <SEU_PROJETO_GCP>
    ```

2.  **Criar Secrets no Secret Manager (se ainda não tiver feito):**

    Execute o script `backend/setup-secrets.sh`, fornecendo os valores corretos para as suas chaves:

    ```bash
    cd backend
    ./setup-secrets.sh
    ```

3.  **Construir e fazer deploy usando o Cloud Build:**

    ```bash
    gcloud builds submit --config backend/cloudbuild.yaml
    ```

    Isso construirá a imagem Docker do backend, fará push para o Container Registry e fará deploy no Cloud Run.

4.  **Deploy do Frontend (Vercel):**

    A maneira mais fácil de fazer deploy do frontend Next.js é usar a Vercel.

    *   Crie uma conta na Vercel (se ainda não tiver).
    *   Conecte sua conta do GitHub à Vercel.
    *   Importe o repositório do seu projeto.
    *   Configure as variáveis de ambiente (as mesmas do `.env.local`, *exceto* as chaves da OpenAI e do Pinecone).
    *   A Vercel cuidará do build e deploy do frontend.

## Testes
O projeto ainda não possui testes, mas é altamente recomendável adicionar testes unitários e de integração para garantir a qualidade do código.

* **Backend:** Use `pytest` e `pytest-asyncio` para testar a API FastAPI e a lógica do sistema de conhecimento.
* **Frontend:** Use Jest e React Testing Library para testar os componentes React e as funções utilitárias.

## Contribuindo

Contribuições são bem-vindas! Se você quiser contribuir, siga estas etapas:

1.  Faça um fork do repositório.
2.  Crie uma branch para sua feature (`git checkout -b feature/sua-feature`).
3.  Faça commit das suas mudanças (`git commit -m 'Adiciona funcionalidade X'`).
4.  Faça push para a branch (`git push origin feature/sua-feature`).
5.  Abra um Pull Request.

## Licença

Este projeto está licenciado sob a MIT License.

## Agradecimentos

*   OpenAI (pelas APIs Whisper e GPT-4)
*   Pinecone (pelo banco de dados vetorial)
*   Supabase (pela autenticação e armazenamento)
*   Vercel (pelo Next.js e hospedagem do frontend)
*   Tailwind Labs (pelo Tailwind CSS)
*   FastAPI (pelo framework web do backend)
*   Langchain (pela integração com modelos de linguagem)

Este README atualizado fornece uma visão geral completa do projeto, incluindo instruções detalhadas de configuração e execução, uma descrição da arquitetura e da estrutura do projeto, e informações sobre deploy.  Ele também aborda as principais mudanças e melhorias em relação à versão anterior.  Lembre-se de substituir os placeholders (como `<URL_DO_REPOSITORIO>`, `<SEU_PROJETO_GCP>`, etc.) pelos valores corretos. 