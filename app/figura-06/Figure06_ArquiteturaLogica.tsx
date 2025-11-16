"use client";

import React, { useEffect, useRef, useState } from "react";

import { exportAsSVG, exportDiagramPDF } from "../figura-02/Figure02_Encadeamento";
import { useVerticalConnector } from "../_components/diagramHooks";

const laneClass =
  "grid grid-cols-[200px_minmax(0,1fr)] gap-6 rounded-2xl border border-[#d1d9e0] bg-white/95 p-6 shadow-sm";
const laneLabelClass =
  "text-sm font-semibold uppercase tracking-[0.18em] text-[#0f2747] flex items-center";
const cardClass = "rounded-2xl border border-[#d6e3f2] bg-[#fafdff] px-6 py-5 shadow-sm";
const cardTitleClass = "text-base font-semibold text-[#0f2747]";
const bodyTextClass = "text-sm text-[#0f2747]/80 leading-6";

const ingestionBullets = [
  "Validação de formato, ordenação temporal e faixas WMO (Δt ≤ 5 min)",
  "Normalização para schema SensorThings/OGC",
  "Agregação horária e diária com janelas fixas",
  "Idempotência em `&lt;lib/ftpClient.ts&gt;` (hash + CRON_SECRET)"
];

const dbTables = [
  "weather_readings – leituras brutas (1 min / 5 min)",
  "weather_readings_daily – agregados diários QA/QC",
  "weather_calculations – variáveis derivadas (u2, es, ea)",
  "daily_evapotranspiration – ET₀ Penman–Monteith",
  "current_weather_cache – cache 5 min para painel"
];

const apiRoutes = [
  "/api/chart-data",
  "/api/export",
  "/api/export-enhanced",
  "/api/dashboard-snapshot",
  "/api/weather-proxy",
  "/api/weather-calculations/query",
];

export default function Figure06_ArquiteturaLogica() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1, height: 1 });
  
  const sensorsRef = useRef<HTMLDivElement | null>(null);
  const providersRef = useRef<HTMLDivElement | null>(null);
  const ingestionRef = useRef<HTMLDivElement | null>(null);
  const databaseRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const pathSensorsToProviders = useVerticalConnector(containerRef, sensorsRef, providersRef);
  const pathProvidersToIngestion = useVerticalConnector(containerRef, providersRef, ingestionRef);
  const pathIngestionToDb = useVerticalConnector(containerRef, ingestionRef, databaseRef);
  const pathDbToApi = useVerticalConnector(containerRef, databaseRef, apiRef);
  const pathApiToPanel = useVerticalConnector(containerRef, apiRef, panelRef);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    setCanvasSize({ width: rect.width, height: rect.height });
  }, []);

  const svgWidth = canvasSize.width || 1;
  const svgHeight = canvasSize.height || 1;

  return (
    <section
      className="w-full bg-linear-to-br from-[#fafbfc] to-[#f5f7fa] py-12"
      aria-label="Figura 6 – Arquitetura lógica da Redeagromet"
      data-figure="6"
    >
      <div className="mx-auto flex w-full flex-col gap-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between border-b-2 border-[#d1d9e0] pb-6">
          <header className="max-w-3xl space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#1565c0]">Redeagromet</p>
            <h1 className="text-3xl font-bold text-[#1a2332] tracking-tight">
              Figura 6 – Arquitetura lógica: aquisição → ingestão → persistência → painel
            </h1>
            <p className="text-base text-[#37474f] leading-relaxed">
              Fluxo completo desde sensores físicos até o painel web, com camadas de validação, normalização e conformidade com padrões WMO e OGC.
            </p>
          </header>
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border-2 border-[#1565c0] bg-white px-5 py-2.5 text-sm font-semibold text-[#1565c0] shadow-sm hover:bg-[#f5f5f5] transition-colors"
              onClick={() => exportAsSVG(svgRef, "Figura06_Arquitetura.svg")}
            >
              Exportar SVG
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border-2 border-[#1565c0] bg-white px-5 py-2.5 text-sm font-semibold text-[#1565c0] shadow-sm hover:bg-[#f5f5f5] transition-colors"
              onClick={() => void exportDiagramPDF(svgRef, containerRef, "Figura06_Arquitetura.pdf")}
            >
              Exportar PDF
            </button>
          </div>
        </div>

        <div className="relative" aria-describedby="fig6-caption">
          <div ref={containerRef} className="relative">
            <svg
              ref={svgRef}
              width={svgWidth}
              height={svgHeight}
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="pointer-events-none absolute inset-0 z-20 overflow-visible"
              shapeRendering="geometricPrecision"
              role="presentation"
              aria-hidden="true"
            >
              <defs>
                <marker id="fig6Arrow" markerWidth="16" markerHeight="9" refX="16" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
                  <polygon points="0 0, 16 4.5, 0 9" fill="#1565c0" />
                </marker>
              </defs>
              {[
                { id: "sensors-providers", d: pathSensorsToProviders },
                { id: "providers-ingestion", d: pathProvidersToIngestion },
                { id: "ingestion-db", d: pathIngestionToDb },
                { id: "db-api", d: pathDbToApi },
                { id: "api-panel", d: pathApiToPanel },
              ]
                .filter((item) => item.d)
                .map((item) => (
                  <path
                    key={item.id}
                    d={item.d}
                    stroke="#1565c0"
                    strokeWidth={2.5}
                    fill="none"
                    markerEnd="url(#fig6Arrow)"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  >
                    <title>{item.id}</title>
                  </path>
                ))}
            </svg>

      <div className="space-y-5">
        <div ref={sensorsRef} className={laneClass} data-export="lane">
          <p className={laneLabelClass} data-export="lane-title">Sensores</p>
          <article className={cardClass} data-export-card="layer" data-export-card-id="sensores">
            <p className={cardTitleClass} data-export="card-title">Estações automáticas WMO-No. 8</p>
            <p className={`${bodyTextClass} mt-2`} data-export="card-description">
              Pluviômetro aquecido, radiação, temperatura/umidade, vento (u₂), pressão, status operacional e indicadores de manutenção.
            </p>
            <div className="mt-3 grid gap-2 text-sm text-[#0f2747] md:grid-cols-2">
              <span className="rounded-lg border border-[#cfe0f4] bg-white px-3 py-1 font-medium">Plugfield – ID 4971 / 3424 / 9400 / 9453</span>
              <span className="rounded-lg border border-[#cfe0f4] bg-white px-3 py-1 font-medium">FTP Ativa – FRUTALMT / FRUTALAG</span>
              <span className="rounded-lg border border-[#cfe0f4] bg-white px-3 py-1 font-medium">Sigma – FRUTALAPI</span>
              <span className="rounded-lg border border-[#cfe0f4] bg-white px-3 py-1 font-medium">Indicadores operacionais (energia, deltaP)</span>
            </div>
          </article>
        </div>

        <div ref={providersRef} className={laneClass} data-export="lane">
          <p className={laneLabelClass} data-export="lane-title">Fornecedores</p>
          <article className={cardClass} data-export-card="layer" data-export-card-id="fornecedores">
            <p className={cardTitleClass} data-export="card-title">Conectores FTP / APIs</p>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-[#0f2747]/85">
              <li>FTP (Ativa, Sigma) com autenticação dedicada e CRON_SECRET.</li>
              <li>APIs Plugfield/OGC SensorThings com tokens httpOnly.</li>
              <li>Fallback satélite/orbital (precipitação e solo).</li>
            </ul>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#1565c0]">
              Outbound seguro → `&lt;infra/aws/s3-ingest&gt;`
            </p>
          </article>
        </div>

        <div ref={ingestionRef} className={laneClass} data-export="lane">
          <p className={laneLabelClass} data-export="lane-title">Ingestão / ETL</p>
          <article className={cardClass} data-export-card="layer" data-export-card-id="ingestao">
            <p className={cardTitleClass} data-export="card-title">
              Funções serverless + `&lt;lib/ftpClient.ts&gt;` + `&lt;lib/et/calc.ts&gt;`
            </p>
            <ul className="mt-3 space-y-2 text-sm text-[#0f2747]/85">
              {ingestionBullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-[#1565c0]" aria-hidden="true" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#1565c0]">
              Validação → normalização → agregação → publicação (SensorThings)
            </p>
          </article>
        </div>

        <div ref={databaseRef} className={laneClass} data-export="lane">
          <p className={laneLabelClass} data-export="lane-title">Persistência</p>
          <article className={cardClass} data-export-card="layer" data-export-card-id="persistencia">
            <p className={cardTitleClass} data-export="card-title">Supabase / PostgreSQL (RLS + criptografia)</p>
            <ul className="mt-3 grid gap-2 text-sm text-[#0f2747] md:grid-cols-2">
              {dbTables.map((table) => (
                <li key={table} className="rounded-lg border border-[#cfe0f4] bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em]">
                  {table}
                </li>
              ))}
            </ul>
          </article>
        </div>

        <div ref={apiRef} className={laneClass} data-export="lane">
          <p className={laneLabelClass} data-export="lane-title">APIs</p>
          <article className={cardClass} data-export-card="layer" data-export-card-id="apis">
            <p className={cardTitleClass} data-export="card-title">Rotas serverless (Next.js)</p>
            <div className="mt-3 grid gap-2 text-sm text-[#0f2747] md:grid-cols-2">
              {apiRoutes.map((route) => (
                <span key={route} className="rounded-lg border border-[#cfe0f4] bg-white px-3 py-1 font-semibold">
                  {route}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#1565c0]">
              Cookies httpOnly + rate limiting → painel / integrações
            </p>
          </article>
        </div>

        <div ref={panelRef} className={laneClass} data-export="lane">
          <p className={laneLabelClass} data-export="lane-title">Painel</p>
          <article className={cardClass} data-export-card="layer" data-export-card-id="painel">
            <p className={cardTitleClass} data-export="card-title">Aplicação Next.js (App Router, `/dashboard`, `/tools`)</p>
            <p className={`${bodyTextClass} mt-2`} data-export="card-description">
              Renderização híbrida (SSR + streaming) com exportação vetorial e widgets de disponibilidade, ET₀ e alertas. Público alvo: produtores, pesquisadores e operações.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold uppercase text-[#1565c0]">
              <span className="rounded-full border border-[#cfe0f4] px-3 py-1">Produtores (pivô / gotejamento)</span>
              <span className="rounded-full border border-[#cfe0f4] px-3 py-1">Pesquisadores (FAEPE / IFTM)</span>
              <span className="rounded-full border border-[#cfe0f4] px-3 py-1">Operações Redeagromet</span>
            </div>
          </article>
        </div>
      </div>

      <footer id="fig6-caption" className="mt-6 rounded-xl border border-[#d1d9e0] bg-white/90 px-5 py-4" data-export="legend">
        <h2 className="text-sm font-bold text-[#1a2332] mb-2" data-export="legend-text">Legenda</h2>
        <p className="text-sm text-[#37474f] leading-6" data-export="legend-paragraph">
          Fluxo vertical: dados fluem de sensores físicos através de fornecedores, passam por ingestão/ETL, são persistidos no banco de dados, expostos via APIs e finalmente consumidos no painel web. Cada camada garante validação, normalização e conformidade com padrões (WMO-No. 8, OGC SensorThings).
        </p>
      </footer>
          </div>
        </div>
      </div>
    </section>
  );
}
