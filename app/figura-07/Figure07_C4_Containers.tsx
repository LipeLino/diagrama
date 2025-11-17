"use client";

import React, { useRef } from "react";

import { exportAsSVG, exportDiagramPDF } from "../figura-02/Figure02_Encadeamento";
import { useCurvedConnector } from "../_components/diagramHooks";

const boundaryClass =
  "relative rounded-3xl border-2 border-[#cfd9e8] bg-white/95 p-5 shadow-sm";
const boundaryLabelClass =
  "absolute -top-3 left-6 rounded-full border border-[#c5d3eb] bg-white px-3 py-0.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#0f2747]";
const cardClass = "rounded-2xl border border-[#d7e3f4] bg-[#fafdff] px-5 py-4 shadow-sm";
const cardTitleClass = "text-base font-semibold text-[#0f2747]";
const bodyTextClass = "text-sm text-[#0f2747]/80 leading-6";

const COLORS = {
  flowData: "#1565c0",
  flowCalc: "#7c3aed",
  flowApi: "#fb8c00",
};

export default function Figure07_C4_Containers() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const sourcesCardRef = useRef<HTMLDivElement | null>(null);
  const ingestionCardRef = useRef<HTMLDivElement | null>(null);
  const calcCardRef = useRef<HTMLDivElement | null>(null);
  const storageCardRef = useRef<HTMLDivElement | null>(null);
  const apiCardRef = useRef<HTMLDivElement | null>(null);
  const appCardRef = useRef<HTMLDivElement | null>(null);

  const pathSourcesToIngestion = useCurvedConnector(containerRef, sourcesCardRef, ingestionCardRef, { minDx: 120 });
  const pathIngestionToStorage = useCurvedConnector(containerRef, ingestionCardRef, storageCardRef, { minDx: 100 });
  const pathIngestionToCalc = useCurvedConnector(containerRef, ingestionCardRef, calcCardRef, { minDx: 60, offset: -20 });
  const pathCalcToStorage = useCurvedConnector(containerRef, calcCardRef, storageCardRef, { minDx: 80, offset: 18 });
  const pathStorageToApi = useCurvedConnector(containerRef, storageCardRef, apiCardRef, { minDx: 100 });
  const pathApiToApp = useCurvedConnector(containerRef, apiCardRef, appCardRef, { minDx: 160, offset: 10 });

  return (
    <section
      ref={containerRef}
      className="relative space-y-6 rounded-3xl border border-[#d1d9e0] bg-white p-6 shadow-xl"
      aria-label="Figura 7 – Arquitetura lógica C4 em contêineres"
      data-figure="7"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#1565c0]">Redeagromet \ C4 – Contêineres</p>
          <h1 className="text-2xl font-semibold text-[#0f2747]">
            Fontes externas → Ingestão/ETL → Supabase → APIs → Next.js
          </h1>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border-2 border-[#1565c0] bg-white px-4 py-2 text-sm font-semibold text-[#0f2747] shadow-sm transition hover:bg-[#f5f5f5]"
            onClick={() => exportAsSVG(svgRef, "Figura07_C4.svg")}
          >
            Exportar SVG
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border-2 border-[#1565c0] bg-white px-4 py-2 text-sm font-semibold text-[#0f2747] shadow-sm transition hover:bg-[#f5f5f5]"
            onClick={() => void exportDiagramPDF(svgRef, containerRef, "Figura07_C4.pdf")}
          >
            Exportar PDF
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_2fr]" data-export="lane">
        <div className={boundaryClass} data-export="lane">
          <span className={boundaryLabelClass}>Zona externa</span>
          <article className={cardClass} ref={sourcesCardRef}>
            <p className={cardTitleClass}>Fontes FTP / APIs</p>
            <p className={`${bodyTextClass} mt-2`}>
              FTP Ativa (FRUTALMT/FRUTALAG) e Sigma (FRUTALAPI) + APIs Plugfield (3424, 4971, 9400, 9453) e sensores auxiliares.
            </p>
            <div className="mt-3 grid gap-2 text-xs font-semibold uppercase text-[#1565c0]">
              <span className="rounded-full border border-[#cfe0f4] px-3 py-1">Autenticação FTP + CRON_SECRET</span>
              <span className="rounded-full border border-[#cfe0f4] px-3 py-1">Tokens httpOnly (APIs)</span>
            </div>
          </article>
        </div>

        <div className={boundaryClass} data-export="lane">
          <span className={`${boundaryLabelClass} left-6`}>Backend Redeagromet</span>
          <div className="grid gap-4 md:grid-cols-2">
            <article className={`${cardClass} col-span-2`} ref={ingestionCardRef}>
              <p className={cardTitleClass}>Ingestão / ETL (`&lt;lib/ftpClient.ts&gt;` + `&lt;infra/aws/cron.ts&gt;`)</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#0f2747]/85">
                <li>Consumo FTP/API, validação de assinatura temporal e deduplicação idempotente.</li>
                <li>Normalização SensorThings, preenchimento de gaps e QA/QC (faixas WMO).</li>
                <li>Publica eventos para cálculo agroclimático (ET₀, BH, GDD).</li>
              </ul>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold uppercase text-[#1565c0]">
                <span className="rounded-full border border-[#cfe0f4] px-3 py-1">CRON_SECRET</span>
                <span className="rounded-full border border-[#cfe0f4] px-3 py-1">Idempotência: hash do payload</span>
                <span className="rounded-full border border-[#cfe0f4] px-3 py-1">Reprocesso automático (janela D-1)</span>
              </div>
            </article>
            <article className={`${cardClass} col-span-1`} ref={calcCardRef}>
              <p className={cardTitleClass}>{`&lt;lib/et/calc.ts&gt;`}</p>
              <p className={`${bodyTextClass} mt-2`}>
                Implementa Penman–Monteith, Equation 10/11 (fallback) e gera `daily_evapotranspiration`/`weather_calculations`.
              </p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#7c3aed]">
                Dependências: cache meteorológico / tabela horária
              </p>
            </article>
            <article className={`${cardClass} col-span-1`} ref={storageCardRef}>
              <p className={cardTitleClass}>Supabase / PostgreSQL</p>
              <ul className="mt-2 space-y-1 text-sm text-[#0f2747]/85">
                <li>`weather_readings` (Hz 1/5 min)</li>
                <li>`weather_readings_daily`</li>
                <li>`weather_calculations`</li>
                <li>`daily_evapotranspiration`</li>
                <li>`current_weather_cache`</li>
              </ul>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#1565c0]">
                RLS + backup incremental + auditoria
              </p>
            </article>
            <article className={`${cardClass} col-span-2`} ref={apiCardRef}>
              <p className={cardTitleClass}>Serviços de API (Next.js / serverless)</p>
              <div className="mt-2 grid gap-2 text-sm text-[#0f2747] md:grid-cols-2">
                {[
                  "/api/chart-data",
                  "/api/export",
                  "/api/export-enhanced",
                  "/api/dashboard-snapshot",
                  "/api/weather-proxy",
                  "/api/weather-calculations/query",
                ].map((route) => (
                  <span key={route} className="rounded-lg border border-[#cfe0f4] bg-white px-3 py-1 font-medium">
                    {route}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#fb8c00]">
                Cookies httpOnly + assinatura HMAC para exportações
              </p>
            </article>
          </div>
        </div>
      </div>

      <div className={`${boundaryClass} border-dashed`} data-export="lane">
        <span className={boundaryLabelClass}>Frontend (Next.js)</span>
        <article className={cardClass} ref={appCardRef}>
          <p className={cardTitleClass}>Aplicação Next.js (`/dashboard`, `/tools`)</p>
          <p className={`${bodyTextClass} mt-2`}>
            Renderiza painéis agroclimáticos, exportação vetorial e tarefas administrativas. Integra com Supabase Auth, cookies httpOnly e métricas de disponibilidade.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold uppercase text-[#0f2747]">
            <span className="rounded-full border border-[#cfe0f4] px-3 py-1">SSR + streaming</span>
            <span className="rounded-full border border-[#cfe0f4] px-3 py-1">Alertas Push</span>
            <span className="rounded-full border border-[#cfe0f4] px-3 py-1">Produtores / Pesquisadores</span>
          </div>
        </article>
      </div>

      <svg
        ref={svgRef}
        className="pointer-events-none absolute inset-0 -z-10"
        width="100%"
        height="100%"
      >
        <defs>
          <marker id="fig7ArrowData" markerWidth="16" markerHeight="9" refX="16" refY="4.5" orient="auto">
            <polygon points="0 0, 16 4.5, 0 9" fill={COLORS.flowData} />
          </marker>
          <marker id="fig7ArrowCalc" markerWidth="16" markerHeight="9" refX="16" refY="4.5" orient="auto">
            <polygon points="0 0, 16 4.5, 0 9" fill={COLORS.flowCalc} />
          </marker>
          <marker id="fig7ArrowApi" markerWidth="16" markerHeight="9" refX="16" refY="4.5" orient="auto">
            <polygon points="0 0, 16 4.5, 0 9" fill={COLORS.flowApi} />
          </marker>
        </defs>
        {[
          { id: "sources-ingestion", d: pathSourcesToIngestion, color: COLORS.flowData, marker: "fig7ArrowData" },
          { id: "ingestion-storage", d: pathIngestionToStorage, color: COLORS.flowData, marker: "fig7ArrowData" },
          { id: "ingestion-calc", d: pathIngestionToCalc, color: COLORS.flowCalc, marker: "fig7ArrowCalc" },
          { id: "calc-storage", d: pathCalcToStorage, color: COLORS.flowCalc, marker: "fig7ArrowCalc" },
          { id: "storage-api", d: pathStorageToApi, color: COLORS.flowData, marker: "fig7ArrowData" },
          { id: "api-app", d: pathApiToApp, color: COLORS.flowApi, marker: "fig7ArrowApi" },
        ]
          .filter(
            (connector): connector is { id: string; d: string; color: string; marker: string } => typeof connector.d === "string",
          )
          .map((connector) => (
            <path
              key={connector.id}
              d={connector.d}
              stroke={connector.color}
              strokeWidth={2.4}
              fill="none"
              markerEnd={`url(#${connector.marker})`}
              strokeLinecap="round"
            >
              <title>{connector.id}</title>
            </path>
          ))}
      </svg>
    </section>
  );
}
