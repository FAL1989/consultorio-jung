from fastapi import FastAPI, HTTPException, Header, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from knowledge_system.knowledge_base import JungianKnowledgeBase
from knowledge_system.vector_store import JungianVectorStore
from knowledge_system.langchain_tools import JungianAnalyst
import os
import logging
from dotenv import load_dotenv
from datetime import datetime
import openai
from openai import OpenAI
import io
from starlette.responses import StreamingResponse
import json

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Carrega variáveis de ambiente
load_dotenv()

# Configuração OpenAI
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Configuração de CORS baseada no ambiente
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://mindfuljung.com")

# Configuração de origens permitidas
ALLOWED_ORIGINS_STR = os.getenv("ALLOWED_ORIGINS", FRONTEND_URL)
ALLOWED_ORIGINS = (
    ALLOWED_ORIGINS_STR.split(",")
    if ENVIRONMENT == "production"
    else ["*"]
)

logger.info(f"Ambiente: {ENVIRONMENT}")
logger.info(f"URLs permitidas: {ALLOWED_ORIGINS}")

# Prompt do sistema para o analista junguiano
SYSTEM_PROMPT = """Você é um analista junguiano experiente, com profundo conhecimento da psicologia analítica de Carl Gustav Jung.
Seu papel é ajudar as pessoas a compreenderem melhor os conceitos junguianos e como eles se aplicam à vida cotidiana.

Ao responder:
1. Use uma linguagem clara e acessível, mas mantenha a profundidade conceitual
2. Faça conexões entre diferentes conceitos junguianos quando relevante
3. Ilustre com exemplos práticos e metáforas quando apropriado
4. Cite obras e textos relevantes de Jung quando pertinente
5. Mantenha uma postura empática e não-julgadora
6. Evite fazer diagnósticos ou dar conselhos terapêuticos diretos
7. Encoraje a auto-reflexão e o processo de individuação

Base suas respostas no conhecimento junguiano autêntico, usando os conceitos fundamentais como:
- Arquétipos e inconsciente coletivo
- Processo de individuação
- Tipos psicológicos
- Sincronicidade
- Complexos e sombra
- Anima e animus
- Self e ego
- Símbolos e sonhos

Lembre-se: seu objetivo é facilitar a compreensão e reflexão, não substituir a terapia ou análise pessoal."""

# Inicializa o app FastAPI
app = FastAPI(
    title="F.A.L AI Agency API",
    description="Backend API para o sistema de conhecimento junguiano",
    version="1.0.0"
)

# Configuração CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    # Inicializa o sistema de conhecimento
    vector_store = JungianVectorStore(
        api_key=os.getenv("PINECONE_API_KEY"),
        environment=os.getenv("PINECONE_ENVIRONMENT", "us-west-2"),
        index_name=os.getenv("PINECONE_INDEX_NAME", "jung-knowledge")
    )
    knowledge_base = JungianKnowledgeBase(vector_store)
    analyst = JungianAnalyst(knowledge_base, vector_store)
    logger.info("Sistema de conhecimento inicializado com sucesso")
except Exception as e:
    logger.error(f"Erro ao inicializar o sistema de conhecimento: {str(e)}")
    raise

# Classes para validação de dados
class QueryRequest(BaseModel):
    query: str
    max_results: Optional[int] = 3

class ConceptResponse(BaseModel):
    title: str
    content: str
    category: str
    references: List[str]
    confidence: float

class ChatRequest(BaseModel):
    message: str
    conversationId: Optional[str]
    user_id: str

async def verify_auth(authorization: str = Header(...)) -> str:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token inválido")
    return authorization.replace("Bearer ", "")

@app.get("/")
async def root():
    return {"status": "online", "service": "F.A.L AI Agency API"}

@app.post("/api/chat")
async def chat_stream(request: ChatRequest, user_id: str = Depends(verify_auth)):
    """Endpoint principal para interação com o chatbot via streaming SSE."""
    try:
        logger.info(f"Iniciando stream de chat para usuário verificado: {user_id}")

        # Chama o método gerador do analyst
        stream_generator = analyst.generate_response_stream(request.message)

        # Retorna a StreamingResponse
        return StreamingResponse(stream_generator, media_type="text/event-stream")

    except Exception as e:
        # Se um erro ocorrer ANTES do stream iniciar (e.g., na inicialização do analyst),
        # loga e levanta um HTTP Exception padrão.
        # Erros DURANTE o stream serão tratados dentro do generate_response_stream (enviando evento SSE de erro).
        logger.error(f"Erro crítico ao iniciar stream de chat: {str(e)}", exc_info=True)
        # Não podemos retornar StreamingResponse aqui, então levantamos 500.
        # O frontend precisará tratar isso (onerror do EventSource talvez?).
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao iniciar stream de chat: {str(e)}"
        )

@app.post("/api/query", response_model=List[ConceptResponse])
async def query_knowledge_base(request: QueryRequest):
    try:
        logger.info(f"Processando consulta: {request.query}")
        results = await knowledge_base.query(
            request.query,
            max_results=request.max_results
        )
        logger.info(f"Consulta processada com sucesso. Resultados: {len(results)}")
        return results
    except Exception as e:
        logger.error(f"Erro ao processar consulta: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao processar consulta: {str(e)}"
        )

@app.get("/api/health")
async def health_check():
    """Full health check that verifies all service connections"""
    try:
        # Verifica conexão com Pinecone
        await vector_store.test_connection()
        logger.info("Health check completo realizado com sucesso")
        return {
            "status": "healthy",
            "vector_store": "connected",
            "timestamp": str(datetime.now())
        }
    except Exception as e:
        logger.error(f"Health check falhou: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=503,
            detail=f"Serviço indisponível: {str(e)}"
        )

@app.get("/api/startup-check")
async def startup_check():
    """Simple health check for container startup"""
    logger.info("Startup check realizado com sucesso")
    return {
        "status": "online",
        "timestamp": str(datetime.now())
    }

# NOVO ENDPOINT: Transcrição de Áudio
@app.post("/api/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...), # Recebe o arquivo de áudio como FormData
    token: str = Depends(verify_auth) # Protege o endpoint com autenticação
):
    """Recebe um arquivo de áudio, transcreve usando OpenAI Whisper e retorna o texto."""
    try:
        logger.info(f"Recebendo arquivo de áudio para transcrição: {audio.filename}")

        # Lê o conteúdo do arquivo em memória
        audio_bytes = await audio.read()

        # Prepara o arquivo para a API da OpenAI (necessita de um file-like object com nome)
        audio_file_for_openai = io.BytesIO(audio_bytes)
        # A API da OpenAI precisa que o objeto tenha um atributo 'name'
        setattr(audio_file_for_openai, 'name', audio.filename or 'audio.webm')

        # Chama a API de transcrição da OpenAI
        transcript_response = await openai_client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file_for_openai,
            language="pt",
            response_format="json" # Pede JSON para facilitar o parse
        )

        transcription = transcript_response.text
        logger.info(f"Áudio transcrito com sucesso. Tamanho do texto: {len(transcription)}")

        # Retorna a transcrição
        return {"transcript": transcription}

    except openai.APIError as e:
        logger.error(f"Erro da API OpenAI ao transcrever: {e.status_code} - {e.message}", exc_info=True)
        raise HTTPException(
            status_code=e.status_code or 500,
            detail=f"Erro da API OpenAI: {e.message}"
        )
    except Exception as e:
        logger.error(f"Erro inesperado ao transcrever áudio: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Erro interno do servidor ao transcrever áudio: {str(e)}"
        )
# FIM NOVO ENDPOINT

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 