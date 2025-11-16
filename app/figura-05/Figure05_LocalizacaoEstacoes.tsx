"use client";

import React, { useMemo, useRef } from "react";

import { exportAsSVG, exportDiagramPDF } from "../figura-02/Figure02_Encadeamento";
import type { StationMetadata } from "../../types/figureModels";

const COLORS = {
  background: "#f7faff",
  border: "#d1d9e0",
  text: "#0f2747",
  grid: "#d7e3f4",
  shoreline: "#dceffe",
  plugfield: "#1565c0",
  ativa: "#0d9488",
  sigma: "#7c3aed",
};

const stations: StationMetadata[] = [
  {
    id: "sfs",
    estacao: "São Francisco de Sales",
    municipio: "São Francisco de Sales/MG",
    provider: "Plugfield",
    latitude: -19.8612,
    longitude: -49.7689,
    altitudeM: 437,
  },
  {
    id: "prata",
    estacao: "Prata",
    municipio: "Prata/MG",
    provider: "Plugfield",
    latitude: -19.3088,
    longitude: -48.9276,
    altitudeM: 630,
  },
  {
    id: "aparecida",
    estacao: "Aparecida de Minas",
    municipio: "Frutal/MG",
    provider: "Ativa",
    latitude: -20.1119,
    longitude: -49.232,
    altitudeM: 463,
  },
  {
    id: "frutal",
    estacao: "Frutal (Ativa)",
    municipio: "Frutal/MG",
    provider: "Ativa",
    latitude: -20.0303,
    longitude: -48.9356,
    altitudeM: 525,
  },
  {
    id: "pirajuba",
    estacao: "Pirajuba e Campo Florido",
    municipio: "Pirajuba/MG",
    provider: "Plugfield",
    latitude: -19.8710175519,
    longitude: -48.6554272745,
    altitudeM: 584,
  },
  {
    id: "planura",
    estacao: "Planura",
    municipio: "Planura/MG",
    provider: "Plugfield",
    latitude: -20.1417355955,
    longitude: -48.7038773682,
    altitudeM: 475,
  },
  {
    id: "frutalSigma",
    estacao: "Frutal (Sigma)",
    municipio: "Frutal/MG",
    provider: "Sigma",
    latitude: -20.0183,
    longitude: -48.9517,
    altitudeM: 519,
  },
];

const VIEWBOX = { width: 940, height: 600 };
const MAP_PADDING = 80;
const LAT_MIN = Math.min(...stations.map((s) => s.latitude));
const LAT_MAX = Math.max(...stations.map((s) => s.latitude));
const LON_MIN = Math.min(...stations.map((s) => s.longitude));
const LON_MAX = Math.max(...stations.map((s) => s.longitude));

const providerColor = (provider: string) => {
  if (provider === "Plugfield") return COLORS.plugfield;
  if (provider === "Ativa") return COLORS.ativa;
  if (provider === "Sigma") return COLORS.sigma;
  return COLORS.text;
};

export default function Figure05_LocalizacaoEstacoes() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const mapNodes = useMemo(() => {
    const width = VIEWBOX.width - MAP_PADDING * 2;
    const height = VIEWBOX.height - MAP_PADDING * 2;
    const latSpan = LAT_MAX - LAT_MIN;
    const lonSpan = LON_MAX - LON_MIN;
    return stations.map((station) => {
      const x = MAP_PADDING + ((station.longitude - LON_MIN) / lonSpan) * width;
      const y = MAP_PADDING + ((LAT_MAX - station.latitude) / latSpan) * height;
      return {
        ...station,
        x,
        y,
      };
    });
  }, []);

  const gridLines = useMemo(() => {
    const lines: { type: "lat" | "lon"; value: number; x1: number; x2: number; y1: number; y2: number }[] = [];
    const latStep = 0.1;
    const lonStep = 0.1;
    for (let lat = Math.ceil(LAT_MIN / latStep) * latStep; lat <= LAT_MAX + 0.0001; lat += latStep) {
      const y =
        MAP_PADDING +
        ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) *
          (VIEWBOX.height - MAP_PADDING * 2);
      lines.push({ type: "lat", value: lat, x1: MAP_PADDING, x2: VIEWBOX.width - MAP_PADDING, y1: y, y2: y });
    }
    for (let lon = Math.ceil(LON_MIN / lonStep) * lonStep; lon <= LON_MAX + 0.0001; lon += lonStep) {
      const x =
        MAP_PADDING +
        ((lon - LON_MIN) / (LON_MAX - LON_MIN)) *
          (VIEWBOX.width - MAP_PADDING * 2);
      lines.push({ type: "lon", value: lon, x1: x, x2: x, y1: MAP_PADDING, y2: VIEWBOX.height - MAP_PADDING });
    }
    return lines;
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative rounded-3xl border border-[#d1d9e0] bg-white p-6 shadow-xl"
      aria-label="Figura 5 – Localização aproximada das estações Redeagromet"
      data-figure="5"
    >
      <div className="absolute right-6 top-6 z-10 flex gap-3">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border-2 border-[#1565c0] bg-white px-4 py-2 text-sm font-semibold text-[#0f2747] shadow-sm transition hover:bg-[#f5f5f5]"
          onClick={() => exportAsSVG(svgRef, "Figura05_Mapa.svg")}
        >
          Exportar SVG
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border-2 border-[#1565c0] bg-white px-4 py-2 text-sm font-semibold text-[#0f2747] shadow-sm transition hover:bg-[#f5f5f5]"
          onClick={() => void exportDiagramPDF(svgRef, containerRef, "Figura05_Mapa.pdf")}
        >
          Exportar PDF
        </button>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
        width="100%"
        height="100%"
        role="img"
        aria-labelledby="fig5-title fig5-desc"
        className="mt-12"
      >
        <title id="fig5-title">Localização aproximada das estações operacionais</title>
        <desc id="fig5-desc">
          Mapa esquemático do Triângulo Mineiro Sul com estações automáticas da Redeagromet e altitudes.
        </desc>

        <rect
          x="0"
          y="0"
          width={VIEWBOX.width}
          height={VIEWBOX.height}
          fill={COLORS.background}
          rx="32"
          ry="32"
        />
        <rect
          x={MAP_PADDING - 10}
          y={MAP_PADDING - 10}
          width={VIEWBOX.width - (MAP_PADDING - 10) * 2}
          height={VIEWBOX.height - (MAP_PADDING - 10) * 2}
          fill="#ffffff"
          stroke={COLORS.border}
          strokeWidth={2}
          rx="24"
        />

        {gridLines.map((line) => (
          <g key={`${line.type}-${line.value.toFixed(2)}`}>
            <line
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={COLORS.grid}
              strokeWidth={1}
              strokeDasharray="4 6"
            />
            <text
              x={line.type === "lat" ? line.x1 - 12 : line.x1 + 4}
              y={line.type === "lat" ? line.y1 - 4 : line.y2 + 16}
              fontSize={11}
              fill={COLORS.text}
              textAnchor={line.type === "lat" ? "end" : "start"}
              fontWeight={500}
            >
              {line.type === "lat" ? `${Math.abs(line.value).toFixed(1)}°S` : `${Math.abs(line.value).toFixed(1)}°W`}
            </text>
          </g>
        ))}

        <path
          d={`M ${MAP_PADDING} ${MAP_PADDING + 60} Q ${(MAP_PADDING + VIEWBOX.width) / 2} ${MAP_PADDING - 40} ${
            VIEWBOX.width - MAP_PADDING
          } ${MAP_PADDING + 80} L ${VIEWBOX.width - MAP_PADDING} ${VIEWBOX.height - MAP_PADDING - 50} Q ${
            MAP_PADDING + VIEWBOX.width / 2
          } ${VIEWBOX.height - MAP_PADDING + 30} ${MAP_PADDING + 20} ${VIEWBOX.height - MAP_PADDING}`}
          fill={COLORS.shoreline}
          opacity={0.5}
        />

        {mapNodes.map((station) => (
          <g key={station.id}>
            <circle cx={station.x} cy={station.y} r={10} fill="#ffffff" stroke={providerColor(station.provider)} strokeWidth={3} />
            <circle cx={station.x} cy={station.y} r={3.5} fill={providerColor(station.provider)} />
            <text
              x={station.x + 16}
              y={station.y - 8}
              fontSize={13}
              fill={COLORS.text}
              fontWeight={600}
            >
              {station.estacao}
            </text>
            <text x={station.x + 16} y={station.y + 10} fontSize={11} fill={COLORS.text} opacity={0.85}>
              {station.municipio}
            </text>
            <text x={station.x + 16} y={station.y + 26} fontSize={11} fill={COLORS.text} opacity={0.85}>
              {station.altitudeM} m
            </text>
          </g>
        ))}

        <g transform={`translate(${MAP_PADDING}, ${MAP_PADDING - 40})`}>
          <text fontSize={18} fontWeight={600} fill={COLORS.text}>
            Redeagromet – Estações operacionais (UTM, passo aproximado 0,1°)
          </text>
        </g>

        <g transform={`translate(${MAP_PADDING}, ${VIEWBOX.height - MAP_PADDING + 20})`}>
          <rect width={280} height={96} fill="#ffffff" stroke={COLORS.border} rx={16} />
          <g transform="translate(16, 16)">
            <circle cx={10} cy={10} r={8} fill="none" stroke={COLORS.plugfield} strokeWidth={2} />
            <circle cx={10} cy={10} r={3} fill={COLORS.plugfield} />
            <text x={32} y={12} fontSize={13} fill={COLORS.text} fontWeight={600}>
              Estação automática operacional
            </text>
            <text x={32} y={30} fontSize={12} fill={COLORS.text} opacity={0.8}>
              Provedores: Plugfield, Ativa, Sigma
            </text>
          </g>
          <g transform="translate(16, 56)">
            <circle cx={10} cy={10} r={6} fill="#ffffff" stroke={COLORS.plugfield} strokeWidth={3} />
            <text x={26} y={14} fontSize={12} fill={COLORS.text}>
              Cor do aro identifica o provedor
            </text>
          </g>
        </g>
      </svg>
    </section>
  );
}
