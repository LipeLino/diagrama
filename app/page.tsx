import Link from "next/link";

const figures = [
  {
    href: "/figura-02",
    title: "Figura 2 – Variáveis → Indicadores → Decisão",
    description:
      "Encadeamento agroclimático com conectores Bézier e exportação vetorial.",
  },
  {
    href: "/figura-03",
    title: "Figura 3 – Estação IoT → Plataforma",
    description:
      "Arquitetura IoT com interoperabilidade SensorThings e conectividade híbrida.",
  },
  {
    href: "/figura-04",
    title: "Figura 4 – Pipeline DSS de Irrigação",
    description: "Fluxo ingestão→recomendação com QA/QC e métricas WDQMS.",
  },
  {
    href: "/figura-05",
    title: "Figura 5 – Walk-forward, monitoração e drift",
    description:
      "Janela deslizante, monitoração contínua e alarmes de drift para retreinamento.",
  },
  {
    href: "/figura-06",
    title: "Figura 6 – Camadas de segurança e papéis (RBAC)",
    description:
      "Papéis, gateway, serviços e banco com RLS e conformidade à LGPD.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-10 px-6 py-12">
      <header className="space-y-4 text-balance">
        <h1 className="text-3xl font-semibold text-[#0e223d]">
          Diagramas agroclimáticos interativos
        </h1>
        <p className="text-base leading-6 text-[#0f2747]/80">
          Explore as figuras construídas com Next.js 15, Tailwind CSS e
          conectores SVG manuais com suporte a exportação vetorial (SVG/PDF).
        </p>
      </header>
      <section
        aria-label="Lista de figuras disponíveis"
        className="grid gap-6 md:grid-cols-2"
      >
        {figures.map((figure) => (
          <article
            key={figure.href}
            className="rounded-2xl border border-[#dde8f3] bg-white/80 p-6 shadow-md transition hover:-translate-y-1 hover:shadow-lg focus-within:-translate-y-1 focus-within:shadow-lg"
          >
            <h2 className="text-lg font-semibold text-[#0e223d]">
              {figure.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#0f2747]/80">
              {figure.description}
            </p>
            <div className="mt-4">
              <Link
                href={figure.href}
                className="inline-flex items-center rounded-lg border border-[#2a7de1] px-4 py-2 text-sm font-medium text-[#2a7de1] transition hover:bg-[#e9f5ff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0ea5e9]"
              >
                Abrir figura
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
