'use client';

import React, { useRef, useState, useEffect, RefObject } from 'react';
import {
  Sun,
  Thermometer,
  Droplets,
  Wind,
  CloudRain,
  Database,
  BarChart3,
  Download,
  FileDown,
} from 'lucide-react';
import jsPDF from 'jspdf';
import { svg2pdf } from 'svg2pdf.js';

// ==================== PALETA GLOBAL ====================
const COLORS = {
  bg: '#f7fbff',
  laneHead: '#cfe6ff',
  headText: '#0f2747',
  cardBG: '#e9f5ff',
  border: '#dde8f3',
  text: '#0e223d',
  accent: '#2a7de1',
  accent2: '#0ea5e9',
};

// ==================== TIPOS ====================
interface ConnectorConfig {
  curv?: number;
  offset?: number;
}

// ==================== UTILITÁRIOS ====================
function useConnector(
  fromRef: RefObject<HTMLElement>,
  toRef: RefObject<HTMLElement>,
  containerRef: RefObject<HTMLElement>,
  config: ConnectorConfig = {}
): string {
  const { curv = 0.3, offset = 0 } = config;
  const [path, setPath] = useState('');

  useEffect(() => {
    const updatePath = () => {
      if (!fromRef.current || !toRef.current || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const fromRect = fromRef.current.getBoundingClientRect();
      const toRect = toRef.current.getBoundingClientRect();

      // Âncora: centro-direita do from
      const x1 = fromRect.right - containerRect.left;
      const y1 = fromRect.top + fromRect.height / 2 - containerRect.top + offset;

      // Âncora: centro-esquerda do to
      const x2 = toRect.left - containerRect.left;
      const y2 = toRect.top + toRect.height / 2 - containerRect.top + offset;

      const dx = x2 - x1;
      const k = curv * Math.abs(dx);

      const d = `M ${x1} ${y1} C ${x1 + k} ${y1}, ${x2 - k} ${y2}, ${x2} ${y2}`;
      setPath(d);
    };

    updatePath();
  }, [fromRef, toRef, containerRef, curv, offset]);

  return path;
}

function useRerouteOnResize(
  containerRef: RefObject<HTMLElement>,
  deps: any[]
): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        setTick((t) => t + 1);
      });
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [containerRef, ...deps]);

  return tick;
}

function exportAsSVG(svgRef: RefObject<SVGSVGElement>, fileName: string) {
  if (!svgRef.current) return;

  const svgData = new XMLSerializer().serializeToString(svgRef.current);
  const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function exportAsPDF(svgRef: RefObject<SVGSVGElement>, fileName: string) {
  if (!svgRef.current) return;

  const svg = svgRef.current.cloneNode(true) as SVGSVGElement;
  const bbox = svgRef.current.getBBox();
  const width = bbox.width + bbox.x;
  const height = bbox.height + bbox.y;

  // Converter px para pt (1px ≈ 0.75pt)
  const pdf = new jsPDF({
    orientation: width > height ? 'landscape' : 'portrait',
    unit: 'pt',
    format: [width * 0.75, height * 0.75],
  });

  await svg2pdf(svg, pdf, {
    x: 0,
    y: 0,
    width: width * 0.75,
    height: height * 0.75,
  });

  pdf.save(fileName);
}

// ==================== COMPONENTE PRINCIPAL ====================
export default function Figure02_Encadeamento(): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Refs das variáveis
  const rsRef = useRef<HTMLDivElement>(null);
  const tempRef = useRef<HTMLDivElement>(null);
  const urRef = useRef<HTMLDivElement>(null);
  const ventRef = useRef<HTMLDivElement>(null);
  const pressRef = useRef<HTMLDivElement>(null);
  const pcpRef = useRef<HTMLDivElement>(null);
  const sRef = useRef<HTMLDivElement>(null);

  // Refs dos indicadores
  const et0Ref = useRef<HTMLDivElement>(null);
  const gddRef = useRef<HTMLDivElement>(null);
  const bhRef = useRef<HTMLDivElement>(null);

  // Refs das decisões
  const d1Ref = useRef<HTMLDivElement>(null);
  const d2Ref = useRef<HTMLDivElement>(null);
  const d3Ref = useRef<HTMLDivElement>(null);

  // Recalcular paths ao redimensionar
  const tick = useRerouteOnResize(containerRef, []);

  // Conectores: Variáveis → ET₀
  const pathRsToET0 = useConnector(rsRef, et0Ref, containerRef, { offset: 0 });
  const pathTempToET0 = useConnector(tempRef, et0Ref, containerRef, { offset: 8 });
  const pathUrToET0 = useConnector(urRef, et0Ref, containerRef, { offset: 16 });
  const pathVentToET0 = useConnector(ventRef, et0Ref, containerRef, { offset: 24 });
  const pathPressToET0 = useConnector(pressRef, et0Ref, containerRef, { offset: 32 });

  // Conectores: Variáveis → GDD
  const pathTempToGDD = useConnector(tempRef, gddRef, containerRef, { offset: 0 });

  // Conectores: Variáveis → BH
  const pathPcpToBH = useConnector(pcpRef, bhRef, containerRef, { offset: 0 });
  const pathET0ToBH = useConnector(et0Ref, bhRef, containerRef, { offset: 8 });
  const pathSToBH = useConnector(sRef, bhRef, containerRef, { offset: 16 });

  // Conectores: Indicadores → Decisões
  const pathET0ToD1 = useConnector(et0Ref, d1Ref, containerRef, { offset: 0 });
  const pathBHToD1 = useConnector(bhRef, d1Ref, containerRef, { offset: 8 });
  const pathGDDToD2 = useConnector(gddRef, d2Ref, containerRef, { offset: 0 });
  const pathGDDToD3 = useConnector(gddRef, d3Ref, containerRef, { offset: 0 });
  const pathBHToD3 = useConnector(bhRef, d3Ref, containerRef, { offset: 8 });

  return (
    <section
      aria-label="Figura 2 – Encadeamento: Variáveis → Indicadores → Decisão"
      className="w-full min-h-screen p-6 md:p-10"
      style={{ backgroundColor: COLORS.bg }}
    >
      {/* Cabeçalho */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold" style={{ color: COLORS.headText }}>
              Figura 2 – Encadeamento: Variáveis → Indicadores → Decisão
            </h2>
            <p className="text-sm mt-2 opacity-80" style={{ color: COLORS.text }}>
              Fluxo de dados agrometeorológicos para suporte à decisão agrícola
            </p>
          </div>

          {/* Toolbar de Exportação */}
          <div className="flex gap-3">
            <button
              onClick={() => exportAsSVG(svgRef, 'figura02_encadeamento.svg')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-all hover:opacity-90 shadow-md"
              style={{ backgroundColor: COLORS.accent }}
              aria-label="Exportar diagrama como SVG"
            >
              <Download size={18} />
              <span className="hidden sm:inline">SVG</span>
            </button>
            <button
              onClick={() => exportAsPDF(svgRef, 'figura02_encadeamento.pdf')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-all hover:opacity-90 shadow-md"
              style={{ backgroundColor: COLORS.accent2 }}
              aria-label="Exportar diagrama como PDF"
            >
              <FileDown size={18} />
              <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Container do Diagrama */}
      <div className="max-w-7xl mx-auto relative" ref={containerRef}>
        {/* Grid de Cartões */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-7 relative z-10">
          {/* ========== COLUNA 1: VARIÁVEIS ========== */}
          <div className="space-y-5">
            <h3
              className="text-lg font-bold px-4 py-2 rounded-xl"
              style={{ backgroundColor: COLORS.laneHead, color: COLORS.headText }}
            >
              Variáveis Meteorológicas
            </h3>

            {/* Radiação Solar */}
            <article
              ref={rsRef}
              className="bg-white rounded-2xl border shadow-md p-4 md:p-5 relative"
              style={{ borderColor: COLORS.border }}
            >
              <div className="flex items-start gap-3">
                <Sun size={22} style={{ color: COLORS.accent, flexShrink: 0 }} />
                <div>
                  <h4 className="font-semibold text-base" style={{ color: COLORS.text }}>
                    Radiação solar global
                  </h4>
                  <p className="text-sm mt-1" style={{ color: COLORS.text, opacity: 0.8 }}>
                    R<sub>s</sub> (MJ m<sup>-2</sup> d<sup>-1</sup>)
                  </p>
                </div>
              </div>
            </article>

            {/* Temperatura */}
            <article
              ref={tempRef}
              className="bg-white rounded-2xl border shadow-md p-4 md:p-5 relative"
              style={{ borderColor: COLORS.border }}
            >
              <div className="flex items-start gap-3">
                <Thermometer size={22} style={{ color: COLORS.accent, flexShrink: 0 }} />
                <div>
                  <h4 className="font-semibold text-base" style={{ color: COLORS.text }}>
                    Temperatura (média/máx./mín.)
                  </h4>
                  <p className="text-sm mt-1" style={{ color: COLORS.text, opacity: 0.8 }}>
                    T, T<sub>max</sub>, T<sub>min</sub> (°C)
                  </p>
                </div>
              </div>
            </article>

            {/* Umidade Relativa */}
            <article
              ref={urRef}
              className="bg-white rounded-2xl border shadow-md p-4 md:p-5 relative"
              style={{ borderColor: COLORS.border }}
            >
              <div className="flex items-start gap-3">
                <Droplets size={22} style={{ color: COLORS.accent, flexShrink: 0 }} />
                <div>
                  <h4 className="font-semibold text-base" style={{ color: COLORS.text }}>
                    Umidade relativa
                  </h4>
                  <p className="text-sm mt-1" style={{ color: COLORS.text, opacity: 0.8 }}>
                    UR (%)
                  </p>
                </div>
              </div>
            </article>

            {/* Vento */}
            <article
              ref={ventRef}
              className="bg-white rounded-2xl border shadow-md p-4 md:p-5 relative"
              style={{ borderColor: COLORS.border }}
            >
              <div className="flex items-start gap-3">
                <Wind size={22} style={{ color: COLORS.accent, flexShrink: 0 }} />
                <div>
                  <h4 className="font-semibold text-base" style={{ color: COLORS.text }}>
                    Vento a 2 m
                  </h4>
                  <p className="text-sm mt-1" style={{ color: COLORS.text, opacity: 0.8 }}>
                    u<sub>2</sub> (m s<sup>-1</sup>)
                  </p>
                </div>
              </div>
            </article>

            {/* Pressão */}
            <article
              ref={pressRef}
              className="bg-white rounded-2xl border shadow-md p-4 md:p-5 relative"
              style={{ borderColor: COLORS.border }}
            >
              <div className="flex items-start gap-3">
                <BarChart3 size={22} style={{ color: COLORS.accent, flexShrink: 0 }} />
                <div>
                  <h4 className="font-semibold text-base" style={{ color: COLORS.text }}>
                    Pressão atmosférica (ou altitude)
                  </h4>
                  <p className="text-sm mt-1" style={{ color: COLORS.text, opacity: 0.8 }}>
                    P (kPa) / z (m)
                  </p>
                </div>
              </div>
            </article>

            {/* Precipitação */}
            <article
              ref={pcpRef}
              className="bg-white rounded-2xl border shadow-md p-4 md:p-5 relative"
              style={{ borderColor: COLORS.border }}
            >
              <div className="flex items-start gap-3">
                <CloudRain size={22} style={{ color: COLORS.accent, flexShrink: 0 }} />
                <div>
                  <h4 className="font-semibold text-base" style={{ color: COLORS.text }}>
                    Precipitação observada
                  </h4>
                  <p className="text-sm mt-1" style={{ color: COLORS.text, opacity: 0.8 }}>
                    Pcp (mm)
                  </p>
                </div>
              </div>
            </article>

            {/* Armazenamento */}
            <article
              ref={sRef}
              className="bg-white rounded-2xl border shadow-md p-4 md:p-5 relative"
              style={{ borderColor: COLORS.border }}
            >
              <div className="flex items-start gap-3">
                <Database size={22} style={{ color: COLORS.accent, flexShrink: 0 }} />
                <div>
                  <h4 className="font-semibold text-base" style={{ color: COLORS.text }}>
                    Armazenamento de água no solo
                  </h4>
                  <p className="text-sm mt-1" style={{ color: COLORS.text, opacity: 0.8 }}>
                    S (mm)
                  </p>
                </div>
              </div>
            </article>
          </div>

          {/* ========== COLUNA 2: INDICADORES ========== */}
          <div className="space-y-5">
            <h3
              className="text-lg font-bold px-4 py-2 rounded-xl"
              style={{ backgroundColor: COLORS.laneHead, color: COLORS.headText }}
            >
              Indicadores Agrometeorológicos
            </h3>

            {/* ET₀ */}
            <article
              ref={et0Ref}
              className="bg-white rounded-2xl border shadow-md p-4 md:p-5 relative"
              style={{ borderColor: COLORS.border }}
            >
              <div>
                <h4 className="font-semibold text-base" style={{ color: COLORS.text }}>
                  ET₀ (mm d<sup>-1</sup>)
                </h4>
                <p className="text-sm mt-2" style={{ color: COLORS.text, opacity: 0.8 }}>
                  Evapotranspiração de referência calculada pelo método Penman–Monteith FAO-56
                </p>
              </div>
            </article>

            {/* GDD */}
            <article
              ref={gddRef}
              className="bg-white rounded-2xl border shadow-md p-4 md:p-5 relative"
              style={{ borderColor: COLORS.border }}
            >
              <div>
                <h4 className="font-semibold text-base" style={{ color: COLORS.text }}>
                  GDD (°C·d)
                </h4>
                <p className="text-sm mt-2" style={{ color: COLORS.text, opacity: 0.8 }}>
                  Graus-dia de crescimento: Σ[(T<sub>max</sub> + T<sub>min</sub>)/2 − T
                  <sub>base</sub>]
                </p>
              </div>
            </article>

            {/* BH */}
            <article
              ref={bhRef}
              className="bg-white rounded-2xl border shadow-md p-4 md:p-5 relative"
              style={{ borderColor: COLORS.border }}
            >
              <div>
                <h4 className="font-semibold text-base" style={{ color: COLORS.text }}>
                  Balanço hídrico — BH (mm)
                </h4>
                <p className="text-sm mt-2" style={{ color: COLORS.text, opacity: 0.8 }}>
                  BH = Pcp − ET₀ ± ΔS
                </p>
              </div>
            </article>
          </div>

          {/* ========== COLUNA 3: DECISÕES ========== */}
          <div className="space-y-5">
            <h3
              className="text-lg font-bold px-4 py-2 rounded-xl"
              style={{ backgroundColor: COLORS.laneHead, color: COLORS.headText }}
            >
              Decisões de Manejo
            </h3>

            {/* D1 */}
            <article
              ref={d1Ref}
              className="bg-white rounded-2xl border shadow-md p-4 md:p-5 relative"
              style={{ borderColor: COLORS.border }}
            >
              <div>
                <h4 className="font-semibold text-base" style={{ color: COLORS.text }}>
                  D1 — Decisão de irrigação
                </h4>
                <ul className="text-sm mt-2 space-y-1" style={{ color: COLORS.text, opacity: 0.8 }}>
                  <li>• Lâmina</li>
                  <li>• Momento</li>
                  <li>• Déficit tolerável</li>
                </ul>
              </div>
            </article>

            {/* D2 */}
            <article
              ref={d2Ref}
              className="bg-white rounded-2xl border shadow-md p-4 md:p-5 relative"
              style={{ borderColor: COLORS.border }}
            >
              <div>
                <h4 className="font-semibold text-base" style={{ color: COLORS.text }}>
                  D2 — Manejo fitossanitário
                </h4>
                <ul className="text-sm mt-2 space-y-1" style={{ color: COLORS.text, opacity: 0.8 }}>
                  <li>• Risco de doenças</li>
                  <li>• Janela térmica</li>
                  <li>• Condições de vento</li>
                </ul>
              </div>
            </article>

            {/* D3 */}
            <article
              ref={d3Ref}
              className="bg-white rounded-2xl border shadow-md p-4 md:p-5 relative"
              style={{ borderColor: COLORS.border }}
            >
              <div>
                <h4 className="font-semibold text-base" style={{ color: COLORS.text }}>
                  D3 — Planejamento operacional
                </h4>
                <ul className="text-sm mt-2 space-y-1" style={{ color: COLORS.text, opacity: 0.8 }}>
                  <li>• Janela de colheita</li>
                  <li>• Risco de chuva</li>
                  <li>• GDD acumulado</li>
                </ul>
              </div>
            </article>
          </div>
        </div>

        {/* Camada de SVG para Conectores */}
        <svg
          ref={svgRef}
          className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
          style={{ zIndex: 5 }}
        >
          <defs>
            <marker
              id="arrowHead"
              markerWidth="10"
              markerHeight="8"
              refX="9"
              refY="4"
              orient="auto"
            >
              <polygon points="0 0, 10 4, 0 8" fill={COLORS.accent} />
            </marker>
          </defs>

          {/* Variáveis → ET₀ */}
          {pathRsToET0 && (
            <path
              d={pathRsToET0}
              stroke={COLORS.accent}
              strokeWidth={2.5}
              fill="none"
              markerEnd="url(#arrowHead)"
            >
              <title>Rs → ET₀</title>
            </path>
          )}
          {pathTempToET0 && (
            <path
              d={pathTempToET0}
              stroke={COLORS.accent}
              strokeWidth={2.5}
              fill="none"
              markerEnd="url(#arrowHead)"
            >
              <title>Temperatura → ET₀</title>
            </path>
          )}
          {pathUrToET0 && (
            <path
              d={pathUrToET0}
              stroke={COLORS.accent}
              strokeWidth={2.5}
              fill="none"
              markerEnd="url(#arrowHead)"
            >
              <title>UR → ET₀</title>
            </path>
          )}
          {pathVentToET0 && (
            <path
              d={pathVentToET0}
              stroke={COLORS.accent}
              strokeWidth={2.5}
              fill="none"
              markerEnd="url(#arrowHead)"
            >
              <title>Vento → ET₀</title>
            </path>
          )}
          {pathPressToET0 && (
            <path
              d={pathPressToET0}
              stroke={COLORS.accent}
              strokeWidth={2.5}
              fill="none"
              markerEnd="url(#arrowHead)"
            >
              <title>Pressão → ET₀</title>
            </path>
          )}

          {/* Variáveis → GDD */}
          {pathTempToGDD && (
            <path
              d={pathTempToGDD}
              stroke={COLORS.accent}
              strokeWidth={2.5}
              fill="none"
              markerEnd="url(#arrowHead)"
            >
              <title>Temperatura → GDD</title>
            </path>
          )}

          {/* Variáveis → BH */}
          {pathPcpToBH && (
            <path
              d={pathPcpToBH}
              stroke={COLORS.accent}
              strokeWidth={2.5}
              fill="none"
              markerEnd="url(#arrowHead)"
            >
              <title>Pcp → BH</title>
            </path>
          )}
          {pathET0ToBH && (
            <path
              d={pathET0ToBH}
              stroke={COLORS.accent}
              strokeWidth={2.5}
              fill="none"
              markerEnd="url(#arrowHead)"
            >
              <title>ET₀ → BH</title>
            </path>
          )}
          {pathSToBH && (
            <path
              d={pathSToBH}
              stroke={COLORS.accent}
              strokeWidth={2.5}
              fill="none"
              markerEnd="url(#arrowHead)"
            >
              <title>S → BH</title>
            </path>
          )}

          {/* Indicadores → Decisões */}
          {pathET0ToD1 && (
            <path
              d={pathET0ToD1}
              stroke={COLORS.accent}
              strokeWidth={2.5}
              fill="none"
              markerEnd="url(#arrowHead)"
            >
              <title>ET₀ → D1</title>
            </path>
          )}
          {pathBHToD1 && (
            <path
              d={pathBHToD1}
              stroke={COLORS.accent}
              strokeWidth={2.5}
              fill="none"
              markerEnd="url(#arrowHead)"
            >
              <title>BH → D1</title>
            </path>
          )}
          {pathGDDToD2 && (
            <path
              d={pathGDDToD2}
              stroke={COLORS.accent}
              strokeWidth={2.5}
              fill="none"
              markerEnd="url(#arrowHead)"
            >
              <title>GDD → D2</title>
            </path>
          )}
          {pathGDDToD3 && (
            <path
              d={pathGDDToD3}
              stroke={COLORS.accent}
              strokeWidth={2.5}
              fill="none"
              markerEnd="url(#arrowHead)"
            >
              <title>GDD → D3</title>
            </path>
          )}
          {pathBHToD3 && (
            <path
              d={pathBHToD3}
              stroke={COLORS.accent}
              strokeWidth={2.5}
              fill="none"
              markerEnd="url(#arrowHead)"
            >
              <title>BH → D3</title>
            </path>
          )}
        </svg>
      </div>

      {/* Rodapé */}
      <div className="max-w-7xl mx-auto mt-8">
        <p className="text-xs text-center" style={{ color: COLORS.text, opacity: 0.6 }}>
          ET₀ conforme Penman–Monteith FAO-56 | Variáveis segundo WMO-No. 8
        </p>
      </div>
    </section>
  );
}
