"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { exportAsSVG, exportDiagramPDF } from "../figura-02/Figure02_Encadeamento";

type ActorId = "ftp" | "calc" | "db";

type Actor = {
  id: ActorId;
  label: string;
  description: string;
};

type SequenceMessage = {
  id: string;
  from: ActorId;
  to: ActorId;
  label: string;
  detail: string;
  direction?: "forward" | "return";
};

const ACTORS: Actor[] = [
  {
    id: "ftp",
    label: "ftpClient",
    description: "Orquestra ET₀ diária",
  },
  {
    id: "calc",
    label: "et.calc",
    description: "<lib/et/calc.ts>",
  },
  {
    id: "db",
    label: "etDatabase / DB",
    description: "daily_evapotranspiration",
  },
];

const MESSAGES: SequenceMessage[] = [
  {
    id: "m1",
    from: "ftp",
    to: "calc",
    label: "Agrega leituras (24 h D-1)",
    detail: "Rs, T, UR, u₂, P",
  },
  {
    id: "m2",
    from: "calc",
    to: "ftp",
    label: "Retorna ET₀ + QA",
    detail: "Penman–Monteith (Eq. 10)",
    direction: "return",
  },
  {
    id: "m3",
    from: "ftp",
    to: "db",
    label: "Upsert ET₀ diária",
    detail: "Tabela daily_evapotranspiration",
  },
  {
    id: "m4",
    from: "db",
    to: "ftp",
    label: "Confirmação idempotente",
    detail: "hash + janela completa",
    direction: "return",
  },
];

const ALT_BRANCHES = [
  {
    title: "Janela completa",
    description: "Equação 10 – Penman–Monteith (FAO-56)",
  },
  {
    title: "Janela incompleta",
    description: "Equação 11 + reprocesso assíncrono em D+1",
  },
] as const;

const LIFELINE_TOP = 100;
const LIFELINE_BOTTOM_OFFSET = 80;
const MESSAGE_SPACING = 90;
const FIRST_MESSAGE_Y = 160;
const ALT_BLOCK_START_Y = 220;
const ALT_BLOCK_HEIGHT = 180;

export default function Figure09_SequenciaET0() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [svgDims, setSvgDims] = useState({ width: 1000, height: 600 });

  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setSvgDims({ width: Math.max(rect.width, 1000), height: 600 });
    }
  }, []);

  useEffect(() => {
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [updateDimensions]);

  const actorPositions = useMemo(() => {
    const horizontalPadding = 140;
    const usableWidth = svgDims.width - horizontalPadding * 2;
    const step = usableWidth / (ACTORS.length - 1);
    return ACTORS.reduce<Record<ActorId, number>>((acc, actor, index) => {
      acc[actor.id] = horizontalPadding + step * index;
      return acc;
    }, {} as Record<ActorId, number>);
  }, [svgDims.width]);

  const messageYPositions = useMemo(() => {
    return MESSAGES.map((_, index) => FIRST_MESSAGE_Y + index * MESSAGE_SPACING);
  }, []);

  const altBlock = useMemo(() => ({
    x: 100,
    y: ALT_BLOCK_START_Y,
    width: svgDims.width - 200,
    height: ALT_BLOCK_HEIGHT,
  }), [svgDims.width]);

  return (
    <section
      ref={containerRef}
      className="rounded-3xl border border-[#d1d9e0] bg-white p-6 shadow-xl"
      aria-label="Figura 9 – Sequência simplificada do cálculo ET₀ diária"
      data-figure="9"
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#1565c0]">
            Sequência ET₀ diária
          </p>
          <h1 className="text-2xl font-semibold text-[#0f2747]">
            ftpClient → et.calc → etDatabase
          </h1>
          <p className="text-sm text-[#0f2747]/75">
            Rotina que processa leituras de D−1, calcula ET₀ com Penman–Monteith e grava na tabela
            <span className="font-semibold"> daily_evapotranspiration</span>.
          </p>
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
      </header>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${svgDims.width} ${svgDims.height}`}
        className="mt-8 w-full"
        role="img"
        data-export="lane"
        aria-labelledby="fig9-title fig9-desc"
      >
        <title id="fig9-title">Sequência simplificada do cálculo de ET₀ diária</title>
        <desc id="fig9-desc">
          ftpClient agenda a rodada de ET₀, et.calc executa Penman–Monteith/Equação 11 e etDatabase confirma o upsert idempotente.
        </desc>
        <defs>
          <marker id="fig9ArrowForward" markerWidth="16" markerHeight="9" refX="16" refY="4.5" orient="auto">
            <polygon points="0 0, 16 4.5, 0 9" fill="#1565c0" />
          </marker>
          <marker id="fig9ArrowReturn" markerWidth="16" markerHeight="9" refX="16" refY="4.5" orient="auto">
            <polygon points="0 0, 16 4.5, 0 9" fill="#0f766e" />
          </marker>
        </defs>

        {/* Lifeline actors (boxes at top) */}
        {ACTORS.map((actor) => (
          <g key={actor.id}>
            <rect
              x={actorPositions[actor.id] - 100}
              y={20}
              width={200}
              height={68}
              rx={16}
              fill="#f6fbff"
              stroke="#cfd9e8"
              strokeWidth={1.5}
            />
            <text x={actorPositions[actor.id]} y={46} textAnchor="middle" fontSize={15} fontWeight={700} fill="#0f2747">
              {actor.label}
            </text>
            <text x={actorPositions[actor.id]} y={64} textAnchor="middle" fontSize={11} fill="#0f2747" opacity={0.7}>
              {actor.description}
            </text>
            {/* Lifeline dashed vertical */}
            <line
              x1={actorPositions[actor.id]}
              x2={actorPositions[actor.id]}
              y1={LIFELINE_TOP}
              y2={svgDims.height - LIFELINE_BOTTOM_OFFSET}
              stroke="#c5d3eb"
              strokeWidth={2}
              strokeDasharray="6 6"
            />
          </g>
        ))}

        {/* Alt conditional block (drawn before messages so messages appear on top) */}
        <g transform={`translate(${altBlock.x}, ${altBlock.y})`}>
          <rect
            width={altBlock.width}
            height={altBlock.height}
            rx={20}
            fill="#fffbf5"
            stroke="#f97316"
            strokeWidth={2}
            strokeDasharray="10 8"
          />
          <text x={16} y={-8} fontSize={13} fontWeight={700} fill="#f97316">
            alt
          </text>
          {/* Vertical divider between branches */}
          <line
            x1={altBlock.width / 2}
            x2={altBlock.width / 2}
            y1={24}
            y2={altBlock.height - 24}
            stroke="#f97316"
            strokeDasharray="6 6"
            strokeWidth={1.5}
          />
          {ALT_BRANCHES.map((branch, index) => {
            const branchWidth = altBlock.width / ALT_BRANCHES.length;
            const xOffset = index * branchWidth;
            return (
              <g key={branch.title} transform={`translate(${xOffset}, 0)`}>
                {/* Inner card for each branch */}
                <rect
                  x={20}
                  y={36}
                  width={branchWidth - 40}
                  height={altBlock.height - 72}
                  fill="#fff7ed"
                  stroke="#fdba74"
                  strokeWidth={1}
                  rx={14}
                />
                <text x={36} y={62} fontSize={14} fontWeight={700} fill="#0f2747">
                  {branch.title}
                </text>
                <text
                  x={36}
                  y={84}
                  fontSize={12}
                  fill="#0f2747"
                  style={{ whiteSpace: "pre-line" }}
                >
                  {branch.description}
                </text>
              </g>
            );
          })}
        </g>

        {/* Sequence messages with proper connector labels */}
        {MESSAGES.map((message, index) => {
          const fromX = actorPositions[message.from];
          const toX = actorPositions[message.to];
          const isReturn = message.direction === "return";
          const y = messageYPositions[index];
          const midX = (fromX + toX) / 2;
          const marker = isReturn ? "url(#fig9ArrowReturn)" : "url(#fig9ArrowForward)";
          const strokeColor = isReturn ? "#0f766e" : "#1565c0";

          return (
            <g key={message.id}>
              {/* Message arrow */}
              <path
                d={`M ${fromX} ${y} L ${toX} ${y}`}
                stroke={strokeColor}
                strokeWidth={2.6}
                fill="none"
                markerEnd={marker}
              />
              {/* Label pill (similar to pipeline connector labels) */}
              <g transform={`translate(${midX}, ${y})`}>
                <rect
                  x={-80}
                  y={-32}
                  width={160}
                  height={24}
                  rx={12}
                  fill="white"
                  stroke="#c5d2e3"
                  strokeWidth={1}
                />
                <text y={-18} textAnchor="middle" fontSize={13} fontWeight={600} fill="#0f2747">
                  {message.label}
                </text>
              </g>
              {/* Detail below arrow */}
              <text
                x={midX}
                y={y + 22}
                textAnchor="middle"
                fontSize={11}
                fill="#4d5d7a"
              >
                {message.detail}
              </text>
            </g>
          );
        })}

        {/* Legend */}
        <g transform={`translate(${svgDims.width - 320}, ${svgDims.height - 70})`}>
          <g>
            <rect width={16} height={4} fill="#1565c0" rx={2} />
            <text x={24} y={4} fontSize={12} fill="#0f2747">
              Chamada da rodada ET₀ / upsert
            </text>
          </g>
          <g transform="translate(0, 20)">
            <rect width={16} height={4} fill="#0f766e" rx={2} />
            <text x={24} y={4} fontSize={12} fill="#0f2747">
              Retorno / confirmação
            </text>
          </g>
          <g transform="translate(0, 40)">
            <rect width={16} height={4} fill="#f97316" rx={2} />
            <text x={24} y={4} fontSize={12} fill="#0f2747">
              Bloco alt (Equações 10/11)
            </text>
          </g>
        </g>
      </svg>
    </section>
  );
}
