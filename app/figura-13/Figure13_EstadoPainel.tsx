"use client";

import React, { useMemo, useRef } from "react";

import { exportAsSVG, exportDiagramPDF } from "../figura-02/Figure02_Encadeamento";
import type { PanelCardSnapshot, PanelChartSeries, PanelSnapshotMetadata } from "../../types/figureModels";

const snapshotMeta: PanelSnapshotMetadata = {
  station: "Redeagromet – Triângulo Sul",
  collectedAt: "2025-10-31T09:15:00-03:00",
};

const panelCards: PanelCardSnapshot[] = [
  {
    id: "availability",
    title: "Disponibilidade 24 h",
    value: "99,3%",
    subtitle: "SLA 99%",
    status: "ok",
  },
  {
    id: "alerts",
    title: "Alertas ativos",
    value: "3",
    subtitle: "2 manutenção, 1 comunicação",
    status: "degradado",
  },
  {
    id: "cache",
    title: "Cache 5 min",
    value: "Atualizado 02:55",
    subtitle: "TTL 5 min, 0 falhas",
    status: "ok",
  },
  {
    id: "etl",
    title: "ET₀ diária",
    value: "Concluída às 04:12",
    subtitle: "Processo D+0 (Penman–Monteith)",
    status: "ok",
  },
  {
    id: "export",
    title: "Exportações",
    value: "17 requisições",
    subtitle: "Última às 08:40",
    status: "alerta",
  },
];

const chartSeries: PanelChartSeries[] = [
  {
    id: "latencia",
    label: "Latência média (ms)",
    color: "#1565c0",
    points: [
      { x: "2025-10-31T00:00:00Z", y: 280 },
      { x: "2025-10-31T02:00:00Z", y: 265 },
      { x: "2025-10-31T04:00:00Z", y: 250 },
      { x: "2025-10-31T06:00:00Z", y: 275 },
      { x: "2025-10-31T08:00:00Z", y: 295 },
      { x: "2025-10-31T10:00:00Z", y: 310 },
      { x: "2025-10-31T12:00:00Z", y: 300 },
    ],
  },
  {
    id: "disponibilidade",
    label: "Disponibilidade instantânea (%)",
    color: "#22c55e",
    points: [
      { x: "2025-10-31T00:00:00Z", y: 99.7 },
      { x: "2025-10-31T02:00:00Z", y: 99.6 },
      { x: "2025-10-31T04:00:00Z", y: 99.8 },
      { x: "2025-10-31T06:00:00Z", y: 99.5 },
      { x: "2025-10-31T08:00:00Z", y: 99.2 },
      { x: "2025-10-31T10:00:00Z", y: 99.4 },
      { x: "2025-10-31T12:00:00Z", y: 99.6 },
    ],
  },
];

const chartDims = { width: 920, height: 380, margin: { top: 60, right: 80, bottom: 60, left: 70 } };

const statusStyles: Record<NonNullable<PanelCardSnapshot["status"]>, { bg: string; text: string; border: string }> = {
  ok: { bg: "#ecfdf5", text: "#047857", border: "#a7f3d0" },
  degradado: { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
  alerta: { bg: "#fef2f2", text: "#b91c1c", border: "#fecaca" },
};

export default function Figure13_EstadoPainel() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const formattedTimestamp = useMemo(() => {
    try {
      return new Date(snapshotMeta.collectedAt).toLocaleString("pt-BR", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return snapshotMeta.collectedAt;
    }
  }, []);

  const timeExtent = useMemo(() => {
    const times = chartSeries.flatMap((series) => series.points.map((point) => new Date(point.x).getTime()));
    return {
      min: Math.min(...times),
      max: Math.max(...times),
    };
  }, []);

  const leftExtent = useMemo(() => {
    const points = chartSeries.find((series) => series.id === "latencia")?.points ?? [];
    const values = points.map((point) => point.y);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return { min: Math.floor(min / 10) * 10 - 10, max: Math.ceil(max / 10) * 10 + 10 };
  }, []);

  const rightExtent = useMemo(() => {
    const points = chartSeries.find((series) => series.id === "disponibilidade")?.points ?? [];
    const values = points.map((point) => point.y);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return { min: Math.floor((min - 0.2) * 10) / 10, max: Math.ceil((max + 0.2) * 10) / 10 };
  }, []);

  const xScale = (iso: string) => {
    const t = new Date(iso).getTime();
    const ratio = (t - timeExtent.min) / (timeExtent.max - timeExtent.min);
    return chartDims.margin.left + ratio * (chartDims.width - chartDims.margin.left - chartDims.margin.right);
  };

  const yScaleLeft = (value: number) => {
    const ratio = (value - leftExtent.min) / (leftExtent.max - leftExtent.min);
    return chartDims.height - chartDims.margin.bottom - ratio * (chartDims.height - chartDims.margin.top - chartDims.margin.bottom);
  };

  const yScaleRight = (value: number) => {
    const ratio = (value - rightExtent.min) / (rightExtent.max - rightExtent.min);
    return chartDims.height - chartDims.margin.bottom - ratio * (chartDims.height - chartDims.margin.top - chartDims.margin.bottom);
  };

  const buildPath = (series: PanelChartSeries) => {
    const isLeftAxis = series.id === "latencia";
    return series.points
      .map((point, index) => {
        const x = xScale(point.x).toFixed(2);
        const y = (isLeftAxis ? yScaleLeft(point.y) : yScaleRight(point.y)).toFixed(2);
        return `${index === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  };

  const observations = [
    "Alertas se concentram em exportações (sobrecarga de `/api/export`).",
    "Latência média manteve-se < 320 ms nas últimas 12 h.",
    "Disponibilidade permaneceu acima do SLA de 99,0% mesmo durante janelas de manutenção.",
  ];

  return (
    <section
      ref={containerRef}
      className="space-y-6 rounded-3xl border border-[#d1d9e0] bg-white p-6 shadow-xl"
      aria-label="Figura 13 – Estado do painel operacional"
      data-figure="13"
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#1565c0]">Painel operacional Redeagromet</p>
          <h1 className="text-2xl font-semibold text-[#0f2747]">Disponibilidade, latência e alertas (últimas 12 h)</h1>
          <p className="text-sm text-[#0f2747]/80">Snapshot coletado em {formattedTimestamp}.</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border-2 border-[#1565c0] bg-white px-4 py-2 text-sm font-semibold text-[#0f2747] shadow-sm transition hover:bg-[#f5f5f5]"
            onClick={() => exportAsSVG(svgRef, "Figura13_EstadoPainel.svg")}
          >
            Exportar SVG
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border-2 border-[#1565c0] bg-white px-4 py-2 text-sm font-semibold text-[#0f2747] shadow-sm transition hover:bg-[#f5f5f5]"
            onClick={() => void exportDiagramPDF(svgRef, containerRef, "Figura13_EstadoPainel.pdf")}
          >
            Exportar PDF
          </button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_1.15fr]">
        <div className="space-y-4 rounded-3xl border border-[#d6e3f2] bg-white/95 p-5" data-export="lane">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#1565c0]">Resumo em cartões</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {panelCards.map((card) => {
              const badge = card.status ? statusStyles[card.status] : undefined;
              return (
                <article key={card.id} className="rounded-2xl border border-[#e1e9f5] bg-[#fafdff] px-5 py-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1565c0]">{card.title}</p>
                    {badge && (
                      <span
                        className="rounded-full px-3 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em]"
                        style={{ backgroundColor: badge.bg, color: badge.text, border: `1px solid ${badge.border}` }}
                      >
                        {card.status}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-[#0f2747]">{card.value}</p>
                  {card.subtitle && <p className="text-sm text-[#0f2747]/75">{card.subtitle}</p>}
                </article>
              );
            })}
          </div>
          <div className="rounded-2xl border border-[#e1e9f5] bg-[#fafdff] px-5 py-4 text-sm text-[#0f2747]/80">
            <p className="font-semibold text-[#0f2747]">Observações</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {observations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0f2747]/60">
            Origem: `/api/dashboard-snapshot`, `current_weather_cache`, triggers ETL
          </p>
        </div>

        <div className="rounded-3xl border border-[#d6e3f2] bg-[#0f2747]/2 p-5" data-export="lane">
          <div className="mb-4 flex flex-wrap items-center gap-4 text-sm font-semibold text-[#0f2747]">
            <span className="rounded-full border border-[#cfd8e8] px-3 py-1">SLA latência &lt; 350 ms</span>
            <span className="rounded-full border border-[#cfd8e8] px-3 py-1">SLA disponibilidade &gt;= 99%</span>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1565c0]">Escalas independentes</span>
          </div>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${chartDims.width} ${chartDims.height}`}
            className="w-full"
            data-export="lane"
            role="img"
          >
            <defs>
              <linearGradient id="fig13Area" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#f7fafc" />
                <stop offset="100%" stopColor="#edf2fb" />
              </linearGradient>
            </defs>
            <rect x={0} y={0} width={chartDims.width} height={chartDims.height} fill="url(#fig13Area)" rx={28} />

            {chartSeries[0]?.points.map((point, index) => (
              <g key={`vline-${point.x}`}>
                {index > 0 && (
                  <line
                    x1={xScale(point.x)}
                    x2={xScale(point.x)}
                    y1={chartDims.margin.top - 30}
                    y2={chartDims.height - chartDims.margin.bottom}
                    stroke="#dbe4f4"
                    strokeDasharray="4 8"
                  />
                )}
                <text
                  x={xScale(point.x)}
                  y={chartDims.height - chartDims.margin.bottom + 24}
                  fontSize={12}
                  fill="#0f2747"
                  textAnchor="middle"
                >
                  {new Date(point.x).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </text>
              </g>
            ))}

            {(() => {
              const sloY = yScaleLeft(350);
              return (
                <g>
                  <line
                    x1={chartDims.margin.left}
                    x2={chartDims.width - chartDims.margin.right}
                    y1={sloY}
                    y2={sloY}
                    stroke="#f97316"
                    strokeDasharray="6 6"
                  />
                  <text x={chartDims.margin.left} y={sloY - 8} fontSize={11} fill="#f97316">
                    Limiar SLA latência 350 ms
                  </text>
                </g>
              );
            })()}

            {(() => {
              const slaY = yScaleRight(99);
              return (
                <g>
                  <line
                    x1={chartDims.margin.left}
                    x2={chartDims.width - chartDims.margin.right}
                    y1={slaY}
                    y2={slaY}
                    stroke="#16a34a"
                    strokeDasharray="6 6"
                  />
                  <text x={chartDims.width - chartDims.margin.right + 4} y={slaY - 8} fontSize={11} fill="#16a34a">
                    SLA 99%
                  </text>
                </g>
              );
            })()}

            <g>
              {[0, 1, 2, 3, 4].map((step) => {
                const value = leftExtent.min + ((leftExtent.max - leftExtent.min) / 4) * step;
                const y = yScaleLeft(value);
                return (
                  <g key={`left-${step}`}>
                    <line
                      x1={chartDims.margin.left - 8}
                      x2={chartDims.margin.left}
                      y1={y}
                      y2={y}
                      stroke="#0f2747"
                    />
                    <text x={chartDims.margin.left - 12} y={y + 4} fontSize={11} fill="#0f2747" textAnchor="end">
                      {value.toFixed(0)}
                    </text>
                  </g>
                );
              })}
              {[0, 1, 2, 3, 4].map((step) => {
                const value = rightExtent.min + ((rightExtent.max - rightExtent.min) / 4) * step;
                const y = yScaleRight(value);
                return (
                  <g key={`right-${step}`}>
                    <line
                      x1={chartDims.width - chartDims.margin.right}
                      x2={chartDims.width - chartDims.margin.right + 8}
                      y1={y}
                      y2={y}
                      stroke="#0f2747"
                    />
                    <text x={chartDims.width - chartDims.margin.right + 12} y={y + 4} fontSize={11} fill="#0f2747">
                      {value.toFixed(1)}%
                    </text>
                  </g>
                );
              })}
            </g>

            {chartSeries.map((series) => (
              <g key={series.id}>
                <path d={buildPath(series)} stroke={series.color} strokeWidth={3} fill="none" strokeLinecap="round" />
                {series.points.map((point) => (
                  <circle
                    key={`${series.id}-${point.x}`}
                    cx={xScale(point.x)}
                    cy={series.id === "latencia" ? yScaleLeft(point.y) : yScaleRight(point.y)}
                    r={4.5}
                    fill="#ffffff"
                    stroke={series.color}
                    strokeWidth={2}
                  />
                ))}
              </g>
            ))}

            <g transform={`translate(${chartDims.margin.left}, ${chartDims.margin.top - 25})`}>
              {chartSeries.map((series, index) => (
                <g key={series.id} transform={`translate(${index * 220}, 0)`}>
                  <rect width={16} height={4} y={-4} fill={series.color} />
                  <text x={24} y={0} fontSize={12} fill="#0f2747">
                    {series.label}
                  </text>
                </g>
              ))}
            </g>
          </svg>
        </div>
      </div>
    </section>
  );
}
