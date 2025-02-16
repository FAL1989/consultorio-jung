export default function PrivacyPolicy(): JSX.Element {
  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Política de Privacidade</h1>
      <div className="prose">
        <p>Última atualização: {new Date().toLocaleDateString()}</p>
        <h2>1. Informações que coletamos</h2>
        <p>Coletamos apenas as informações necessárias para o funcionamento do chat:</p>
        <ul>
          <li>Email para autenticação</li>
          <li>Nome de perfil do Google</li>
          <li>Histórico de conversas com o chatbot</li>
        </ul>
        
        <h2>2. Como usamos suas informações</h2>
        <p>Suas informações são usadas exclusivamente para:</p>
        <ul>
          <li>Autenticação no sistema</li>
          <li>Personalização da experiência do usuário</li>
          <li>Manutenção do histórico de conversas</li>
        </ul>

        <h2>3. Proteção de dados</h2>
        <p>Seus dados são armazenados de forma segura no Supabase com criptografia.</p>
      </div>
    </div>
  );
} 