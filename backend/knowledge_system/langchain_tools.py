from typing import List, Dict, Any
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
from langchain.chat_models import ChatOpenAI
from langchain.chains.conversation.memory import ConversationBufferWindowMemory
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
        self.memory = ConversationBufferWindowMemory(k=5)
        
        # Inicializa as chains específicas
        self.concept_explanation_chain = self._create_concept_chain()
        self.archetype_analysis_chain = self._create_archetype_chain()
        self.therapeutic_guidance_chain = self._create_therapeutic_chain()
    
    def _create_concept_chain(self) -> LLMChain:
        """Cria uma chain para explicar conceitos junguianos."""
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
        
        Resposta:
        """
        
        prompt = PromptTemplate(
            input_variables=["concept_name", "context", "chat_history"],
            template=template
        )
        
        return LLMChain(
            llm=self.llm,
            prompt=prompt,
            memory=self.memory
        )
    
    def _create_archetype_chain(self) -> LLMChain:
        """Cria uma chain para análise de arquétipos."""
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
        
        Resposta:
        """
        
        prompt = PromptTemplate(
            input_variables=["archetype_name", "manifestations", "symbols", "chat_history"],
            template=template
        )
        
        return LLMChain(
            llm=self.llm,
            prompt=prompt,
            memory=self.memory
        )
    
    def _create_therapeutic_chain(self) -> LLMChain:
        """Cria uma chain para orientação terapêutica."""
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
        
        Resposta:
        """
        
        prompt = PromptTemplate(
            input_variables=["situation", "relevant_concepts", "available_techniques", "chat_history"],
            template=template
        )
        
        return LLMChain(
            llm=self.llm,
            prompt=prompt,
            memory=self.memory
        )
    
    async def explain_concept(self, concept_name: str) -> str:
        """Explica um conceito junguiano."""
        concept = self.kb.get_concept(concept_name)
        if not concept:
            similar_docs = self.vector_store.similarity_search(concept_name)
            context = "\n".join(doc.page_content for doc in similar_docs)
        else:
            context = f"""
            Descrição: {concept.description}
            Exemplos: {', '.join(concept.examples)}
            Conceitos relacionados: {', '.join(concept.related_concepts)}
            """
        
        response = await self.concept_explanation_chain.arun(
            concept_name=concept_name,
            context=context,
            chat_history=self.memory.chat_memory.messages
        )
        
        return response
    
    async def analyze_archetype(self, archetype_name: str) -> str:
        """Analisa um arquétipo junguiano."""
        archetype = self.kb.get_archetype(archetype_name)
        if not archetype:
            return "Arquétipo não encontrado na base de conhecimento."
        
        response = await self.archetype_analysis_chain.arun(
            archetype_name=archetype_name,
            manifestations="\n".join(archetype.manifestations),
            symbols="\n".join(archetype.symbols),
            chat_history=self.memory.chat_memory.messages
        )
        
        return response
    
    async def get_therapeutic_guidance(
        self,
        situation: str,
        relevant_concepts: List[str] = None
    ) -> str:
        """Fornece orientação terapêutica baseada na psicologia junguiana."""
        if relevant_concepts is None:
            # Busca conceitos relevantes no vector store
            similar_docs = self.vector_store.similarity_search(situation)
            relevant_concepts = [doc.metadata.get('concept') for doc in similar_docs if doc.metadata.get('concept')]
        
        concepts_info = []
        for concept_name in relevant_concepts:
            concept = self.kb.get_concept(concept_name)
            if concept:
                concepts_info.append(f"{concept_name}: {concept.description}")
        
        techniques = self.kb.get_therapeutic_techniques()
        
        response = await self.therapeutic_guidance_chain.arun(
            situation=situation,
            relevant_concepts="\n".join(concepts_info),
            available_techniques="\n".join(techniques),
            chat_history=self.memory.chat_memory.messages
        )
        
        return response 