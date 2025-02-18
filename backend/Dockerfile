# Use a imagem oficial do Python com slim variant para menor tamanho
FROM python:3.11-slim

# Define variáveis de ambiente
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PORT=8000 \
    WORKERS=2 \
    TIMEOUT=300

# Define o diretório de trabalho
WORKDIR /app

# Instala as dependências do sistema
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copia apenas os arquivos de requisitos primeiro
COPY requirements.txt .

# Instala as dependências Python em uma camada separada
RUN pip install --no-cache-dir -r requirements.txt

# Copia os arquivos da aplicação
COPY main.py .
COPY knowledge_system ./knowledge_system

# Healthcheck com tempo maior para inicialização
HEALTHCHECK --interval=30s --timeout=30s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT}/api/startup-check || exit 1

# Define o comando para iniciar a aplicação
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT} --workers 1 --timeout-keep-alive 75 --limit-max-requests 10000 --log-level info"] 