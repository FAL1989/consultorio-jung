import streamlit as st
import aiohttp
import asyncio
import os

class OllamaService:
    def __init__(self):
        """
        Inicializa o serviço usando a API da OpenAI.
        """
        api_key = os.getenv('OPENAI_API_KEY') or st.secrets.get("OPENAI_API_KEY")
        if not api_key:
            st.error("⚠️ Chave da API da OpenAI não encontrada! Por favor, configure a variável OPENAI_API_KEY")
            st.stop()
            
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        self.base_url = "https://api.openai.com/v1/chat/completions"
    
    async def get_response(self, text: str) -> str:
        """
        Envia o texto para o modelo e recebe a análise.
        """
        messages = [
            {"role": "system", "content": """Você é Carl Gustav Jung, dialogando com um colega psicólogo. Como fundador da psicologia analítica, você deve:

1. Contextualização Teórica:
- Referenciar adequadamente seus conceitos fundamentais: inconsciente coletivo, arquétipos, individuação, sincronicidade
- Mencionar suas obras relevantes quando apropriado (ex: "Como discuti em 'Psicologia do Inconsciente'...")
- Relacionar observações com seus estudos sobre alquimia, mitologia e religiões comparadas

2. Postura Profissional:
- Manter um diálogo entre colegas de profissão, reconhecendo a formação e conhecimento do interlocutor
- Usar terminologia técnica apropriada, sabendo que está falando com outro profissional da área
- Fazer referências a casos clínicos de forma ética e preservando identidades

3. Abordagem Analítica:
- Explorar as dimensões simbólicas e arquetípicas das questões apresentadas
- Discutir a integração entre aspectos pessoais e coletivos do inconsciente
- Relacionar as questões com os processos de individuação e desenvolvimento psíquico

4. Linguagem e Estilo:
- Utilizar linguagem técnica apropriada para diálogo entre profissionais
- Fazer referências a conceitos psicanalíticos e analíticos quando pertinente
- Manter o tom reflexivo e investigativo característico da psicologia profunda

5. Aspectos Práticos:
- Discutir implicações práticas para o trabalho clínico
- Compartilhar insights sobre técnicas terapêuticas como amplificação e análise de sonhos
- Abordar a importância da análise pessoal do terapeuta

Lembre-se de manter o equilíbrio entre profundidade teórica e aplicabilidade prática, reconhecendo que está dialogando com um colega que busca aprofundar sua compreensão da psicologia analítica."""},
            {"role": "user", "content": text}
        ]
        
        payload = {
            "model": "gpt-4",
            "messages": messages,
            "temperature": 0.9,
            "max_tokens": 800,
            "top_p": 0.95,
            "frequency_penalty": 0.7,
            "presence_penalty": 0.7
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(self.base_url, headers=self.headers, json=payload) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data['choices'][0]['message']['content'].strip()
                    else:
                        error_text = await response.text()
                        raise Exception(f"Erro na API da OpenAI: {error_text}")
        except Exception as e:
            raise Exception(f"Falha na comunicação com a API: {str(e)}")

def initialize_session_state():
    if 'messages' not in st.session_state:
        st.session_state.messages = []
    if 'ollama_service' not in st.session_state:
        st.session_state.ollama_service = OllamaService()
    if 'text_input' not in st.session_state:
        st.session_state.text_input = ""

def clear_text():
    st.session_state.text_input = ""

def process_text():
    if st.session_state.text_input.strip():
        text = st.session_state.text_input
        # Add user message
        st.session_state.messages.append({
            "is_user": True,
            "content": f"💬 *Mensagem:*\n\n{text}"
        })
        
        # Process text
        asyncio.run(process_text_input(text))
        
        # Clear input
        clear_text()
        
        # Rerun to update chat
        st.rerun()

def display_message(is_user: bool, content: str):
    with st.chat_message("user" if is_user else "assistant"):
        st.markdown(content)

async def process_text_input(text: str):
    try:
        response = await st.session_state.ollama_service.get_response(text)
        st.session_state.messages.append({
            "is_user": False,
            "content": response
        })
    except Exception as e:
        st.error(f"Erro na análise: {str(e)}")

def main():
    st.set_page_config(
        page_title="Diálogos Junguianos",
        page_icon="🧠",
        layout="wide"
    )
    
    st.title("💭 Consultório do Dr. Jung - Diálogos Profissionais")
    st.markdown("""
    ### 💬 Dialogue com Carl Gustav Jung
    Um espaço para profissionais da psicologia explorarem os conceitos e aplicações da Psicologia Analítica.
    """)
    
    initialize_session_state()
    
    # Display chat history
    for message in st.session_state.messages:
        display_message(message["is_user"], message["content"])
    
    # Input de texto
    st.text_area(
        "Digite sua mensagem",
        key="text_input",
        height=100,
        on_change=process_text
    )
    st.button("Enviar Mensagem", on_click=process_text)
    
    # Adiciona um pouco de espaço e informações úteis no final
    st.markdown("---")
    st.markdown("""
    💡 **Notas para o Diálogo Profissional:**
    - Explore questões técnicas sobre a psicologia analítica
    - Discuta casos clínicos e suas interpretações arquetípicas
    - Aprofunde-se nos conceitos fundamentais da teoria junguiana
    - Relacione a teoria com a prática clínica contemporânea
    """)

if __name__ == "__main__":
    main()