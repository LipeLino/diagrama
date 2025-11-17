"use client";

import React, { useMemo, useRef } from "react";

import { exportAsSVG, exportDiagramPDF } from "../figura-02/Figure02_Encadeamento";

type StationSeries = {
  id: string;
  name: string;
  color: string;
  points: Array<{ date: string; value: number }>;
};

type MonthlyBand = {
  month: string; // YYYY-MM
  mean: number;
  q1: number;
  q3: number;
};

const stationSeries: StationSeries[] = [
  {
    id: "sfs",
    name: "São Francisco de Sales",
    color: "#1565c0",
    points: [
      { date: "2025-08-01", value: 3.1 },
      { date: "2025-08-15", value: 3.2 },
      { date: "2025-09-01", value: 3.6 },
      { date: "2025-09-15", value: 3.9 },
      { date: "2025-10-01", value: 4.2 },
      { date: "2025-10-15", value: 4.3 },
      { date: "2025-10-31", value: 4.1 },
    ],
  },
  {
    id: "prata",
    name: "Prata",
    color: "#0ea5e9",
    points: [
      { date: "2025-08-01", value: 3.0 },
      { date: "2025-08-15", value: 3.1 },
      { date: "2025-09-01", value: 3.4 },
      { date: "2025-09-15", value: 3.8 },
      { date: "2025-10-01", value: 4.0 },
      { date: "2025-10-15", value: 4.2 },
      { date: "2025-10-31", value: 4.0 },
    ],
  },
  {
    id: "frutal",
    name: "Frutal (Ativa/Sigma)",
    color: "#7c3aed",
    points: [
      { date: "2025-08-01", value: 3.3 },
      { date: "2025-08-15", value: 3.4 },
      { date: "2025-09-01", value: 3.7 },
      { date: "2025-09-15", value: 4.0 },
      { date: "2025-10-01", value: 4.4 },
      { date: "2025-10-15", value: 4.5 },
      { date: "2025-10-31", value: 4.3 },
    ],
  },
  {
    id: "planura",
    name: "Planura",
    color: "#f97316",
    points: [
      { date: "2025-08-01", value: 3.0 },
      { date: "2025-08-15", value: 3.2 },
      { date: "2025-09-01", value: 3.6 },
      { date: "2025-09-15", value: 3.9 },
      { date: "2025-10-01", value: 4.3 },
      { date: "2025-10-15", value: 4.5 },
      { date: "2025-10-31", value: 4.2 },
    ],
  },
];

const monthlyBands: MonthlyBand[] = [
  { month: "2025-08", mean: 3.2, q1: 2.9, q3: 3.5 },
  { month: "2025-09", mean: 3.7, q1: 3.3, q3: 4.1 },
  { month: "2025-10", mean: 4.1, q1: 3.7, q3: 4.5 },
];

const dims = { width: 960, height: 420, padding: { top: 40, right: 40, bottom: 60, left: 80 } };

export default function Figure11_SazonalidadeET0() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const allPoints = stationSeries.flatMap((series) => series.points);
  const sortedDates = useMemo(() => [...new Set(allPoints.map((p) => p.date))].sort((a, b) => new Date(a).getTime() - new Date(b).getTime()), [allPoints]);
  const timeExtent = { min: new Date(sortedDates[0]).getTime(), max: new Date(sortedDates[sortedDates.length - 1]).getTime() };
  const valueExtent = { min: 2.4, max: 4.8 };

  const xScale = (date: string) => {
    const t = new Date(date).getTime();
    const ratio = (t - timeExtent.min) / (timeExtent.max - timeExtent.min);
    return dims.padding.left + ratio * (dims.width - dims.padding.left - dims.padding.right);
  };

  const yScale = (value: number) => {
    const ratio = (value - valueExtent.min) / (valueExtent.max - valueExtent.min);
    return dims.height - dims.padding.bottom - ratio * (dims.height - dims.padding.top - dims.padding.bottom);
  };

  const linePath = (series: StationSeries) =>
    series.points
      .map((point, idx) => {
        const prefix = idx === 0 ? "M" : "L";
        return `${prefix} ${xScale(point.date).toFixed(2)} ${yScale(point.value).toFixed(2)}`;
      })
      .join(" ");

  return (
    <section
      ref={containerRef}
      className="rounded-3xl border border-[#d1d9e0] bg-white p-6 shadow-xl"
      aria-label="Figura 11 – Sazonalidade ET₀"
      data-figure="11"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div data-export="stage-header">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#1565c0]">ET₀ diária (mm/dia)</p>
          <h1 className="text-2xl font-semibold text-[#0f2747]">Sazonalidade 2025-08 → 2025-10</h1>
          <p className="text-sm text-[#0f2747]/75">
            Média mensal 3,2 mm/dia (agosto) → 4,1 mm/dia (outubro); maior variabilidade em setembro.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border-2 border-[#1565c0] bg-white px-4 py-2 text-sm font-semibold text-[#0f2747] shadow-sm transition hover:bg-[#f5f5f5]"
            onClick={() => exportAsSVG(svgRef, "Figura11_SazonalidadeET0.svg")}
          >
            Exportar SVG
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border-2 border-[#1565c0] bg-white px-4 py-2 text-sm font-semibold text-[#0f2747] shadow-sm transition hover:bg-[#f5f5f5]"
            onClick={() => void exportDiagramPDF(svgRef, containerRef, "Figura11_SazonalidadeET0.pdf")}
          >
            Exportar PDF
          </button>
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${dims.width} ${dims.height}`}
        className="mt-8 w-full"
        data-export="lane"
        role="img"
      >
        <defs>
          <linearGradient id="fig11Bg" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#f9fbff" />
            <stop offset="100%" stopColor="#f1f5fb" />
          </linearGradient>
          <filter id="fig11Shadow">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.12" />
          </filter>
        </defs>

        <rect
          x={dims.padding.left}
          y={dims.padding.top}
          width={dims.width - dims.padding.left - dims.padding.right}
          height={dims.height - dims.padding.top - dims.padding.bottom}
          fill="url(#fig11Bg)"
          rx={24}
        />

        {monthlyBands.map((band) => {
          const monthStart = `${band.month}-01`;
          const monthEnd = new Date(new Date(monthStart).getFullYear(), new Date(monthStart).getMonth() + 1, 0)
            .toISOString()
            .slice(0, 10);
          const x1 = xScale(monthStart);
          const x2 = xScale(monthEnd);
          return (
            <g key={band.month}>
              <rect
                x={x1}
                y={yScale(band.q3)}
                width={Math.max(0, x2 - x1)}
                height={yScale(band.q1) - yScale(band.q3)}
                fill="#d1e3f7"
                opacity={0.5}
                rx={10}
              />
              <line x1={x1} x2={x2} y1={yScale(band.mean)} y2={yScale(band.mean)} stroke="#1565c0" strokeWidth={2} strokeDasharray="8 4" />
              <text x={(x1 + x2) / 2} y={dims.height - dims.padding.bottom + 28} textAnchor="middle" fontSize={13} fontWeight="600" fill="#0f2747">
                {new Date(monthStart).toLocaleDateString("pt-BR", { month: "short" })}
              </text>
            </g>
          );
        })}

        {stationSeries.map((series) => (
          <path
            key={series.id}
            d={linePath(series)}
            stroke={series.color}
            strokeWidth={3.2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#fig11Shadow)"
          />
        ))}

        {stationSeries.flatMap((series) =>
          series.points.map((point) => (
            <circle 
              key={`${series.id}-${point.date}`} 
              cx={xScale(point.date)} 
              cy={yScale(point.value)} 
              r={4.5} 
              fill="white" 
              stroke={series.color}
              strokeWidth={3}
              filter="url(#fig11Shadow)"
            />
          )),
        )}

        {monthlyBands.map((band) => {
          const monthStart = `${band.month}-01`;
          const monthEnd = new Date(new Date(monthStart).getFullYear(), new Date(monthStart).getMonth() + 1, 0)
            .toISOString()
            .slice(0, 10);
          const x1 = xScale(monthStart);
          const x2 = xScale(monthEnd);
          return (
            <g key={`${band.month}-label`}>
              <rect
                x={(x1 + x2) / 2 - 38}
                y={yScale(band.mean) - 20}
                width={76}
                height={24}
                fill="white"
                rx={6}
                stroke="#1565c0"
                strokeWidth={1.5}
                filter="url(#fig11Shadow)"
              />
              <text 
                x={(x1 + x2) / 2} 
                y={yScale(band.mean) - 4} 
                fontSize={13} 
                fontWeight="700"
                textAnchor="middle" 
                fill="#1565c0"
              >
                {band.mean.toFixed(1)} mm/dia
              </text>
            </g>
          );
        })}

        <g transform={`translate(${dims.padding.left}, ${dims.padding.top - 20})`}>
          {stationSeries.map((series, idx) => (
            <g key={series.id} transform={`translate(${idx * 200}, 0)`}>
              <line x1={0} x2={20} y1={0} y2={0} stroke={series.color} strokeWidth={3.2} strokeLinecap="round" />
              <circle cx={10} cy={0} r={4.5} fill="white" stroke={series.color} strokeWidth={3} />
              <text x={28} y={4} fontSize={12} fontWeight="500" fill="#0f2747">
                {series.name}
              </text>
            </g>
          ))}
        </g>

        <g transform={`translate(${dims.padding.left}, ${dims.height - dims.padding.bottom + 50})`}>
          <rect x={0} y={-8} width={20} height={20} fill="#d1e3f7" opacity={0.5} rx={4} />
          <text x={28} y={6} fontSize={12} fontWeight="500" fill="#0f2747">
            Faixa interquartil mensal (Q1–Q3)
          </text>
          <line x1={140} x2={170} y1={2} y2={2} stroke="#1565c0" strokeWidth={2} strokeDasharray="8 4" />
          <text x={178} y={6} fontSize={12} fontWeight="500" fill="#0f2747">
            Média mensal
          </text>
        </g>
      </svg>
    </section>
  );
}
