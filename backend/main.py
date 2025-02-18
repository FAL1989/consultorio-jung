from fastapi import FastAPI, HTTPException, Header, Depends
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

class ChatResponse(BaseModel):
    response: Dict[str, Any]
    usage: Dict[str, int]

async def verify_auth(authorization: str = Header(...)) -> str:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token inválido")
    return authorization.replace("Bearer ", "")

@app.get("/")
async def root():
    return {"status": "online", "service": "F.A.L AI Agency API"}

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, token: str = Depends(verify_auth)):
    try:
        logger.info(f"Processando requisição de chat para usuário: {request.user_id}")
        
        # Busca conceitos relevantes no vector store
        relevantDocs = await vector_store.similarity_search(request.message, 3)
        concepts = [
            {
                "name": doc.metadata.get("concept_name", "Conceito Junguiano"),
                "description": doc.page_content[:200] + "..."
            }
            for doc in relevantDocs
        ]
        
        logger.info(f"Encontrados {len(concepts)} conceitos relevantes")

        # Gera resposta usando GPT-4
        completion = await openai_client.chat.completions.create(
            model="gpt-4",
            messages=[
                { "role": "system", "content": SYSTEM_PROMPT },
                { "role": "user", "content": request.message }
            ],
            temperature=0.7,
            max_tokens=2000,
            top_p=0.9,
            frequency_penalty=0.5,
            presence_penalty=0.5,
        )

        responseText = completion.choices[0].message.content

        if not responseText:
            logger.error("GPT-4 retornou uma resposta vazia")
            raise HTTPException(
                status_code=500,
                detail="Não foi possível gerar uma resposta"
            )

        # Busca referências relevantes
        references = await analyst.get_relevant_references(responseText)
        logger.info(f"Encontradas {len(references) if references else 0} referências relevantes")

        # Prepara resposta enriquecida
        response = ChatResponse(
            response={
                "text": responseText,
                "concepts": concepts if concepts else None,
                "references": references if references else None
            },
            usage={
                "prompt_tokens": completion.usage.prompt_tokens,
                "completion_tokens": completion.usage.completion_tokens,
                "total_tokens": completion.usage.total_tokens,
            }
        )

        logger.info(f"Resposta gerada com sucesso. Tokens totais: {completion.usage.total_tokens}")
        return response

    except Exception as e:
        logger.error(f"Erro ao processar chat: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao processar chat: {str(e)}"
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 