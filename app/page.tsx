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
    href: "/figura-05",
    title: "Figura 5 – Localização das estações",
    description:
      "Mapa vetorial do Triângulo Mineiro Sul com posições, provedores e altitudes Redeagromet.",
  },
  {
    href: "/figura-06",
    title: "Figura 6 – Arquitetura lógica Redeagromet",
    description:
      "Fluxo sensores → ingestão → persistência → APIs/painel usando trilhas verticais e conectores SVG.",
  },
  {
    href: "/figura-07",
    title: "Figura 7 – C4 Containers",
    description:
      "Diagrama C4 com limites externos, backend e frontend destacando serviços e integrações.",
  },
  {
    href: "/figura-08",
    title: "Figura 8 – Fluxo ETL ET₀",
    description:
      "Pipeline extrair-validar-normalizar-carregar-agregar + ramo de cache com conectores reutilizáveis.",
  },
  {
    href: "/figura-09",
    title: "Figura 9 – Sequência ET₀",
    description:
      "Diagrama de sequência entre painel, APIs e módulos ET₀ com blocos ALT e cronogramas.",
  },
  {
    href: "/figura-10",
    title: "Figura 10 – Tempo de execução do ETL",
    description:
      "Série temporal p50/p95/p99 com marcações de reconsolidação D/D+1 e exportação vetorial.",
  },
  {
    href: "/figura-11",
    title: "Figura 11 – Sazonalidade ET₀",
    description:
      "Comparativo mensal por estação com faixas interquartil e médias anotadas entre agosto e outubro/2025.",
  },
  {
    href: "/figura-12",
    title: "Figura 12 – Latência das APIs",
    description:
      "Boxplots horizontais mostrando min/q1/p50/q3/p95/p99 por rota serverless Redeagromet.",
  },
  {
    href: "/figura-13",
    title: "Figura 13 – Estado do painel",
    description:
      "Snapshot operacional com cartões de SLA e gráfico bi-eixo (latência x disponibilidade).",
  },
  {
    href: "/figura-14",
    title: "Figura 14 – Pipeline GDD",
    description:
      "Estágios do cálculo de graus-dia acumulados mais derivações para fenologia e alertas.",
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
        <h1 className="text-3xl font-semibold text-[#FFFFFF]">
          Diagramas agroclimáticos interativos
        </h1>
        <p className="text-base leading-6 text-[#FFFFFF]/80">
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
