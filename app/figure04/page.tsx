'use client';

import React, { useRef, useState, useEffect, RefObject } from 'react';
import {
  Database,
  Settings2,
  Calculator,
  DropletIcon as Water,
  BellRing,
  MessageSquare,
  ArrowLeftRight,
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

      const x1 = fromRect.right - containerRect.left;
      const y1 = fromRect.top + fromRect.height / 2 - containerRect.top + offset;

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
export default function Figure04_DSS_Pipeline(): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Refs das etapas
  const ingestaoRef = useRef<HTMLDivElement>(null);
  const qaqcRef = useRef<HTMLDivElement>(null);
  const et0Ref = useRef<HTMLDivElement>(null);
  const bhRef = useRef<HTMLDivElement>(null);
  const recomRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);

  const tick = useRerouteOnResize(containerRef, []);

  // Conectores sequenciais
  const pathIngestaoToQAQC = useConnector(ingestaoRef, qaqcRef, containerRef, { offset: 0 });
  const pathQAQCToET0 = useConnector(qaqcRef, et0Ref, containerRef, { offset: 0 });
  const pathET0ToBH = useConnector(et0Ref, bhRef, containerRef, { offset: 0 });
  const pathBHToRecom = useConnector(bhRef, recomRef, containerRef, { offset: 0 });
  const pathRecomToNotif = useConnector(recomRef, notifRef, containerRef, { offset: 0 });
  const pathNotifToFeedback = useConnector(notifRef, feedbackRef, containerRef, { offset: 0 });

  return (
    <section
      aria-label="Figura 4 – Pipeline DSS de Irrigação"
      className="w-full min-h-screen p-6 md:p-10"
      style={{ backgroundColor: COLORS.bg }}
    >
      {/* Cabeçalho */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold" style={{ color: COLORS.headText }}>
              Figura 4 – Pipeline DSS de Irrigação
            </h2>
            <p className="text-sm mt-2 opacity-80" style={{ color: COLORS.text }}>
              Fluxo de dados → indicadores → recomendação → ação
            </p>
          </div>

          {/* Toolbar de Exportação */}
          <div className="flex gap-3">
            <button
              onClick={() => exportAsSVG(svgRef, 'figura04_dss_pipeline.svg')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-all hover:opacity-90 shadow-md"
              style={{ backgroundColor: COLORS.accent }}
              aria-label="Exportar diagrama como SVG"
            >
              <Download size={18} />
              <span className="hidden sm:inline">SVG</span>
            </button>
            <button
              onClick={() => exportAsPDF(svgRef, 'figura04_dss_pipeline.pdf')}
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-7 relative z-10">
          {/* Coluna 1 */}
          <div className="space-y-5">
            {/* Ingestão */}
            <article
              ref={ingestaoRef}
              className="bg-white rounded-2xl border shadow-md p-4 md:p-5 relative"
              style={{ borderColor: COLORS.border }}
            >
              <div className="flex items-start gap-3">
                <Database size={22} style={{ color: COLORS.accent, flexShrink: 0 }} />
                <div className="flex-1">
                  <h4 className="font-semibold text-base" style={{ color: COLORS.text }}>
                    1. Ingestão
                  </h4>
                  <p className="text-sm mt-2" style={{ color: COLORS.text, opacity: 0.8 }}>
                    Streams, APIs, estações automáticas
                  </p>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <span
                      className="text-xs px-2 py-1 rounded"
                      style={{ backgroundColor: COLORS.cardBG, color: COLORS.text }}
                    >
                      Latência: &lt;1s
                    </span>
                    <span
                      className="text-xs px-2 py-1 rounded"
                      style={{ backgroundColor: COLORS.cardBG, color: COLORS.text }}
                    >
                      Disponib.: 99.5%
                    </span>
                  </div>
                </div>
              </div>
            </article>

            {/* QA/QC */}
            <article
              ref={qaqcRef}
              className="bg-white rounded-2xl border shadow-md p-4 md:p-5 relative"
              style={{ borderColor: COLORS.border }}
            >
              <div className="flex items-start gap-3">
                <Settings2 size={22} style={{ color: COLORS.accent, flexShrink: 0 }} />
                <div className="flex-1">
                  <h4 className="font-semibold text-base" style={{ color: COLORS.text }}>
                    2. QA/QC
                  </h4>
                  <p className="text-sm mt-2" style={{ color: COLORS.text, opacity: 0.8 }}>
                    Limites físicos, consistência, flags
                  </p>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <span
                      className="text-xs px-2 py-1 rounded"
                      style={{ backgroundColor: COLORS.cardBG, color: COLORS.text }}
                    >
                      Latência: &lt;500ms
                    </span>
                    <span
                      className="text-xs px-2 py-1 rounded"
                      style={{ backgroundColor: COLORS.cardBG, color: COLORS.text }}
                    >
                      Disponib.: 99.9%
                    </span>
                  </div>
                  {/* Diamante (gate) */}
                  <div className="mt-3 flex items-center gap-2">
                    <svg width="20" height="20" viewBox="0 0 20 20">
                      <polygon
                        points="10,2 18,10 10,18 2,10"
                        fill="none"
                        stroke={COLORS.accent}
                        strokeWidth="2"
                      />
                    </svg>
                    <span className="text-xs" style={{ color: COLORS.text, opacity: 0.7 }}>
                      Gate de qualidade
                    </span>
                  </div>
                </div>
              </div>
            </article>

            {/* ET₀ */}
            <article
              ref={et0Ref}
              className="bg-white rounded-2xl border shadow-md p-4 md:p-5 relative"
              style={{ borderColor: COLORS.border }}
            >
              <div className="flex items-start gap-3">
                <Calculator size={22} style={{ color: COLORS.accent, flexShrink: 0 }} />
                <div className="flex-1">
                  <h4 className="font-semibold text-base" style={{ color: COLORS.text }}>
                    3. Cálculo ET₀
                  </h4>
                  <p className="text-sm mt-2" style={{ color: COLORS.text, opacity: 0.8 }}>
                    Penman–Monteith FAO-56
                  </p>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <span
                      className="text-xs px-2 py-1 rounded"
                      style={{ backgroundColor: COLORS.cardBG, color: COLORS.text }}
                    >
                      Latência: &lt;100ms
                    </span>
                    <span
                      className="text-xs px-2 py-1 rounded"
                      style={{ backgroundColor: COLORS.cardBG, color: COLORS.text }}
                    >
                      Disponib.: 99.95%
                    </span>
                  </div>
                </div>
              </div>
            </article>
          </div>

          {/* Coluna 2 */}
          <div className="space-y-5">
            {/* Balanço Hídrico */}
            <article
              ref={bhRef}
              className="bg-white rounded-2xl border shadow-md p-4 md:p-5 relative"
              style={{ borderColor: COLORS.border }}
            >
              <div className="flex items-start gap-3">
                <Water size={22} style={{ color: COLORS.accent, flexShrink: 0 }} />
                <div className="flex-1">
                  <h4 className="font-semibold text-base" style={{ color: COLORS.text }}>
                    4. Balanço hídrico
                  </h4>
                  <p className="text-sm mt-2" style={{ color: COLORS.text, opacity: 0.8 }}>
                    BH = Pcp − ET₀ ± ΔS
                  </p>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <span
                      className="text-xs px-2 py-1 rounded"
                      style={{ backgroundColor: COLORS.cardBG, color: COLORS.text }}
                    >
                      Latência: &lt;200ms
                    </span>
                    <span
                      className="text-xs px-2 py-1 rounded"
                      style={{ backgroundColor: COLORS.cardBG, color: COLORS.text }}
                    >
                      Disponib.: 99.9%
                    </span>
                  </div>
                </div>
              </div>
            </article>

            {/* Recomendação */}
            <article
              ref={recomRef}
              className="bg-white rounded-2xl border shadow-md p-4 md:p-5 relative"
              style={{ borderColor: COLORS.border }}
            >
              <div className="flex items-start gap-3">
                <ArrowLeftRight size={22} style={{ color: COLORS.accent, flexShrink: 0 }} />
                <div className="flex-1">
                  <h4 className="font-semibold text-base" style={{ color: COLORS.text }}>
                    5. Recomendação
                  </h4>
                  <p className="text-sm mt-2" style={{ color: COLORS.text, opacity: 0.8 }}>
                    Lâmina de irrigação, janela de aplicação
                  </p>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <span
                      className="text-xs px-2 py-1 rounded"
                      style={{ backgroundColor: COLORS.cardBG, color: COLORS.text }}
                    >
                      Latência: &lt;300ms
                    </span>
                    <span
                      className="text-xs px-2 py-1 rounded"
                      style={{ backgroundColor: COLORS.cardBG, color: COLORS.text }}
                    >
                      Disponib.: 99.8%
                    </span>
                  </div>
                </div>
              </div>
            </article>

            {/* Notificação */}
            <article
              ref={notifRef}
              className="bg-white rounded-2xl border shadow-md p-4 md:p-5 relative"
              style={{ borderColor: COLORS.border }}
            >
              <div className="flex items-start gap-3">
                <BellRing size={22} style={{ color: COLORS.accent, flexShrink: 0 }} />
                <div className="flex-1">
                  <h4 className="font-semibold text-base" style={{ color: COLORS.text }}>
                    6. Notificação
                  </h4>
                  <p className="text-sm mt-2" style={{ color: COLORS.text, opacity: 0.8 }}>
                    App, SMS, e-mail
                  </p>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <span
                      className="text-xs px-2 py-1 rounded"
                      style={{ backgroundColor: COLORS.cardBG, color: COLORS.text }}
                    >
                      Latência: &lt;2s
                    </span>
                    <span
                      className="text-xs px-2 py-1 rounded"
                      style={{ backgroundColor: COLORS.cardBG, color: COLORS.text }}
                    >
                      Disponib.: 99.5%
                    </span>
                  </div>
                </div>
              </div>
            </article>
          </div>

          {/* Coluna 3 */}
          <div className="space-y-5">
            {/* Feedback */}
            <article
              ref={feedbackRef}
              className="bg-white rounded-2xl border shadow-md p-4 md:p-5 relative"
              style={{ borderColor: COLORS.border }}
            >
              <div className="flex items-start gap-3">
                <MessageSquare size={22} style={{ color: COLORS.accent2, flexShrink: 0 }} />
                <div className="flex-1">
                  <h4 className="font-semibold text-base" style={{ color: COLORS.text }}>
                    7. Feedback de campo
                  </h4>
                  <p className="text-sm mt-2" style={{ color: COLORS.text, opacity: 0.8 }}>
                    Fechamento do ciclo: confirmação da aplicação, observações, ajustes
                  </p>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <span
                      className="text-xs px-2 py-1 rounded"
                      style={{ backgroundColor: COLORS.cardBG, color: COLORS.text }}
                    >
                      Latência: variável
                    </span>
                    <span
                      className="text-xs px-2 py-1 rounded"
                      style={{ backgroundColor: COLORS.cardBG, color: COLORS.text }}
                    >
                      Disponib.: 98%
                    </span>
                  </div>
                </div>
              </div>
            </article>

            {/* Informação complementar */}
            <div
              className="bg-white rounded-2xl border shadow-md p-4 md:p-5"
              style={{ borderColor: COLORS.border }}
            >
              <h4 className="font-semibold text-sm mb-2" style={{ color: COLORS.text }}>
                Pontos de controle
              </h4>
              <ul className="text-xs space-y-1" style={{ color: COLORS.text, opacity: 0.75 }}>
                <li>• Gates de qualidade após QA/QC</li>
                <li>• Monitoração de latência end-to-end</li>
                <li>• SLAs de disponibilidade por etapa</li>
                <li>• Auditoria de decisões e ações</li>
              </ul>
            </div>
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

          {pathIngestaoToQAQC && (
            <path
              d={pathIngestaoToQAQC}
              stroke={COLORS.accent}
              strokeWidth={2.5}
              fill="none"
              markerEnd="url(#arrowHead)"
            >
              <title>Ingestão → QA/QC</title>
            </path>
          )}
          {pathQAQCToET0 && (
            <path
              d={pathQAQCToET0}
              stroke={COLORS.accent}
              strokeWidth={2.5}
              fill="none"
              markerEnd="url(#arrowHead)"
            >
              <title>QA/QC → ET₀</title>
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
              <title>ET₀ → Balanço Hídrico</title>
            </path>
          )}
          {pathBHToRecom && (
            <path
              d={pathBHToRecom}
              stroke={COLORS.accent}
              strokeWidth={2.5}
              fill="none"
              markerEnd="url(#arrowHead)"
            >
              <title>BH → Recomendação</title>
            </path>
          )}
          {pathRecomToNotif && (
            <path
              d={pathRecomToNotif}
              stroke={COLORS.accent}
              strokeWidth={2.5}
              fill="none"
              markerEnd="url(#arrowHead)"
            >
              <title>Recomendação → Notificação</title>
            </path>
          )}
          {pathNotifToFeedback && (
            <path
              d={pathNotifToFeedback}
              stroke={COLORS.accent}
              strokeWidth={2.5}
              fill="none"
              markerEnd="url(#arrowHead)"
            >
              <title>Notificação → Feedback</title>
            </path>
          )}
        </svg>
      </div>

      {/* Rodapé */}
      <div className="max-w-7xl mx-auto mt-8">
        <p className="text-xs text-center" style={{ color: COLORS.text, opacity: 0.6 }}>
          ET₀ conforme FAO-56 | Métricas de disponibilidade/tempestividade inspiradas no WDQMS
        </p>
      </div>
    </section>
  );
}
