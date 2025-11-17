"use client";

import React, { useRef } from "react";

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

  return (
    <section
      ref={containerRef}
      className="relative space-y-6 rounded-3xl border border-[#d1d9e0] bg-white p-6 shadow-xl"
      aria-label="Figura 6 – Arquitetura lógica da Redeagromet"
      data-figure="6"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#1565c0]">Redeagromet</p>
          <h1 className="text-2xl font-semibold text-[#0f2747]">
            Arquitetura lógica: aquisição → ingestão → persistência → painel
          </h1>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border-2 border-[#1565c0] bg-white px-4 py-2 text-sm font-semibold text-[#0f2747] shadow-sm transition hover:bg-[#f5f5f5]"
            onClick={() => exportAsSVG(svgRef, "Figura06_Arquitetura.svg")}
          >
            Exportar SVG
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border-2 border-[#1565c0] bg-white px-4 py-2 text-sm font-semibold text-[#0f2747] shadow-sm transition hover:bg-[#f5f5f5]"
            onClick={() => void exportDiagramPDF(svgRef, containerRef, "Figura06_Arquitetura.pdf")}
          >
            Exportar PDF
          </button>
        </div>
      </div>

      <div className="space-y-5" data-export="lane-stack">
        <div ref={sensorsRef} className={laneClass} data-export="lane">
          <p className={laneLabelClass}>Sensores</p>
          <article className={cardClass}>
            <p className={cardTitleClass}>Estações automáticas WMO-No. 8</p>
            <p className={`${bodyTextClass} mt-2`}>
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
          <p className={laneLabelClass}>Fornecedores</p>
          <article className={cardClass}>
            <p className={cardTitleClass}>Conectores FTP / APIs</p>
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
          <p className={laneLabelClass}>Ingestão / ETL</p>
          <article className={cardClass}>
            <p className={cardTitleClass}>
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
          <p className={laneLabelClass}>Persistência</p>
          <article className={cardClass}>
            <p className={cardTitleClass}>Supabase / PostgreSQL (RLS + criptografia)</p>
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
          <p className={laneLabelClass}>APIs</p>
          <article className={cardClass}>
            <p className={cardTitleClass}>Rotas serverless (Next.js)</p>
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
          <p className={laneLabelClass}>Painel</p>
          <article className={cardClass}>
            <p className={cardTitleClass}>Aplicação Next.js (App Router, `/dashboard`, `/tools`)</p>
            <p className={`${bodyTextClass} mt-2`}>
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

      <svg
        ref={svgRef}
        className="pointer-events-none absolute inset-0 -z-10"
        width="100%"
        height="100%"
      >
        <defs>
          <marker id="fig6Arrow" markerWidth="16" markerHeight="9" refX="16" refY="4.5" orient="auto">
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
          .filter((item): item is { id: string; d: string } => typeof item.d === "string")
          .map((item) => (
            <path
              key={item.id}
              d={item.d}
              stroke="#1565c0"
              strokeWidth={2.5}
              fill="none"
              markerEnd="url(#fig6Arrow)"
              strokeLinecap="round"
            >
              <title>{item.id}</title>
            </path>
          ))}
      </svg>
    </section>
  );
}
