export default function TermsOfService(): JSX.Element {
  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Termos de Serviço</h1>
      <div className="prose">
        <p>Última atualização: {new Date().toLocaleDateString()}</p>
        
        <h2>1. Aceitação dos Termos</h2>
        <p>Ao usar o Jung AI Chat, você concorda com estes termos.</p>

        <h2>2. Uso do Serviço</h2>
        <p>O serviço é fornecido para fins de desenvolvimento e demonstração.</p>

        <h2>3. Responsabilidades</h2>
        <ul>
          <li>O chat é uma simulação e não substitui aconselhamento profissional</li>
          <li>Não nos responsabilizamos por decisões tomadas com base nas conversas</li>
          <li>O usuário é responsável por manter suas credenciais seguras</li>
        </ul>
      </div>
    </div>
  );
} 