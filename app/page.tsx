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
    title: "Figura 4 – Balanço de energia na superfície",
    description:
      "Partição de Rₙ em H, LE e G (conceitual), com exportação vetorial SVG/PDF.",
  },
  {
    href: "/fig-pipelineconceitual",
    title: "Figura 4 – Pipeline conceitual",
    description:
      "Dados, indicadores, recomendação e ação com conectores SVG e exportação vetorial.",
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
