import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen p-10" style={{ backgroundColor: "#f7fbff" }}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center" style={{ color: "#0f2747" }}>
          Diagramas TCC - Sistema de Irrigação
        </h1>
        <div className="grid gap-4">
          <Link href="/figure02" className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition">
            <h2 className="text-xl font-bold mb-2">Figura 2 - Encadeamento</h2>
            <p className="text-gray-600">Variáveis  Indicadores  Decisão</p>
          </Link>
          <Link href="/figure03" className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition">
            <h2 className="text-xl font-bold mb-2">Figura 3 - Arquitetura IoT</h2>
            <p className="text-gray-600">Estação de campo  Plataforma</p>
          </Link>
          <Link href="/figure04" className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition">
            <h2 className="text-xl font-bold mb-2">Figura 4 - Pipeline DSS</h2>
            <p className="text-gray-600">Fluxo de dados para decisão</p>
          </Link>
          <Link href="/figure05" className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition">
            <h2 className="text-xl font-bold mb-2">Figura 5 - Walk-forward MLOps</h2>
            <p className="text-gray-600">Ciclo de treinamento e monitoração</p>
          </Link>
          <Link href="/figure06" className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition">
            <h2 className="text-xl font-bold mb-2">Figura 6 - Segurança RBAC</h2>
            <p className="text-gray-600">Controle de acesso baseado em papéis</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
