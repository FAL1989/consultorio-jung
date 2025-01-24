import streamlit as st
import whisper
import aiohttp
import asyncio
import json
from pathlib import Path
import tempfile
from pydub import AudioSegment
import time
from audio_recorder_streamlit import audio_recorder
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
    
    async def get_response(self, transcript: str) -> str:
        """
        Envia o texto transcrito para o modelo e recebe a análise.
        """
        messages = [
            {"role": "system", "content": """Você é Carl Gustav Jung, o renomado psiquiatra e psicoterapeuta suíço. 
            Mantenha um tom pessoal, acolhedor e sábio em suas respostas, como se estivesse conversando diretamente com seu paciente.
            Evite listagens formais ou análises muito técnicas. Em vez disso, integre naturalmente os conceitos em sua fala.
            Use ocasionalmente expressões como "minha teoria", "em minha experiência", "como descobri em meus estudos".
            Mantenha o tom amigável mas profundo, característico de uma conversa terapêutica."""},
            {"role": "user", "content": transcript}
        ]
        
        payload = {
            "model": "gpt-4o-mini-2024-07-18",
            "messages": messages,
            "temperature": 0.9,
            "max_tokens": 500,
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

class AudioProcessor:
    """
    Classe responsável pelo processamento do áudio e transcrição.
    Separamos esta lógica para melhor organização do código.
    """
    def __init__(self):
        self.model = whisper.load_model("base")
    
    def process_audio_chunk(self, chunk_path: str) -> str:
        """Processa um chunk de áudio e retorna a transcrição"""
        return self.model.transcribe(str(chunk_path))['text']
    
    def split_audio(self, audio_file, chunk_duration=30000):
        """Divide o áudio em chunks menores para processamento mais eficiente"""
        audio = AudioSegment.from_file(audio_file)
        chunks = []
        for i in range(0, len(audio), chunk_duration):
            chunks.append(audio[i:i + chunk_duration])
        return chunks

def initialize_session_state():
    if 'messages' not in st.session_state:
        st.session_state.messages = []
    if 'audio_processor' not in st.session_state:
        st.session_state.audio_processor = AudioProcessor()
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
        page_title="Chat Junguiano",
        page_icon="🧠",
        layout="wide"
    )
    
    st.title("💭 Consultório do Dr. Jung")
    st.markdown("""
    ### 🎙️ Converse com Dr. Carl Gustav Jung
    Compartilhe seus pensamentos, sonhos e reflexões em um diálogo terapêutico.
    """)
    
    initialize_session_state()
    
    # Display chat history
    for message in st.session_state.messages:
        display_message(message["is_user"], message["content"])
    
    # Criar duas colunas para áudio e texto
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("#### 🎤 Gravação de Áudio")
        # Botão de gravação de áudio
        audio_bytes = audio_recorder()
        if audio_bytes:
            with st.spinner("🎧 Processando seu áudio..."):
                try:
                    with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp_file:
                        tmp_file.write(audio_bytes)
                        tmp_path = Path(tmp_file.name)
                    
                    # Process audio
                    chunks = st.session_state.audio_processor.split_audio(tmp_path)
                    transcripts = []
                    
                    progress_text = st.empty()
                    for i, chunk in enumerate(chunks):
                        progress_text.text(f"📝 Transcrevendo parte {i+1} de {len(chunks)}...")
                        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as chunk_file:
                            chunk.export(chunk_file.name, format='wav')
                            transcript = st.session_state.audio_processor.process_audio_chunk(chunk_file.name)
                            transcripts.append(transcript)
                    
                    full_transcript = " ".join(transcripts)
                    
                    # Add user message
                    st.session_state.messages.append({
                        "is_user": True,
                        "content": f"🎤 *Áudio transcrito:*\n\n{full_transcript}"
                    })
                    
                    # Get analysis
                    progress_text.text("🤔 Analisando...")
                    async def get_analysis():
                        try:
                            response = await st.session_state.ollama_service.get_response(full_transcript)
                            st.session_state.messages.append({
                                "is_user": False,
                                "content": response
                            })
                        except Exception as e:
                            st.error(f"Erro na análise: {str(e)}")
                    
                    asyncio.run(get_analysis())
                    progress_text.empty()
                    
                    # Rerun to update chat
                    st.rerun()
                    
                except Exception as e:
                    st.error(f"Erro no processamento: {str(e)}")
    
    with col2:
        st.markdown("#### 💬 Mensagem de Texto")
        # Input de texto
        st.text_area(
            "Digite sua mensagem",
            key="text_input",
            height=100,
            on_change=process_text
        )
        st.button("Enviar Mensagem", on_click=process_text)
    
    # Upload de arquivo de áudio (opcional)
    st.markdown("#### 📁 Ou faça upload de um arquivo de áudio")
    audio_file = st.file_uploader(
        "Envie um arquivo de áudio",
        type=['wav', 'mp3', 'm4a'],
        label_visibility="collapsed"
    )
    
    if audio_file:
        with st.spinner("🎧 Ouvindo seu áudio..."):
            try:
                with tempfile.NamedTemporaryFile(delete=False, suffix=Path(audio_file.name).suffix) as tmp_file:
                    tmp_file.write(audio_file.getvalue())
                    tmp_path = Path(tmp_file.name)
                
                # Process audio
                chunks = st.session_state.audio_processor.split_audio(tmp_path)
                transcripts = []
                
                progress_text = st.empty()
                for i, chunk in enumerate(chunks):
                    progress_text.text(f"📝 Transcrevendo parte {i+1} de {len(chunks)}...")
                    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as chunk_file:
                        chunk.export(chunk_file.name, format='wav')
                        transcript = st.session_state.audio_processor.process_audio_chunk(chunk_file.name)
                        transcripts.append(transcript)
                
                full_transcript = " ".join(transcripts)
                
                # Add user message
                st.session_state.messages.append({
                    "is_user": True,
                    "content": f"🎤 *Áudio transcrito:*\n\n{full_transcript}"
                })
                
                # Get analysis
                progress_text.text("🤔 Analisando...")
                async def get_analysis():
                    try:
                        response = await st.session_state.ollama_service.get_response(full_transcript)
                        st.session_state.messages.append({
                            "is_user": False,
                            "content": response
                        })
                    except Exception as e:
                        st.error(f"Erro na análise: {str(e)}")
                
                asyncio.run(get_analysis())
                progress_text.empty()
                
                # Rerun to update chat
                st.rerun()
                
            except Exception as e:
                st.error(f"Erro no processamento: {str(e)}")
    
    # Adiciona um pouco de espaço e informações úteis no final
    st.markdown("---")
    st.markdown("""
    💡 **Notas do Dr. Jung:**
    - Sinta-se à vontade para compartilhar seus sonhos e experiências
    - Podemos conversar através de mensagens de voz ou texto
    - Estou aqui para explorar os mistérios da sua psique
    - Como sempre digo, "Quem olha para fora, sonha; quem olha para dentro, desperta"
    """)

if __name__ == "__main__":
    main()