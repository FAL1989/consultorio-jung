"use client";

import { useAuth } from "@/lib/hooks/useAuth";

export default function LandingPage(): JSX.Element {
  const { signIn } = useAuth();

  return (
    <div className="min-h-screen relative">
      {/* Background Image */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/stones-6788902.jpg')" }}
      />

      {/* Main Card */}
      <div className="relative flex flex-col items-center justify-center min-h-screen py-12">
        {/* Hero Card */}
        <div className="bg-white rounded-3xl p-8 shadow-lg max-w-md w-full mx-auto mb-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-4">
              Diálogos Junguianos
            </h1>
            <p className="text-base text-gray-600 mb-8">
              Uma jornada de autoconhecimento inspirada nos ensinamentos de Carl Gustav Jung
            </p>
            <button
              onClick={() => signIn()}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium"
            >
              Comece sua Jornada
            </button>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl w-full mx-auto px-4 mb-8">
          {/* Conceitos Fundamentais */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Conceitos Fundamentais
            </h3>
            <p className="text-sm text-gray-600">
              Explore os principais conceitos da psicologia analítica: arquétipos, 
              inconsciente coletivo, individuação e muito mais.
            </p>
          </div>

          {/* Abordagem Terapêutica */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Abordagem Terapêutica
            </h3>
            <p className="text-sm text-gray-600">
              Uma experiência terapêutica baseada na psicologia analítica de Jung, com foco no 
              autoconhecimento e desenvolvimento pessoal.
            </p>
          </div>

          {/* Integração com IA */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Integração com IA
            </h3>
            <p className="text-sm text-gray-600">
              Tecnologia avançada de IA combinada com os princípios junguianos para 
              oferecer insights profundos e significativos.
            </p>
          </div>
        </div>

        {/* About Section */}
        <div className="bg-white rounded-3xl p-8 shadow-lg max-w-4xl w-full mx-auto">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Sobre Carl Gustav Jung
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Carl Gustav Jung (1875-1961) foi um psiquiatra e psicoterapeuta suíço que
              fundou a psicologia analítica. Sua abordagem única para a compreensão da
              psique humana continua influenciando a psicologia moderna, a arte, a
              literatura e a espiritualidade.
            </p>
            <p className="text-sm text-gray-600">
              Seus conceitos de arquétipos, inconsciente coletivo, persona, sombra e
              individuação oferecem um rico framework para o autoconhecimento e o
              desenvolvimento pessoal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}