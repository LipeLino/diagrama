"use client";

import React, { useRef } from "react";

import { exportAsSVG, exportDiagramPDF } from "../figura-02/Figure02_Encadeamento";
import { useCurvedConnector, useVerticalConnector } from "../_components/diagramHooks";
import type { PipelineStage } from "../../types/figureModels";

const stageCardClass = "rounded-2xl border border-[#d6e3f2] bg-white px-6 py-5 shadow-sm";
const stageTitleClass = "text-lg font-semibold text-[#0f2747]";
const stageSubtitleClass = "text-xs font-semibold uppercase tracking-[0.3em] text-[#1565c0]";
const stageBodyClass = "text-sm text-[#0f2747]/80 leading-6";

const gddStages: PipelineStage[] = [
  {
    id: "sensores",
    title: "Captação horária",
    description: "Tmax, Tmin, Tmedia e hora solar padronizados (SensorThings).",
    moduleRef: "&lt;lib/gdd/sensors.ts&gt;",
  },
  {
    id: "normalizar",
    title: "Normalizar base térmica",
    description: "Limita valores à faixa física (−10 °C a 50 °C) e aplica base 10 °C / teto 34 °C.",
    moduleRef: "&lt;lib/gdd/normalize.ts&gt;",
  },
  {
    id: "calcular",
    title: "Cálculo GDD parcial",
    description: "GDD = ((Tmax + Tmin)/2) − Tbase (&gt;= 0); fallback Thornthwaite para lacunas.",
    moduleRef: "&lt;lib/gdd/calc.ts&gt;",
  },
  {
    id: "acumular",
    title: "Acúmulo sazonal",
    description: "Somatório diário com janelas móveis (plantio, V6, VT, R1, R6).",
    moduleRef: "&lt;lib/gdd/storage.ts&gt;",
  },
  {
    id: "expor",
    title: "Expor APIs / painel",
    description: "Rotas `/api/gdd-series`, `/api/gdd-thresholds` e widgets no painel (RSC).",
    moduleRef: "Next.js route handlers",
  },
];

export default function Figure14_PipelineGDD() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const sensoresRef = useRef<HTMLDivElement | null>(null);
  const normalizarRef = useRef<HTMLDivElement | null>(null);
  const calcularRef = useRef<HTMLDivElement | null>(null);
  const acumularRef = useRef<HTMLDivElement | null>(null);
  const exporRef = useRef<HTMLDivElement | null>(null);
  const fenologiaRef = useRef<HTMLDivElement | null>(null);
  const alertasRef = useRef<HTMLDivElement | null>(null);

  const pathSensoresToNormalizar = useVerticalConnector(containerRef, sensoresRef, normalizarRef);
  const pathNormalizarToCalcular = useVerticalConnector(containerRef, normalizarRef, calcularRef);
  const pathCalcularToAcumular = useVerticalConnector(containerRef, calcularRef, acumularRef);
  const pathAcumularToExpor = useVerticalConnector(containerRef, acumularRef, exporRef);

  const pathAcumularToFenologia = useCurvedConnector(containerRef, acumularRef, fenologiaRef, {
    fromSide: "right",
    offset: -12,
    minDx: 160,
  });
  const pathFenologiaToAlertas = useVerticalConnector(containerRef, fenologiaRef, alertasRef);
  const pathExporToAlertas = useCurvedConnector(containerRef, exporRef, alertasRef, {
    fromSide: "right",
    offset: 12,
    minDx: 140,
  });

  const vignetteBullets = [
    "Operação diária em D+0 para milho (base 10 °C).",
    "Fallback D+1 reprocessa lacunas ou dados de estações vizinhas.",
    "Alertas de estádio fenológico geram notificações no painel e exportação CSV.",
  ];

  return (
    <section
      ref={containerRef}
      className="space-y-6 rounded-3xl border border-[#d1d9e0] bg-white p-6 shadow-xl"
      aria-label="Figura 14 – Pipeline GDD Redeagromet"
      data-figure="14"
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#1565c0]">GDD (Growing Degree Days)</p>
          <h1 className="text-2xl font-semibold text-[#0f2747]">Pipeline de cálculo e exposição de graus-dia acumulados</h1>
          <p className="text-sm text-[#0f2747]/75">Integra sensores, normalização térmica, cálculo parcial, acúmulo sazonal e entrega em APIs / painel.</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border-2 border-[#1565c0] bg-white px-4 py-2 text-sm font-semibold text-[#0f2747] shadow-sm transition hover:bg-[#f5f5f5]"
            onClick={() => exportAsSVG(svgRef, "Figura14_PipelineGDD.svg")}
          >
            Exportar SVG
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border-2 border-[#1565c0] bg-white px-4 py-2 text-sm font-semibold text-[#0f2747] shadow-sm transition hover:bg-[#f5f5f5]"
            onClick={() => void exportDiagramPDF(svgRef, containerRef, "Figura14_PipelineGDD.pdf")}
          >
            Exportar PDF
          </button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5" data-export="lane">
          <article ref={sensoresRef} className={stageCardClass}>
            <p className={stageSubtitleClass}>Etapa 1</p>
            <p className={stageTitleClass}>{gddStages[0].title}</p>
            <p className={`${stageBodyClass} mt-2`}>{gddStages[0].description}</p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#0f2747]/60">{gddStages[0].moduleRef}</p>
          </article>
          <article ref={normalizarRef} className={stageCardClass}>
            <p className={stageSubtitleClass}>Etapa 2</p>
            <p className={stageTitleClass}>{gddStages[1].title}</p>
            <p className={`${stageBodyClass} mt-2`}>{gddStages[1].description}</p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#0f2747]/60">{gddStages[1].moduleRef}</p>
          </article>
          <article ref={calcularRef} className={stageCardClass}>
            <p className={stageSubtitleClass}>Etapa 3</p>
            <p className={stageTitleClass}>{gddStages[2].title}</p>
            <p className={`${stageBodyClass} mt-2`}>{gddStages[2].description}</p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[#0f2747]/75">
              <li>Modo integral (Tmax+Tmin)/2 ou hourly if &gt;= 12 leituras.</li>
              <li>Compatível com FAO-56 e recomendações Embrapa milho.</li>
            </ul>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#0f2747]/60">{gddStages[2].moduleRef}</p>
          </article>
          <article ref={acumularRef} className={stageCardClass}>
            <p className={stageSubtitleClass}>Etapa 4</p>
            <p className={stageTitleClass}>{gddStages[3].title}</p>
            <p className={`${stageBodyClass} mt-2`}>{gddStages[3].description}</p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#0f2747]/60">{gddStages[3].moduleRef}</p>
          </article>
          <article ref={exporRef} className={stageCardClass}>
            <p className={stageSubtitleClass}>Etapa 5</p>
            <p className={stageTitleClass}>{gddStages[4].title}</p>
            <p className={`${stageBodyClass} mt-2`}>{gddStages[4].description}</p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#0f2747]/60">{gddStages[4].moduleRef}</p>
          </article>
        </div>

        <div className="flex flex-col gap-5" data-export="lane">
          <article ref={fenologiaRef} className={`${stageCardClass} bg-[#f6fbff]`}>
            <p className={stageSubtitleClass}>Aplicação fenológica</p>
            <p className={stageTitleClass}>Modelos de estádios (V1 → R6)</p>
            <p className={`${stageBodyClass} mt-2`}>
              Consolida GDD acumulado e compara com curvas de referência (milho safra 2024/25). Informa previsão de mudança de estádio em +/- 48 h.
            </p>
            <ul className="mt-3 grid gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#1565c0]">
              <li>Dataset `gdd_milestone_reference`</li>
              <li>Função `&lt;lib/gdd/fenologia.ts&gt;`</li>
            </ul>
          </article>

          <article ref={alertasRef} className={`${stageCardClass} bg-[#fff9f4]`}>
            <p className={stageSubtitleClass}>Alertas / outputs</p>
            <p className={stageTitleClass}>Alertas GDD + dashboards</p>
            <p className={`${stageBodyClass} mt-2`}>
              Notifica produtores quando o acumulado se aproxima de thresholds (ex.: GDD 780 → pré-pendoamento). Exporta CSV/PDF e alimenta `/tools/gdd`.
            </p>
            <div className="mt-3 grid gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#f97316]">
              <span>Jobs CRON `alert-gdd`</span>
              <span>Webhook painel + email</span>
            </div>
          </article>

          <div className="rounded-2xl border border-[#d6e3f2] bg-white px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#1565c0]">Notas operacionais</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#0f2747]/80">
              {vignetteBullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <svg ref={svgRef} className="pointer-events-none absolute inset-0 -z-10" width="100%" height="100%">
        <defs>
          <marker id="fig14Arrow" markerWidth="16" markerHeight="9" refX="16" refY="4.5" orient="auto">
            <polygon points="0 0, 16 4.5, 0 9" fill="#1565c0" />
          </marker>
          <marker id="fig14ArrowAccent" markerWidth="16" markerHeight="9" refX="16" refY="4.5" orient="auto">
            <polygon points="0 0, 16 4.5, 0 9" fill="#f97316" />
          </marker>
        </defs>
        {[pathSensoresToNormalizar, pathNormalizarToCalcular, pathCalcularToAcumular, pathAcumularToExpor]
          .filter((path): path is string => typeof path === "string")
          .map((d, index) => (
            <path
              key={`main-${index}`}
              d={d}
              stroke="#1565c0"
              strokeWidth={2.4}
              fill="none"
              markerEnd="url(#fig14Arrow)"
              strokeLinecap="round"
            />
          ))}
        {pathAcumularToFenologia && (
          <path d={pathAcumularToFenologia} stroke="#0ea5e9" strokeWidth={2.4} fill="none" markerEnd="url(#fig14Arrow)" strokeLinecap="round" />
        )}
        {pathFenologiaToAlertas && (
          <path d={pathFenologiaToAlertas} stroke="#0ea5e9" strokeWidth={2.4} fill="none" markerEnd="url(#fig14Arrow)" strokeLinecap="round" />
        )}
        {pathExporToAlertas && (
          <path d={pathExporToAlertas} stroke="#f97316" strokeWidth={2.4} fill="none" markerEnd="url(#fig14ArrowAccent)" strokeLinecap="round" />
        )}
      </svg>
    </section>
  );
}
