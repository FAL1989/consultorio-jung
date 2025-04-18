from typing import List, Dict, Any, Optional, AsyncGenerator
import json # Add json import for SSE formatting
from langchain.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain.memory import ConversationBufferWindowMemory
from .knowledge_base import JungianKnowledgeBase
from .vector_store import JungianVectorStore

class JungianAnalyst:
    def __init__(
        self,
        knowledge_base: JungianKnowledgeBase,
        vector_store: JungianVectorStore,
        model_name: str = "gpt-4"
    ):
        self.kb = knowledge_base
        self.vector_store = vector_store
        self.llm = ChatOpenAI(model_name=model_name)
        self.memory = ConversationBufferWindowMemory(k=5, return_messages=True, memory_key="chat_history", input_key="input")
        
        # Inicializa as chains específicas
        self.concept_explanation_chain = self._create_concept_chain()
        self.archetype_analysis_chain = self._create_archetype_chain()
        self.therapeutic_guidance_chain = self._create_therapeutic_chain()
    
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
        """Gera uma resposta terapêutica em streaming e envia metadados no final."""
        full_response_text = ""
        relevant_concepts_list = []
        references = [] # Placeholder for references, logic TBD
        concepts_metadata = [] # To store metadata for final event

        try:
            # 1. Buscar contexto inicial (conceitos relevantes)
            # Usamos situation=user_input para buscar conceitos gerais sobre a mensagem
            similar_docs = self.vector_store.similarity_search(user_input, k=3)
            relevant_concepts_list = [doc.metadata.get('concept') for doc in similar_docs if doc.metadata.get('concept')]

            concepts_info = []
            for concept_name in relevant_concepts_list or []:
                concept = self.kb.get_concept(concept_name)
                if concept:
                    concepts_info.append(f"{concept_name}: {concept.description}")
                    # Store for metadata event
                    concepts_metadata.append({
                        "name": concept_name,
                        "description": concept.description[:150] + "..."
                    })

            techniques = self.kb.get_therapeutic_techniques()

            # 2. Preparar input para a chain
            chain_input = {
                "situation": user_input,
                "relevant_concepts": "\n".join(concepts_info),
                "available_techniques": "\n".join(techniques),
                "input": user_input # Para carregar/salvar memória
            }

            # 3. Iterar sobre o stream da LLM usando .astream()
            async for chunk in self.therapeutic_guidance_chain.astream(chain_input):
                # chunk é uma string (devido ao StrOutputParser)
                if chunk:
                    full_response_text += chunk
                    # Yield text chunk as SSE data event - Corrected formatting
                    sse_event = f"data: {json.dumps({'text': chunk})}\n\n"
                    yield sse_event

            # 4. Após o stream, fazer yield do evento de metadados
            #    (Aqui usamos os concepts_metadata que coletamos antes)
            #    A lógica de references ainda precisa ser definida se necessário
            metadata = {
                "concepts": concepts_metadata,
                "references": references
            }
            yield f"event: metadata\ndata: {json.dumps(metadata)}\n\n"

            # 5. Salvar contexto na memória APÓS stream completo
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