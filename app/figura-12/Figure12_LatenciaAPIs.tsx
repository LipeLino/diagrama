"use client";

import React, { useMemo, useRef } from "react";

import { exportAsSVG, exportDiagramPDF } from "../figura-02/Figure02_Encadeamento";
import type { ApiLatencyStat } from "../../types/figureModels";

const apiStats: ApiLatencyStat[] = [
  {
    route: "/api/chart-data",
    min: 240,
    q1: 320,
    p50: 360,
    q3: 430,
    p95: 520,
    p99: 610,
    max: 640,
    samples: 864,
  },
  {
    route: "/api/export",
    min: 380,
    q1: 460,
    p50: 510,
    q3: 590,
    p95: 740,
    p99: 860,
    max: 920,
    samples: 122,
  },
  {
    route: "/api/dashboard-snapshot",
    min: 140,
    q1: 190,
    p50: 220,
    q3: 270,
    p95: 340,
    p99: 380,
    max: 410,
    samples: 1750,
  },
  {
    route: "/api/weather-proxy",
    min: 260,
    q1: 320,
    p50: 350,
    q3: 420,
    p95: 540,
    p99: 720,
    max: 800,
    samples: 980,
  },
];

const dims = {
  width: 960,
  height: 480,
  margin: { top: 80, right: 80, bottom: 80, left: 150 },
};

export default function Figure12_LatenciaAPIs() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const latencyExtent = useMemo(() => {
    const min = Math.min(...apiStats.map((stat) => stat.min));
    const max = Math.max(...apiStats.map((stat) => stat.max));
    return {
      min: Math.max(0, Math.floor((min - 40) / 10) * 10),
      max: Math.ceil((max + 40) / 10) * 10,
    };
  }, []);

  const slowestRoute = useMemo(() => apiStats.reduce((prev, curr) => (curr.p99 > prev.p99 ? curr : prev), apiStats[0]), []);

  const xScale = (value: number) => {
    const { width, margin } = dims;
    const ratio = (value - latencyExtent.min) / (latencyExtent.max - latencyExtent.min);
    return margin.left + ratio * (width - margin.left - margin.right);
  };

  const rowY = (index: number) => {
    const available = dims.height - dims.margin.top - dims.margin.bottom;
    const step = available / (apiStats.length - 1);
    return dims.margin.top + index * step;
  };

  const axisTicks = useMemo(() => {
    const ticks: number[] = [];
    const span = latencyExtent.max - latencyExtent.min;
    const approxTickCount = 6;
    const rawStep = span / approxTickCount;
    const base = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const multiples = [1, 2, 5];
    const stepCandidate = multiples.find((m) => rawStep / (base * m) <= 2) ?? 10;
    const step = base * stepCandidate;
    for (let value = latencyExtent.min; value <= latencyExtent.max + 1; value += step) {
      ticks.push(value);
    }
    return ticks;
  }, [latencyExtent.max, latencyExtent.min]);

  return (
    <section
      ref={containerRef}
      className="space-y-6 rounded-3xl border border-[#d1d9e0] bg-white p-6 shadow-xl"
      aria-label="Figura 12 – Latência observada das APIs Redeagromet"
      data-figure="12"
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#1565c0]">Monitoramento Agosto–Outubro/2025</p>
          <h1 className="text-2xl font-semibold text-[#0f2747]">Latência por rota serverless (ms)</h1>
          <p className="text-sm text-[#0f2747]/80">
            {slowestRoute.route} concentra o maior p99 ({slowestRoute.p99} ms) devido ao volume de exportações; demais rotas permanecem abaixo de 400 ms no p99.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border-2 border-[#1565c0] bg-white px-4 py-2 text-sm font-semibold text-[#0f2747] shadow-sm transition hover:bg-[#f5f5f5]"
            onClick={() => exportAsSVG(svgRef, "Figura12_LatenciaAPIs.svg")}
          >
            Exportar SVG
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border-2 border-[#1565c0] bg-white px-4 py-2 text-sm font-semibold text-[#0f2747] shadow-sm transition hover:bg-[#f5f5f5]"
            onClick={() => void exportDiagramPDF(svgRef, containerRef, "Figura12_LatenciaAPIs.pdf")}
          >
            Exportar PDF
          </button>
        </div>
      </header>

      <svg ref={svgRef} viewBox={`0 0 ${dims.width} ${dims.height}`} className="w-full" role="img">
        <defs>
          <linearGradient id="fig12Bg" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#f9fbff" />
            <stop offset="100%" stopColor="#f1f4fa" />
          </linearGradient>
        </defs>
        <rect x={0} y={0} width={dims.width} height={dims.height} fill="url(#fig12Bg)" rx={32} />

        {apiStats.map((stat, index) => (
          <g key={stat.route} opacity={index % 2 === 0 ? 0.3 : 0.18}>
            <rect
              x={dims.margin.left - 130}
              y={rowY(index) - 30}
              width={dims.width - dims.margin.left - dims.margin.right + 150}
              height={60}
              fill="#dfe8f5"
              rx={16}
            />
          </g>
        ))}

        {axisTicks.map((tick) => (
          <g key={`tick-${tick}`}>
            <line
              x1={xScale(tick)}
              x2={xScale(tick)}
              y1={dims.margin.top - 40}
              y2={dims.height - dims.margin.bottom + 10}
              stroke="#cfd8e8"
              strokeDasharray="4 8"
            />
            <text x={xScale(tick)} y={dims.height - dims.margin.bottom + 32} fontSize={12} fill="#0f2747" textAnchor="middle">
              {tick}
            </text>
          </g>
        ))}

        <text
          x={(dims.margin.left + dims.width - dims.margin.right) / 2}
          y={dims.height - dims.margin.bottom + 56}
          fontSize={12}
          fill="#0f2747"
          textAnchor="middle"
        >
          Latência (ms)
        </text>

        {apiStats.map((stat, index) => {
          const y = rowY(index);
          const bandHeight = 28;
          const q1X = xScale(stat.q1);
          const q3X = xScale(stat.q3);
          const minX = xScale(stat.min);
          const maxX = xScale(stat.max);
          const medianX = xScale(stat.p50);
          const p95X = xScale(stat.p95);
          const p99X = xScale(stat.p99);
          return (
            <g key={stat.route}>
              <text x={dims.margin.left - 140} y={y + 4} fontSize={13} fill="#0f2747" fontWeight={600} textAnchor="start">
                {stat.route}
              </text>
              <text x={dims.margin.left - 140} y={y + 22} fontSize={11} fill="#0f2747" opacity={0.75}>
                {stat.samples} chamadas
              </text>

              <line x1={minX} x2={maxX} y1={y} y2={y} stroke="#0f2747" strokeWidth={1.5} />
              <line x1={minX} x2={minX} y1={y - 10} y2={y + 10} stroke="#0f2747" strokeWidth={1.5} />
              <line x1={maxX} x2={maxX} y1={y - 10} y2={y + 10} stroke="#0f2747" strokeWidth={1.5} />

              <rect
                x={q1X}
                y={y - bandHeight / 2}
                width={q3X - q1X}
                height={bandHeight}
                fill="#c8daf5"
                stroke="#1565c0"
                strokeWidth={1.5}
                rx={8}
              />
              <line x1={medianX} x2={medianX} y1={y - bandHeight / 2} y2={y + bandHeight / 2} stroke="#0f2747" strokeWidth={2} />

              <circle cx={minX} cy={y} r={4} fill="#1565c0" />
              <circle cx={maxX} cy={y} r={4} fill="#1565c0" />

              <path
                d={`M ${p95X - 6} ${y + bandHeight / 2 + 16} L ${p95X + 6} ${y + bandHeight / 2 + 16} L ${p95X} ${y + bandHeight / 2 + 4} Z`}
                fill="#f97316"
              />
              <circle cx={p99X} cy={y - bandHeight / 2 - 8} r={5} fill="#dc2626" />

              <text x={p95X} y={y + bandHeight / 2 + 34} fontSize={11} fill="#f97316" textAnchor="middle">
                p95
              </text>
              <text x={p99X} y={y - bandHeight / 2 - 22} fontSize={11} fill="#dc2626" textAnchor="middle">
                p99
              </text>
            </g>
          );
        })}

        <g transform={`translate(${dims.margin.left}, ${dims.margin.top - 56})`}>
          <g transform="translate(0, 0)">
            <rect x={0} y={-12} width={20} height={12} fill="#c8daf5" stroke="#1565c0" strokeWidth={1.5} rx={4} />
            <text x={28} y={-2} fontSize={12} fill="#0f2747">
              Faixa interquartil (q1-q3)
            </text>
          </g>
          <g transform="translate(260, 0)">
            <line x1={0} x2={20} y1={-6} y2={-6} stroke="#0f2747" strokeWidth={1.5} />
            <line x1={0} x2={0} y1={-12} y2={0} stroke="#0f2747" strokeWidth={1.5} />
            <line x1={20} x2={20} y1={-12} y2={0} stroke="#0f2747" strokeWidth={1.5} />
            <text x={32} y={-2} fontSize={12} fill="#0f2747">
              Mínimo/Maximo medidos
            </text>
          </g>
          <g transform="translate(520, 0)">
            <path d="M 0 -2 L 12 -2 L 6 -12 Z" fill="#f97316" />
            <text x={20} y={-2} fontSize={12} fill="#f97316">
              p95 – limiar escala automática
            </text>
          </g>
          <g transform="translate(780, 0)">
            <circle cx={6} cy={-6} r={5} fill="#dc2626" />
            <text x={20} y={-2} fontSize={12} fill="#dc2626">
              p99 – gatilho alerta
            </text>
          </g>
        </g>
      </svg>
    </section>
  );
}
