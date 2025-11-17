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

type LegendItem = {
  color: string;
  label: string;
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
    detail: "Rs, T, UR, u₂ e P",
  },
  {
    id: "m2",
    from: "calc",
    to: "ftp",
    label: "Retorna ET₀ + QA",
    detail: "Penman–Monteith (Equação 10)",
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

type AltBranch = {
  title: string;
  summary: string;
  equationLabel: string;
  equationDetail: string;
  bullets: string[];
  accent: string;
};

const ALT_BRANCHES: AltBranch[] = [
  {
    title: "Janela completa (D-1)",
    summary: "Processo determinístico com 24 h consolidadas",
    equationLabel: "Equação 10",
    equationDetail: "Penman–Monteith\n(FAO-56)",
    bullets: ["Leituras consolidadas (D-1)", "QA diária disponível", "Sem lacunas horárias"],
    accent: "#0f766e",
  },
  {
    title: "Janela incompleta",
    summary: "Reprocessa assim que chegam leituras ausentes",
    equationLabel: "Equação 11",
    equationDetail: "Reprocesso assíncrono\nem D+1",
    bullets: ["Reconstrução parcial", "QA marca lacunas", "Roda novamente ao fechar a janela"],
    accent: "#b45309",
  },
];

const LIFELINE_TOP = 100;
const LIFELINE_BOTTOM_OFFSET = 60;
const MESSAGE_SPACING = 115;
const FIRST_MESSAGE_Y = 160;
const ALT_BLOCK_START_Y = 300;
const ALT_BLOCK_HEIGHT = 320;
const ALT_BLOCK_GAP_FROM_MESSAGES = 90;
const MIN_SVG_WIDTH = 1000;
const MIN_SVG_HEIGHT = 780;
const ACTOR_CARD_WIDTH = 220;
const ACTOR_CARD_HALF_WIDTH = ACTOR_CARD_WIDTH / 2;
const ACTOR_HORIZONTAL_PADDING = 140;
const EXTRA_RIGHT_MARGIN = 40;

const LEGEND_ITEMS: LegendItem[] = [
  { color: "#1565c0", label: "Chamada ET₀ / upsert" },
  { color: "#0f766e", label: "Retorno / confirmação" },
  { color: "#f97316", label: "Bloco alt (Equações 10/11)" },
];

export default function Figure09_SequenciaET0() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [svgWidth, setSvgWidth] = useState(MIN_SVG_WIDTH);

  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setSvgWidth(Math.max(rect.width, MIN_SVG_WIDTH));
    }
  }, []);

  useEffect(() => {
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [updateDimensions]);

  const messageYPositions = useMemo(() => {
    return MESSAGES.map((_, index) => FIRST_MESSAGE_Y + index * MESSAGE_SPACING);
  }, []);

  const computedAltBlockStart = useMemo(() => {
    const lastMessageY = messageYPositions[messageYPositions.length - 1] ?? FIRST_MESSAGE_Y;
    return Math.max(ALT_BLOCK_START_Y, lastMessageY + ALT_BLOCK_GAP_FROM_MESSAGES);
  }, [messageYPositions]);

  const actorPositions = useMemo(() => {
    const startX = ACTOR_HORIZONTAL_PADDING;
    const endX = svgWidth - ACTOR_HORIZONTAL_PADDING - EXTRA_RIGHT_MARGIN;
    const totalSpan = Math.max(endX - startX, 1);
    const step = totalSpan / Math.max(ACTORS.length - 1, 1);
    return ACTORS.reduce<Record<ActorId, number>>((acc, actor, index) => {
      acc[actor.id] = startX + step * index;
      return acc;
    }, {} as Record<ActorId, number>);
  }, [svgWidth]);

  const altBlock = useMemo(
    () => ({
      x: 100,
      y: computedAltBlockStart,
      width: Math.max(svgWidth - 200, 640),
      height: ALT_BLOCK_HEIGHT,
    }),
    [svgWidth, computedAltBlockStart],
  );

  const svgHeight = useMemo(
    () => Math.max(MIN_SVG_HEIGHT, computedAltBlockStart + ALT_BLOCK_HEIGHT + 120),
    [computedAltBlockStart],
  );

  const legendLeftOffset = useMemo(
    () => Math.max((actorPositions.ftp ?? 0) - ACTOR_CARD_HALF_WIDTH, 0),
    [actorPositions],
  );

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
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full"
        role="img"
        data-export="lane"
        aria-labelledby="fig9-title fig9-desc"
      >
        <title id="fig9-title">Sequência simplificada do cálculo de ET₀ diária</title>
        <desc id="fig9-desc">
          ftpClient agenda a rodada de ET₀, et.calc executa Penman–Monteith/Equação 11 e etDatabase confirma o upsert idempotente.
        </desc>
        <defs>
          <linearGradient id="fig9AltGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff7ed" />
            <stop offset="100%" stopColor="#ffe8d3" />
          </linearGradient>
          <linearGradient id="fig9AltCardGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.96" />
            <stop offset="100%" stopColor="#fff1e6" stopOpacity="0.98" />
          </linearGradient>
          <linearGradient id="fig9ActorGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f0f7ff" />
            <stop offset="100%" stopColor="#e1efff" />
          </linearGradient>
          <marker id="fig9ArrowForward" markerWidth="10" markerHeight="6" refX="10" refY="3" orient="auto">
            <polygon points="0 0, 10 3, 0 6" fill="#1565c0" />
          </marker>
          <marker id="fig9ArrowReturn" markerWidth="10" markerHeight="6" refX="10" refY="3" orient="auto">
            <polygon points="0 0, 10 3, 0 6" fill="#0f766e" />
          </marker>
        </defs>
        <rect width={svgWidth} height={svgHeight} fill="#ffffff" />

        {/* Lifeline actors (boxes at top) */}
        {ACTORS.map((actor) => (
          <g key={actor.id}>
            <rect
              x={actorPositions[actor.id] - 110}
              y={16}
              width={220}
              height={76}
              rx={18}
              fill="url(#fig9ActorGrad)"
              stroke="#3b82f6"
              strokeWidth={2}
            />
            <text x={actorPositions[actor.id]} y={48} textAnchor="middle" fontSize={16} fontWeight={700} fill="#0f2747">
              {actor.label}
            </text>
            <text x={actorPositions[actor.id]} y={68} textAnchor="middle" fontSize={12} fill="#475569" opacity={0.85}>
              {actor.description}
            </text>
            {/* Lifeline dashed vertical */}
            <line
              x1={actorPositions[actor.id]}
              x2={actorPositions[actor.id]}
              y1={LIFELINE_TOP}
              y2={svgHeight - LIFELINE_BOTTOM_OFFSET}
              stroke="#94a3b8"
              strokeWidth={2.5}
              strokeDasharray="8 6"
            />
          </g>
        ))}

        {/* Alt conditional block (drawn before messages so messages appear on top) */}
        <g transform={`translate(${altBlock.x}, ${altBlock.y})`}>
          <rect
            width={altBlock.width}
            height={altBlock.height}
            rx={24}
            fill="url(#fig9AltGrad)"
            stroke="#fb923c"
            strokeWidth={1.8}
          />
          <text x={20} y={-10} fontSize={14} fontWeight={700} fill="#f97316">
            alt
          </text>
          <line
            x1={altBlock.width / 2}
            x2={altBlock.width / 2}
            y1={28}
            y2={altBlock.height - 28}
            stroke="#fb923c"
            strokeDasharray="8 6"
            strokeWidth={2}
          />
          {ALT_BRANCHES.map((branch, index) => {
            const branchWidth = altBlock.width / ALT_BRANCHES.length;
            const xOffset = index * branchWidth;
            const cardX = 24;
            const cardY = 32;
            const cardWidth = branchWidth - cardX * 2;
            const cardHeight = altBlock.height - cardY * 2;
            const contentX = cardX + 18;
            const titleY = cardY + 28;
            const summaryStartY = titleY + 22;
            const summaryLines = branch.summary.split("\n");
            const eqDetailLines = branch.equationDetail.split("\n");
            const summaryLineHeight = 16;
            const eqGroupY = summaryStartY + summaryLines.length * summaryLineHeight + 22;
            const eqCardWidth = cardWidth - 36;
            const eqCardHeight = 48 + eqDetailLines.length * 16;
            const bulletStartY = eqGroupY + eqCardHeight + 20;
            return (
              <g key={branch.title} transform={`translate(${xOffset}, 0)`}>
                <rect
                  x={cardX}
                  y={cardY}
                  width={cardWidth}
                  height={cardHeight}
                  fill="url(#fig9AltCardGrad)"
                  stroke="#fb923c"
                  strokeWidth={1.3}
                  rx={20}
                />
                <text x={contentX} y={titleY} fontSize={16} fontWeight={700} fill="#0f2747">
                  {branch.title}
                </text>
                <text x={contentX} y={summaryStartY} fontSize={13} fill={branch.accent} fontWeight={600}>
                  {summaryLines.map((line, lineIdx) => (
                    <tspan key={`${branch.title}-summary-${lineIdx}`} x={contentX} dy={lineIdx === 0 ? 0 : summaryLineHeight}>
                      {line}
                    </tspan>
                  ))}
                </text>
                <g transform={`translate(${contentX}, ${eqGroupY})`}>
                  <rect
                    x={0}
                    y={0}
                    width={eqCardWidth}
                    height={eqCardHeight}
                    fill={branch.accent}
                    opacity={0.95}
                    rx={14}
                  />
                  <text x={16} y={26} fontSize={13} fontWeight={700} fill="#ffffff">
                    {branch.equationLabel}
                  </text>
                  <text x={16} y={44} fontSize={12} fill="#fefce8">
                    {eqDetailLines.map((line, lineIdx) => (
                      <tspan key={`${branch.title}-detail-${lineIdx}`} x={16} dy={lineIdx === 0 ? 0 : 16}>
                        {line}
                      </tspan>
                    ))}
                  </text>
                </g>
                {branch.bullets.map((bullet, bulletIdx) => (
                  <g key={`${branch.title}-bullet-${bulletIdx}`} transform={`translate(${contentX}, ${bulletStartY + bulletIdx * 24})`}>
                    <circle cx={0} cy={-6} r={4.2} fill={branch.accent} />
                    <text x={12} y={-2} fontSize={13} fill="#0f172a">
                      {bullet}
                    </text>
                  </g>
                ))}
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
                strokeWidth={2.2}
                fill="none"
                markerEnd={marker}
              />
              {/* Label pill (similar to pipeline connector labels) */}
              <g transform={`translate(${midX}, ${y})`}>
                <rect
                  x={-90}
                  y={-36}
                  width={180}
                  height={28}
                  rx={14}
                  fill="white"
                  stroke="#cbd5e1"
                  strokeWidth={1.5}
                />
                <text y={-17} textAnchor="middle" fontSize={14} fontWeight={600} fill="#0f2747">
                  {message.label}
                </text>
              </g>
              {/* Detail below arrow - with background for readability */}
              <g>
                <rect
                  x={midX - 120}
                  y={y + 10}
                  width={240}
                  height={20}
                  rx={10}
                  fill="white"
                  fillOpacity={0.92}
                />
                <text
                  x={midX}
                  y={y + 24}
                  textAnchor="middle"
                  fontSize={12}
                  fill="#1e293b"
                  fontWeight={600}
                >
                  {message.detail}
                </text>
              </g>
            </g>
          );
        })}

      </svg>

      <div className="w-full" style={{ marginLeft: `${legendLeftOffset}px` }}>
        <div
          className="inline-flex flex-col gap-2 rounded-2xl border border-[#d6dee8] bg-white px-4 py-3 shadow-sm max-w-[320px]"
          data-export="legend"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#1565c0]" data-export="legend-text">
            Legenda
          </p>
          <ul className="flex flex-col gap-2 text-xs text-[#0f2747]">
            {LEGEND_ITEMS.map((item) => (
              <li key={item.label} className="flex items-center gap-2">
                <span
                  className="inline-flex h-2 w-6 rounded-full"
                  style={{ backgroundColor: item.color }}
                  data-export="legend-swatch"
                />
                <span className="font-semibold" data-export="legend-text">
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
