"use client";

import React, { useRef } from "react";

import { exportAsSVG, exportDiagramPDF } from "../figura-02/Figure02_Encadeamento";
import { useCurvedConnector, useVerticalConnector } from "../_components/diagramHooks";

const stepCardClass =
  "rounded-2xl border border-[#d6e3f2] bg-white px-6 py-5 shadow-sm";
const stepTitleClass = "text-lg font-semibold text-[#0f2747]";
const stepSubtitleClass = "text-sm font-semibold uppercase tracking-[0.2em] text-[#1565c0]";
const stepBodyClass = "text-sm text-[#0f2747]/85 leading-6";

export default function Figure08_FluxoETL() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const extractRef = useRef<HTMLDivElement | null>(null);
  const validateRef = useRef<HTMLDivElement | null>(null);
  const normalizeRef = useRef<HTMLDivElement | null>(null);
  const loadRef = useRef<HTMLDivElement | null>(null);
  const aggregateRef = useRef<HTMLDivElement | null>(null);
  const cacheRef = useRef<HTMLDivElement | null>(null);

  const pathExtractToValidate = useVerticalConnector(containerRef, extractRef, validateRef);
  const pathValidateToNormalize = useVerticalConnector(containerRef, validateRef, normalizeRef);
  const pathNormalizeToLoad = useVerticalConnector(containerRef, normalizeRef, loadRef);
  const pathLoadToAggregate = useVerticalConnector(containerRef, loadRef, aggregateRef);
  const pathValidateToCache = useCurvedConnector(containerRef, validateRef, cacheRef, {
    fromSide: "right",
    minDx: 120,
    offset: -10,
  });

  return (
    <section
      ref={containerRef}
      className="relative space-y-8 rounded-3xl border border-[#d1d9e0] bg-white p-6 shadow-xl"
      aria-label="Figura 8 – Fluxograma ETL Redeagromet"
      data-figure="8"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#1565c0]">Fluxo ETL</p>
          <h1 className="text-2xl font-semibold text-[#0f2747]">
            Extrair → Validar → Normalizar → Carregar → Agregar (ET₀ diária)
          </h1>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border-2 border-[#1565c0] bg-white px-4 py-2 text-sm font-semibold text-[#0f2747] shadow-sm transition hover:bg-[#f5f5f5]"
            onClick={() => exportAsSVG(svgRef, "Figura08_FluxoETL.svg")}
          >
            Exportar SVG
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border-2 border-[#1565c0] bg-white px-4 py-2 text-sm font-semibold text-[#0f2747] shadow-sm transition hover:bg-[#f5f5f5]"
            onClick={() => void exportDiagramPDF(svgRef, containerRef, "Figura08_FluxoETL.pdf")}
          >
            Exportar PDF
          </button>
        </div>
      </div>

      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_280px]">
        <div className="space-y-5" data-export="lane">
          <article className={stepCardClass} ref={extractRef}>
            <p className={stepSubtitleClass}>Extrair</p>
            <p className={stepTitleClass}>FTP e APIs</p>
            <p className={`${stepBodyClass} mt-2`}>
              `&lt;lib/ftpClient.ts&gt;` conecta em FTP Ativa/Sigma e APIs Plugfield; coleta leituras de Rs, T, UR, u₂, Pcp, ΔS e status.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[#0f2747]/80">
              <li>Agendamento CRON (cada 5 min).</li>
              <li>Fallback e reprocesso D+1 ao detectar lacunas.</li>
            </ul>
          </article>

          <article className={stepCardClass} ref={validateRef}>
            <p className={stepSubtitleClass}>Validar</p>
            <p className={stepTitleClass}>Formato e consistência</p>
            <p className={`${stepBodyClass} mt-2`}>
              Remove leituras fora de ordem, duplicadas, futuras ou fora das faixas físicas WMO (radiação, vento, pressão).
            </p>
            <div className="mt-3 grid gap-2 text-xs font-semibold uppercase text-[#1565c0] md:grid-cols-2">
              <span className="rounded-lg border border-[#cfe0f4] bg-white px-3 py-1">Ordenação temporal (Δt ≤ 5 min)</span>
              <span className="rounded-lg border border-[#cfe0f4] bg-white px-3 py-1">QA/QC (z-score adaptativo)</span>
            </div>
          </article>

          <article className={stepCardClass} ref={normalizeRef}>
            <p className={stepSubtitleClass}>Normalizar</p>
            <p className={stepTitleClass}>Schema e unidades</p>
            <p className={`${stepBodyClass} mt-2`}>
              Padroniza campos (SensorThings / JSON), converte para unidades SI (kPa, MJ m⁻²), anexa metadados (Thing, Datastream, ObservedProperty).
            </p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#1565c0]">
              `&lt;lib/etDatabase.ts&gt;` aplica upsert idempotente
            </p>
          </article>

          <article className={stepCardClass} ref={loadRef}>
            <p className={stepSubtitleClass}>Carregar</p>
            <p className={stepTitleClass}>Upsert no banco</p>
            <p className={`${stepBodyClass} mt-2`}>
              Persistência nas tabelas `weather_readings` (bruto) e `weather_readings_daily` (janela acumulada); garante idempotência via hash + chave composta.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[#0f2747]/80">
              <li>Registro de auditoria (usuario=cron).</li>
              <li>Confirmação no Supabase (RLS) e fila para cálculos.</li>
            </ul>
          </article>

          <article className={stepCardClass} ref={aggregateRef}>
            <p className={stepSubtitleClass}>Agregar</p>
            <p className={stepTitleClass}>Janela de 24 h (ET diária)</p>
            <p className={`${stepBodyClass} mt-2`}>
              `&lt;lib/et/calc.ts&gt;` consolida 288 amostras/dia, aplica Penman–Monteith (Equação 10) ou fallback (Equação 11) e grava em `daily_evapotranspiration`.
            </p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#1565c0]">
              Saída abastece `/api/chart-data` e `/api/export`
            </p>
          </article>
        </div>

        <article className={`${stepCardClass} lg:mt-20`} ref={cacheRef} data-export="lane">
          <p className={stepSubtitleClass}>Cache 5 minutos</p>
          <p className={stepTitleClass}>Leituras correntes</p>
          <p className={`${stepBodyClass} mt-2`}>
            `&lt;lib/etDatabase.ts&gt;` mantém `current_weather_cache` para o painel com TTL 5 min (Next.js RSC). Consumido por `/api/dashboard-snapshot`.
          </p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#fb8c00]">
            Atualização paralela, sem bloquear ET diária
          </p>
        </article>
      </div>

      <svg
        ref={svgRef}
        className="pointer-events-none absolute inset-0 -z-10"
        width="100%"
        height="100%"
      >
        <defs>
          <marker id="fig8ArrowPrimary" markerWidth="16" markerHeight="9" refX="16" refY="4.5" orient="auto">
            <polygon points="0 0, 16 4.5, 0 9" fill="#1565c0" />
          </marker>
          <marker id="fig8ArrowCache" markerWidth="16" markerHeight="9" refX="16" refY="4.5" orient="auto">
            <polygon points="0 0, 16 4.5, 0 9" fill="#fb8c00" />
          </marker>
        </defs>
        {[
          pathExtractToValidate,
          pathValidateToNormalize,
          pathNormalizeToLoad,
          pathLoadToAggregate,
        ]
          .filter((path): path is string => typeof path === "string")
          .map((d, index) => (
            <path
              key={`primary-${index}`}
              d={d}
              stroke="#1565c0"
              strokeWidth={2.4}
              fill="none"
              markerEnd="url(#fig8ArrowPrimary)"
              strokeLinecap="round"
            />
          ))}
        {pathValidateToCache && (
          <path
            d={pathValidateToCache}
            stroke="#fb8c00"
            strokeWidth={2.4}
            fill="none"
            markerEnd="url(#fig8ArrowCache)"
            strokeLinecap="round"
          />
        )}
      </svg>
    </section>
  );
}
