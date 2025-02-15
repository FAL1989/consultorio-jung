# Consultório do Dr. Jung - Chat com Transcrição de Áudio

Uma aplicação Next.js que permite conversar com um chatbot baseado em Carl Gustav Jung, com suporte a entrada por voz usando a API Whisper da OpenAI.

## Funcionalidades

- 🎙️ Gravação de áudio diretamente no navegador
- 📁 Upload de arquivos de áudio
- 🤖 Transcrição automática usando OpenAI Whisper
- 💬 Chat interativo com personalidade de Carl Jung
- 🔒 Autenticação via Supabase
- 🎨 Interface moderna com Tailwind CSS

## Requisitos

- Node.js 18+
- Conta na OpenAI (para API key)
- Projeto no Supabase (para autenticação)

## Configuração

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/jung-ai-chat.git
cd jung-ai-chat
```

2. Instale as dependências:
```bash
cd frontend
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.local.example .env.local
```
Edite `.env.local` com suas credenciais:
- OPENAI_API_KEY: Sua chave da API da OpenAI
- NEXT_PUBLIC_SUPABASE_URL: URL do seu projeto Supabase
- NEXT_PUBLIC_SUPABASE_ANON_KEY: Chave anônima do Supabase
- SUPABASE_SERVICE_ROLE_KEY: Chave de serviço do Supabase

4. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:3000`.

## Estrutura do Projeto

```
frontend/
├── app/
│   ├── api/
│   │   ├── chat/
│   │   └── transcribe/
│   ├── components/
│   ├── lib/
│   └── types/
├── public/
└── ...
```

## Uso

1. Faça login usando sua conta
2. Na interface do chat, você pode:
   - Digitar mensagens normalmente
   - Gravar áudio usando o botão de microfone
   - Fazer upload de arquivos de áudio
3. O áudio será transcrito automaticamente
4. O texto transcrito será inserido no campo de mensagem
5. Envie a mensagem para conversar com Dr. Jung

## Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## Licença

Este projeto está licenciado sob a MIT License - veja o arquivo [LICENSE](LICENSE) para detalhes.

## Agradecimentos

- OpenAI pela API do Whisper
- Supabase pela infraestrutura de autenticação
- Vercel pelo Next.js
- Tailwind Labs pelo Tailwind CSS 