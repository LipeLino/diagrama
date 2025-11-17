"use client";

import React, { useMemo, useRef } from "react";

import { exportAsSVG, exportDiagramPDF } from "../figura-02/Figure02_Encadeamento";

type EtlRunPoint = {
  date: string; // ISO 8601
  p50: number; // seconds
  p95: number;
  p99: number;
  reconsolidated?: "D" | "D+1";
};

const data: EtlRunPoint[] = [
  { date: "2025-08-01", p50: 145, p95: 190, p99: 230 },
  { date: "2025-08-15", p50: 155, p95: 205, p99: 250 },
  { date: "2025-09-01", p50: 160, p95: 215, p99: 270, reconsolidated: "D" },
  { date: "2025-09-10", p50: 150, p95: 210, p99: 260 },
  { date: "2025-09-24", p50: 162, p95: 230, p99: 282, reconsolidated: "D+1" },
  { date: "2025-10-05", p50: 168, p95: 238, p99: 288 },
  { date: "2025-10-18", p50: 162, p95: 232, p99: 280 },
  { date: "2025-10-31", p50: 160, p95: 225, p99: 275 },
];

type SeriesKey = "p50" | "p95" | "p99";

const SERIES: Array<{ id: SeriesKey; label: string; color: string }> = [
  { id: "p50", label: "p50 (mediana)", color: "#1565c0" },
  { id: "p95", label: "p95", color: "#f59e0b" },
  { id: "p99", label: "p99", color: "#dc2626" },
];

const SvgDims = { width: 960, height: 420, padding: { top: 40, right: 40, bottom: 60, left: 80 } };

export default function Figure10_ETLTempoExecucao() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const sortedData = useMemo(() => [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), []);

  const timeExtent = useMemo(() => {
    const min = new Date(sortedData[0].date).getTime();
    const max = new Date(sortedData[sortedData.length - 1].date).getTime();
    return { min, max };
  }, [sortedData]);

  const valueExtent = useMemo(() => {
    const maxValue = Math.max(...sortedData.map((d) => d.p99));
    return { min: 100, max: Math.ceil((maxValue + 10) / 10) * 10 };
  }, [sortedData]);

  const xScale = (date: string) => {
    const t = new Date(date).getTime();
    const { width, padding } = SvgDims;
    const ratio = (t - timeExtent.min) / (timeExtent.max - timeExtent.min);
    return padding.left + ratio * (width - padding.left - padding.right);
  };

  const yScale = (value: number) => {
    const { height, padding } = SvgDims;
    const ratio = (value - valueExtent.min) / (valueExtent.max - valueExtent.min);
    return height - padding.bottom - ratio * (height - padding.top - padding.bottom);
  };

  const linePath = (accessor: SeriesKey) => {
    return sortedData
      .map((point, index) => {
        const prefix = index === 0 ? "M" : "L";
        return `${prefix} ${xScale(point.date).toFixed(2)} ${yScale(point[accessor]).toFixed(2)}`;
      })
      .join(" ");
  };

  const monthTicks = useMemo(() => {
    const ticks: { label: string; date: string }[] = [];
    const seen = new Set<string>();
    sortedData.forEach((point) => {
      const label = new Date(point.date).toLocaleDateString("pt-BR", { month: "short" });
      if (!seen.has(label)) {
        seen.add(label);
        ticks.push({ label, date: point.date });
      }
    });
    return ticks;
  }, [sortedData]);

  return (
    <section
      ref={containerRef}
      className="rounded-3xl border border-[#d1d9e0] bg-white p-6 shadow-xl"
      aria-label="Figura 10 – Tempo de execução do ETL"
      data-figure="10"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#1565c0]">Agosto → Outubro / 2025</p>
          <h1 className="text-2xl font-semibold text-[#0f2747]">Distribuição temporal do tempo de execução (s)</h1>
          <p className="text-sm text-[#0f2747]/70">
            Mediana 2 min 40 s (160 s), p95 4 min 10 s, p99 até 4 min 48 s; marcadores indicam reconsolidações D / D+1.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border-2 border-[#1565c0] bg-white px-4 py-2 text-sm font-semibold text-[#0f2747] shadow-sm transition hover:bg-[#f5f5f5]"
            onClick={() => exportAsSVG(svgRef, "Figura10_ETLTempoExecucao.svg")}
          >
            Exportar SVG
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border-2 border-[#1565c0] bg-white px-4 py-2 text-sm font-semibold text-[#0f2747] shadow-sm transition hover:bg-[#f5f5f5]"
            onClick={() => void exportDiagramPDF(svgRef, containerRef, "Figura10_ETLTempoExecucao.pdf")}
          >
            Exportar PDF
          </button>
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${SvgDims.width} ${SvgDims.height}`}
        className="mt-8 w-full"
        data-export="lane"
        role="img"
      >
        <defs>
          <linearGradient id="fig10Grid" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#e6eef7" stopOpacity="1" />
            <stop offset="100%" stopColor="#f5f7fb" stopOpacity="1" />
          </linearGradient>
        </defs>
        <rect x={SvgDims.padding.left} y={SvgDims.padding.top} width={SvgDims.width - SvgDims.padding.left - SvgDims.padding.right} height={SvgDims.height - SvgDims.padding.top - SvgDims.padding.bottom} fill="url(#fig10Grid)" rx={24} />

        {Array.from({ length: 5 }).map((_, idx) => {
          const value = valueExtent.min + ((valueExtent.max - valueExtent.min) / 4) * idx;
          const y = yScale(value);
          return (
            <g key={`h-grid-${idx}`}>
              <line
                x1={SvgDims.padding.left}
                x2={SvgDims.width - SvgDims.padding.right}
                y1={y}
                y2={y}
                stroke="#dbe4f2"
                strokeDasharray="4 6"
              />
              <text x={SvgDims.padding.left - 8} y={y + 4} textAnchor="end" fontSize={12} fill="#0f2747">
                {value.toFixed(0)} s
              </text>
            </g>
          );
        })}

        {monthTicks.map((tick) => (
          <g key={tick.date}>
            <line
              x1={xScale(tick.date)}
              x2={xScale(tick.date)}
              y1={SvgDims.height - SvgDims.padding.bottom}
              y2={SvgDims.height - SvgDims.padding.bottom + 8}
              stroke="#0f2747"
            />
            <text x={xScale(tick.date)} y={SvgDims.height - SvgDims.padding.bottom + 24} fontSize={12} fill="#0f2747" textAnchor="middle">
              {tick.label}
            </text>
          </g>
        ))}

        {SERIES.map((series) => (
          <path
            key={series.id}
            d={linePath(series.id)}
            stroke={series.color}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
          />
        ))}

        {sortedData.map((point) => (
          <g key={point.date}>
            <circle cx={xScale(point.date)} cy={yScale(point.p50)} r={4} fill="#1565c0" />
            <circle cx={xScale(point.date)} cy={yScale(point.p95)} r={4} fill="#f59e0b" />
            <circle cx={xScale(point.date)} cy={yScale(point.p99)} r={4} fill="#dc2626" />
            {point.reconsolidated && (
              <g transform={`translate(${xScale(point.date)}, ${yScale(point.p99) - 28})`}>
                <rect
                  x={-6}
                  y={-6}
                  width={12}
                  height={12}
                  fill={point.reconsolidated === "D" ? "#14b8a6" : "#9333ea"}
                  transform="rotate(45)"
                >
                  <title>Reconsolidação {point.reconsolidated === "D" ? "D" : "D+1"}</title>
                </rect>
              </g>
            )}
          </g>
        ))}

        <g transform={`translate(${SvgDims.padding.left}, ${SvgDims.padding.top - 20})`}>
          {SERIES.map((series, idx) => (
            <g key={series.id} transform={`translate(${idx * 180}, 0)`}>
              <rect width={16} height={4} y={-4} fill={series.color} rx={2} />
              <text x={24} y={0} fontSize={12} fill="#0f2747">
                {series.label}
              </text>
            </g>
          ))}
          <g transform="translate(540, 0)">
            <rect width={12} height={12} fill="#14b8a6" transform="rotate(45 6 6)" />
            <text x={20} y={10} fontSize={12} fill="#0f2747">
              Reconsolidação D
            </text>
          </g>
          <g transform="translate(720, 0)">
            <rect width={12} height={12} fill="#9333ea" transform="rotate(45 6 6)" />
            <text x={20} y={10} fontSize={12} fill="#0f2747">
              Reconsolidação D+1
            </text>
          </g>
        </g>
      </svg>
    </section>
  );
}
