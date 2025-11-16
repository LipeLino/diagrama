"use client";

import React, { useMemo, useRef } from "react";

import { exportAsSVG, exportDiagramPDF } from "../figura-02/Figure02_Encadeamento";

const ACTORS = [
  { id: "ftp", label: "ftpClient (ingestão)" },
  { id: "calc", label: "et.calc (&lt;lib/et/calc.ts&gt;)" },
  { id: "db", label: "etDatabase / Supabase" },
];

const messages = [
  {
    id: "m1",
    from: "ftp",
    to: "calc",
    text: "Agrega leituras (24h D-1)",
    detail: "Rs, T, UR, u₂",
  },
  {
    id: "m2",
    from: "calc",
    to: "ftp",
    text: "Retorna ET₀ calculada",
    detail: "Penman–Monteith",
  },
  {
    id: "m3",
    from: "ftp",
    to: "db",
    text: "Upsert ET diária",
    detail: "daily_evapotranspiration",
  },
  {
    id: "m4",
    from: "db",
    to: "ftp",
    text: "Confirmação idempotente",
    detail: "hash + janela completa",
  },
];

const ALT_BLOCK = {
  y: 220,
  height: 150,
  title: "alt",
  branches: [
    {
      title: "Janela completa",
      description: "Equação 10 – ET₀ Penman–Monteith",
    },
    {
      title: "Janela incompleta",
      description: "Equação 11 + reprocesso assíncrono ao completar 24h",
    },
  ],
};

export default function Figure09_SequenciaET0() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const actorPositions = useMemo(() => {
    const width = 960;
    const padding = 120;
    const usable = width - padding * 2;
    const step = usable / (ACTORS.length - 1);
    return ACTORS.reduce<Record<string, number>>((acc, actor, index) => {
      acc[actor.id] = padding + step * index;
      return acc;
    }, {});
  }, []);

  const sequenceHeight = 520;

  const messageYPositions = [110, 160, 260, 320];

  return (
    <section
      ref={containerRef}
      className="rounded-3xl border border-[#d1d9e0] bg-white p-6 shadow-xl"
      aria-label="Figura 9 – Sequência simplificada do cálculo ET₀"
      data-figure="9"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#1565c0]">Sequência ET₀ diária</p>
          <h1 className="text-2xl font-semibold text-[#0f2747]">ftpClient → et.calc → etDatabase</h1>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border-2 border-[#1565c0] bg-white px-4 py-2 text-sm font-semibold text-[#0f2747] shadow-sm transition hover:bg-[#f5f5f5]"
            onClick={() => exportAsSVG(svgRef, "Figura09_SequenciaET0.svg")}
          >
            Exportar SVG
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border-2 border-[#1565c0] bg-white px-4 py-2 text-sm font-semibold text-[#0f2747] shadow-sm transition hover:bg-[#f5f5f5]"
            onClick={() => void exportDiagramPDF(svgRef, containerRef, "Figura09_SequenciaET0.pdf")}
          >
            Exportar PDF
          </button>
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 960 ${sequenceHeight}`}
        className="mt-8 w-full"
        role="img"
        aria-labelledby="fig9-title fig9-desc"
      >
        <title id="fig9-title">Sequência simplificada do cálculo de ET₀ diária</title>
        <desc id="fig9-desc">Diagrama com atores ftpClient, et.calc e etDatabase.</desc>
        <defs>
          <marker id="fig9Arrow" markerWidth="16" markerHeight="9" refX="16" refY="4.5" orient="auto">
            <polygon points="0 0, 16 4.5, 0 9" fill="#1565c0" />
          </marker>
          <marker id="fig9ArrowBack" markerWidth="16" markerHeight="9" refX="16" refY="4.5" orient="auto">
            <polygon points="0 0, 16 4.5, 0 9" fill="#0f766e" />
          </marker>
        </defs>

        {ACTORS.map((actor) => (
          <g key={actor.id}>
            <rect
              x={actorPositions[actor.id] - 90}
              y={20}
              width={180}
              height={52}
              rx={12}
              ry={12}
              fill="#f7faff"
              stroke="#cfd8e6"
            />
            <text
              x={actorPositions[actor.id]}
              y={50}
              textAnchor="middle"
              fontSize={14}
              fontWeight={600}
              fill="#0f2747"
            >
              {actor.label}
            </text>
            <line
              x1={actorPositions[actor.id]}
              x2={actorPositions[actor.id]}
              y1={72}
              y2={sequenceHeight - 40}
              stroke="#c5d3eb"
              strokeWidth={2}
              strokeDasharray="6 6"
            />
          </g>
        ))}

        {messages.map((message, index) => {
          const fromX = actorPositions[message.from];
          const toX = actorPositions[message.to];
          const isReturn = fromX > toX;
          const marker = isReturn ? "url(#fig9ArrowBack)" : "url(#fig9Arrow)";
          const y = messageYPositions[index] ?? 120 + index * 60;
          return (
            <g key={message.id}>
              <path
                d={`M ${fromX} ${y} L ${toX} ${y}`}
                stroke={isReturn ? "#0f766e" : "#1565c0"}
                strokeWidth={2.5}
                fill="none"
                markerEnd={marker}
              />
              <text
                x={(fromX + toX) / 2}
                y={y - 10}
                textAnchor="middle"
                fontSize={13}
                fontWeight={600}
                fill="#0f2747"
              >
                {message.text}
              </text>
              <text
                x={(fromX + toX) / 2}
                y={y + 16}
                textAnchor="middle"
                fontSize={12}
                fill="#0f2747"
              >
                {message.detail}
              </text>
            </g>
          );
        })}

        <g transform={`translate(120, ${ALT_BLOCK.y})`}>
          <rect
            width={720}
            height={ALT_BLOCK.height}
            fill="none"
            stroke="#f97316"
            strokeWidth={2}
            strokeDasharray="8 6"
            rx={16}
          />
          <text x={12} y={-6} fontSize={12} fontWeight={700} fill="#f97316">
            {ALT_BLOCK.title}
          </text>
          <line x1={360} x2={360} y1={0} y2={ALT_BLOCK.height} stroke="#f97316" strokeDasharray="4 6" />
          {ALT_BLOCK.branches.map((branch, idx) => (
            <g key={branch.title} transform={`translate(${idx === 0 ? 24 : 384}, 32)`}>
              <text fontSize={13} fontWeight={700} fill="#0f2747">
                {branch.title}
              </text>
              <text y={22} fontSize={12} fill="#0f2747" style={{ whiteSpace: "pre-line" }}>
                {branch.description}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </section>
  );
}
