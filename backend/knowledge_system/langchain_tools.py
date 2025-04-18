from typing import List, Dict, Any, Optional, AsyncGenerator
import json # Add json import for SSE formatting
from langchain.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain.memory import ConversationBufferWindowMemory
from .knowledge_base import JungianKnowledgeBase
from .vector_store import JungianVectorStore

# --- Adicionar o novo prompt aqui (ou importar de forma mais elegante depois) ---
SYSTEM_PROMPT_CONVERSATIONAL = """Você é Carl Gustav Jung. Responda diretamente ao seu interlocutor, mantendo sua voz e perspectiva únicas.
Para saudações ('Olá', 'Oi', etc.) ou perguntas muito curtas e triviais, responda de forma cordial e pensativa, talvez com uma observação sucinta ou uma pergunta gentil que convide à reflexão, mas sem iniciar uma análise profunda não solicitada.
Se a pergunta for mais substancial ou solicitar explicitamente uma exploração de conceitos, utilize seu conhecimento analítico.

Considere o histórico da conversa para manter a continuidade.

Histórico da conversa:
{chat_history}

Interlocutor diz: {user_input}

Sua resposta (como C.G. Jung):
"""
# --- Fim do novo prompt ---

class JungianAnalyst:
    def __init__(
        self,
        knowledge_base: JungianKnowledgeBase,
        vector_store: JungianVectorStore,
        model_name: str = "gpt-4"
    ):
        self.kb = knowledge_base
        self.vector_store = vector_store
        self.llm = ChatOpenAI(model_name=model_name, temperature=0.7) # Ajuste temp se necessário
        self.memory = ConversationBufferWindowMemory(k=5, return_messages=True, memory_key="chat_history", input_key="input")
        
        # Inicializa as chains específicas
        self.concept_explanation_chain = self._create_concept_chain()
        self.archetype_analysis_chain = self._create_archetype_chain()
        self.therapeutic_guidance_chain = self._create_therapeutic_chain()
        # --- Inicializar a nova chain conversacional ---
        self.conversational_chain = self._create_conversational_chain()
    
    def _load_memory(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        memory_variables = self.memory.load_memory_variables({"input": input_data.get("input", "")})
        input_data.update(memory_variables)
        return input_data

    def _create_concept_chain(self):
        """Cria uma chain para explicar conceitos junguianos usando LCEL."""
        template = """
        Como um analista junguiano experiente, explique o seguinte conceito:
        
        Conceito: {concept_name}
        
        Contexto adicional do banco de dados:
        {context}
        
        Por favor, forneça:
        1. Uma explicação clara e acessível
        2. Exemplos práticos do conceito
        3. Como ele se relaciona com outros conceitos junguianos
        4. Sua relevância para o desenvolvimento pessoal
        
        Histórico da conversa:
        {chat_history}
        
        Sua explicação:
        """
        
        prompt = PromptTemplate(
            input_variables=["concept_name", "context", "chat_history", "input"],
            template=template
        )
        
        chain = (
            RunnablePassthrough.assign(
                chat_history=lambda x: self.memory.load_memory_variables(x)["chat_history"]
            )
            | prompt
            | self.llm
            | StrOutputParser()
        )
        return chain
    
    def _create_archetype_chain(self):
        """Cria uma chain para análise de arquétipos usando LCEL."""
        template = """
        Como um analista junguiano experiente, analise o seguinte arquétipo:
        
        Arquétipo: {archetype_name}
        
        Manifestações conhecidas:
        {manifestations}
        
        Símbolos associados:
        {symbols}
        
        Por favor, forneça:
        1. Uma descrição do arquétipo e seu significado
        2. Como ele se manifesta na vida cotidiana
        3. Seu papel no processo de individuação
        4. Formas de trabalhar construtivamente com este arquétipo
        
        Histórico da conversa:
        {chat_history}
        
        Sua análise:
        """
        
        prompt = PromptTemplate(
            input_variables=["archetype_name", "manifestations", "symbols", "chat_history", "input"],
            template=template
        )
        
        chain = (
            RunnablePassthrough.assign(
                 chat_history=lambda x: self.memory.load_memory_variables(x)["chat_history"]
            )
            | prompt
            | self.llm
            | StrOutputParser()
        )
        return chain
    
    def _create_therapeutic_chain(self):
        """Cria uma chain para orientação terapêutica usando LCEL."""
        template = """
        Como um analista junguiano experiente, forneça orientação terapêutica:
        
        Situação: {situation}
        
        Conceitos relevantes:
        {relevant_concepts}
        
        Técnicas disponíveis:
        {available_techniques}
        
        Por favor, forneça:
        1. Uma análise da situação sob a perspectiva junguiana
        2. Sugestões de técnicas terapêuticas apropriadas
        3. Possíveis desafios e como abordá-los
        4. Objetivos terapêuticos recomendados
        
        Histórico da conversa:
        {chat_history}
        
        Sua orientação:
        """
        
        prompt = PromptTemplate(
            input_variables=["situation", "relevant_concepts", "available_techniques", "chat_history", "input"],
            template=template
        )
        
        chain = (
            RunnablePassthrough.assign(
                 chat_history=lambda x: self.memory.load_memory_variables(x)["chat_history"]
            )
            | prompt
            | self.llm
            | StrOutputParser()
        )
        return chain
    
    # --- Adicionar método para criar a chain conversacional ---
    def _create_conversational_chain(self):
        """Cria uma chain para respostas conversacionais como Jung."""
        prompt = PromptTemplate(
            input_variables=["user_input", "chat_history", "input"], # Adiciona "input" para memória
            template=SYSTEM_PROMPT_CONVERSATIONAL
        )

        chain = (
            RunnablePassthrough.assign(
                # Carrega chat_history da memória. A chave "input" é necessária pela memória.
                chat_history=lambda x: self.memory.load_memory_variables(x)["chat_history"]
            )
            | prompt
            | self.llm
            | StrOutputParser()
        )
        return chain
    # --- Fim do novo método ---
    
    async def explain_concept(self, concept_name: str, user_input: str) -> str:
        """Explica um conceito junguiano."""
        concept = self.kb.get_concept(concept_name)
        if not concept:
            similar_docs = await self.vector_store.similarity_search(concept_name)
            context = "\n".join(doc.page_content for doc in similar_docs)
        else:
            context = f"""
            Descrição: {concept.description}
            Exemplos: {', '.join(concept.examples)}
            Conceitos relacionados: {', '.join(concept.related_concepts)}
            """
        
        response = await self.concept_explanation_chain.ainvoke({
            "concept_name": concept_name,
            "context": context,
            "input": user_input
        })
        self.memory.save_context({"input": user_input}, {"output": response})
        return response
    
    async def analyze_archetype(self, archetype_name: str, user_input: str) -> str:
        """Analisa um arquétipo junguiano."""
        archetype = self.kb.get_archetype(archetype_name)
        if not archetype:
            return "Arquétipo não encontrado na base de conhecimento."
        
        response = await self.archetype_analysis_chain.ainvoke({
            "archetype_name": archetype_name,
            "manifestations": "\n".join(archetype.manifestations),
            "symbols": "\n".join(archetype.symbols),
            "input": user_input
        })
        self.memory.save_context({"input": user_input}, {"output": response})
        return response
    
    async def generate_response_stream(self, user_input: str) -> AsyncGenerator[str, None]:
        """Gera uma resposta em streaming, escolhendo a chain apropriada."""
        full_response_text = ""
        references = [] # Placeholder for references, logic TBD
        concepts_metadata = [] # To store metadata for final event

        # --- Lógica para decidir qual chain usar ---
        is_simple_input = False
        normalized_input = user_input.lower().strip()
        greetings = ["olá", "oi", "tudo bem", "bom dia", "boa tarde", "boa noite"]
        # Critério: menos de 8 palavras OU contém saudação
        if len(normalized_input.split()) < 8 or any(greet in normalized_input for greet in greetings):
            is_simple_input = True
        # --- Fim da lógica de decisão ---

        try:
            if is_simple_input:
                # --- Usar Chain Conversacional --- 
                chain_to_use = self.conversational_chain
                chain_input = {"user_input": user_input, "input": user_input} # Input simples para chain conv.
                
                # Para inputs simples, não buscamos concepts/references inicialmente
                relevant_concepts_list = [] 
                concepts_info = []

            else:
                # --- Usar Chain Terapêutica (como antes) ---
                chain_to_use = self.therapeutic_guidance_chain
                # 1. Buscar contexto inicial (conceitos relevantes)
                similar_docs = self.vector_store.similarity_search(user_input, k=3)
                relevant_concepts_list = [doc.metadata.get('concept') for doc in similar_docs if doc.metadata.get('concept')]
                concepts_info = []
                for concept_name in relevant_concepts_list or []:
                    concept = self.kb.get_concept(concept_name)
                    if concept:
                        concepts_info.append(f"{concept_name}: {concept.description}")
                        concepts_metadata.append({
                            "name": concept_name,
                            "description": concept.description[:150] + "..."
                        })
                techniques = self.kb.get_therapeutic_techniques()
                # 2. Preparar input para a chain terapêutica
                chain_input = {
                    "situation": user_input,
                    "relevant_concepts": "\n".join(concepts_info),
                    "available_techniques": "\n".join(techniques),
                    "input": user_input
                }
            # --- Fim da seleção da Chain ---

            # 3. Iterar sobre o stream da LLM usando a chain selecionada
            async for chunk in chain_to_use.astream(chain_input):
                if chunk:
                    full_response_text += chunk
                    sse_event = f"data: {json.dumps({'text': chunk})}\n\n"
                    yield sse_event

            # 4. Após o stream, fazer yield do evento de metadados
            #    Se foi input simples, os metadados estarão vazios.
            metadata = {
                "concepts": concepts_metadata, # Será vazio se is_simple_input for True
                "references": references
            }
            yield f"event: metadata\ndata: {json.dumps(metadata)}\n\n"

            # 5. Salvar contexto na memória APÓS stream completo
            # Usamos user_input e a resposta completa (independente da chain)
            self.memory.save_context({"input": user_input}, {"output": full_response_text})

        except Exception as e:
            # Em caso de erro, envia um evento de erro SSE
            error_message = f"Erro durante o processamento: {str(e)}"
            print(f"ERROR in generate_response_stream: {error_message}") # Log no servidor
            yield f"event: error\ndata: {json.dumps({'error': error_message})}\n\n"

    async def get_therapeutic_guidance(
        self,
        situation: str,
        user_input: str,
        relevant_concepts: Optional[List[str]] = None
    ) -> str:
        """Fornece orientação terapêutica baseada na psicologia junguiana."""
        if relevant_concepts is None:
            similar_docs = await self.vector_store.similarity_search(situation)
            relevant_concepts = [doc.metadata.get('concept') for doc in similar_docs if doc.metadata.get('concept')]
        
        concepts_info = []
        for concept_name in relevant_concepts or []:
            concept = self.kb.get_concept(concept_name)
            if concept:
                concepts_info.append(f"{concept_name}: {concept.description}")
        
        techniques = self.kb.get_therapeutic_techniques()
        
        response = await self.therapeutic_guidance_chain.ainvoke({
            "situation": situation,
            "relevant_concepts": "\n".join(concepts_info),
            "available_techniques": "\n".join(techniques),
            "input": user_input
        })
        self.memory.save_context({"input": user_input}, {"output": response})
        return response 