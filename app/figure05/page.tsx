'use client';

import React, { useRef, useState, useEffect, RefObject } from 'react';
import {
  TrendingUp,
  Activity,
  AlertTriangle,
  RotateCcw,
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
  warning: '#f59e0b',
  danger: '#ef4444',
};

// ==================== TIPOS ====================
interface ConnectorConfig {
  curv?: number;
  offset?: number;
  dashed?: boolean;
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
export default function Figure05_WalkForward_MLOps(): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Refs
  const trainRef = useRef<HTMLDivElement>(null);
  const valRef = useRef<HTMLDivElement>(null);
  const testRef = useRef<HTMLDivElement>(null);
  const deployRef = useRef<HTMLDivElement>(null);
  const monitorRef = useRef<HTMLDivElement>(null);
  const driftRef = useRef<HTMLDivElement>(null);
  const retrainRef = useRef<HTMLDivElement>(null);

  const tick = useRerouteOnResize(containerRef, []);

  // Conectores
  const pathTrainToVal = useConnector(trainRef, valRef, containerRef, { offset: 0 });
  const pathValToTest = useConnector(valRef, testRef, containerRef, { offset: 0 });
  const pathTestToDeploy = useConnector(testRef, deployRef, containerRef, { offset: 0 });
  const pathDeployToMonitor = useConnector(deployRef, monitorRef, containerRef, { offset: 0 });
  const pathMonitorToDrift = useConnector(monitorRef, driftRef, containerRef, { offset: 0 });
  const pathDriftToRetrain = useConnector(driftRef, retrainRef, containerRef, { offset: 0 });

  return (
    <section
      aria-label="Figura 5 – Walk-forward, Monitoração e Drift"
      className="w-full min-h-screen p-6 md:p-10"
      style={{ backgroundColor: COLORS.bg }}
    >
      {/* Cabeçalho */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold" style={{ color: COLORS.headText }}>
              Figura 5 – Walk-forward, Monitoração e Drift
            </h2>
            <p className="text-sm mt-2 opacity-80" style={{ color: COLORS.text }}>
              Ciclo MLOps: treinamento, validação, deploy, monitoração e retreinamento
            </p>
          </div>

          {/* Toolbar de Exportação */}
          <div className="flex gap-3">
            <button
              onClick={() => exportAsSVG(svgRef, 'figura05_walkforward_mlops.svg')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-all hover:opacity-90 shadow-md"
              style={{ backgroundColor: COLORS.accent }}
              aria-label="Exportar diagrama como SVG"
            >
              <Download size={18} />
              <span className="hidden sm:inline">SVG</span>
            </button>
            <button
              onClick={() => exportAsPDF(svgRef, 'figura05_walkforward_mlops.pdf')}
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
        {/* Eixo temporal */}
        <div className="mb-6 px-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={20} style={{ color: COLORS.accent }} />
            <h3 className="font-semibold" style={{ color: COLORS.text }}>
              Eixo Temporal (Walk-forward)
            </h3>
          </div>
          <div className="h-2 rounded-full" style={{ backgroundColor: COLORS.border }}></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-7 relative z-10">
          {/* Coluna 1: Treino e Validação */}
          <div className="space-y-5">
            {/* Train */}
            <article
              ref={trainRef}
              className="bg-white rounded-2xl border shadow-md p-4 md:p-5 relative"
              style={{ borderColor: COLORS.border, backgroundColor: '#e0f2fe' }}
            >
              <h4 className="font-semibold text-base mb-2" style={{ color: COLORS.text }}>
                Train (Treino)
              </h4>
              <p className="text-sm" style={{ color: COLORS.text, opacity: 0.8 }}>
                Janela deslizante de dados históricos para treinamento do modelo
              </p>
              <div className="mt-3">
                <span
                  className="text-xs px-2 py-1 rounded"
                  style={{ backgroundColor: COLORS.cardBG, color: COLORS.text }}
                >
                  t₀ → t₁
                </span>
              </div>
            </article>

            {/* Validation */}
            <article
              ref={valRef}
              className="bg-white rounded-2xl border shadow-md p-4 md:p-5 relative"
              style={{ borderColor: COLORS.border, backgroundColor: '#f1f5f9' }}
            >
              <h4 className="font-semibold text-base mb-2" style={{ color: COLORS.text }}>
                Validation (Validação)
              </h4>
              <p className="text-sm" style={{ color: COLORS.text, opacity: 0.8 }}>
                Ajuste de hiperparâmetros e seleção de modelo
              </p>
              <div className="mt-3">
                <span
                  className="text-xs px-2 py-1 rounded"
                  style={{ backgroundColor: COLORS.cardBG, color: COLORS.text }}
                >
                  t₁ → t₂
                </span>
              </div>
            </article>

            {/* Test */}
            <article
              ref={testRef}
              className="bg-white rounded-2xl border shadow-md p-4 md:p-5 relative"
              style={{ borderColor: COLORS.border, backgroundColor: '#bfdbfe' }}
            >
              <h4 className="font-semibold text-base mb-2" style={{ color: COLORS.text }}>
                Test (Teste)
              </h4>
              <p className="text-sm" style={{ color: COLORS.text, opacity: 0.8 }}>
                Avaliação final com dados não vistos
              </p>
              <div className="mt-3">
                <span
                  className="text-xs px-2 py-1 rounded"
                  style={{ backgroundColor: COLORS.cardBG, color: COLORS.text }}
                >
                  t₂ → t₃
                </span>
              </div>
            </article>
          </div>

          {/* Coluna 2: Deploy e Monitoração */}
          <div className="space-y-5">
            {/* Deploy */}
            <article
              ref={deployRef}
              className="bg-white rounded-2xl border shadow-md p-4 md:p-5 relative"
              style={{ borderColor: COLORS.border }}
            >
              <div className="flex items-start gap-3">
                <Activity size={22} style={{ color: COLORS.accent, flexShrink: 0 }} />
                <div className="flex-1">
                  <h4 className="font-semibold text-base" style={{ color: COLORS.text }}>
                    Model v{Math.floor(Date.now() / 100000)} (Deploy)
                  </h4>
                  <p className="text-sm mt-2" style={{ color: COLORS.text, opacity: 0.8 }}>
                    Modelo implantado em produção
                  </p>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <span
                      className="text-xs px-2 py-1 rounded"
                      style={{ backgroundColor: '#dcfce7', color: '#166534' }}
                    >
                      Status: ATIVO
                    </span>
                  </div>
                </div>
              </div>
            </article>

            {/* Monitor */}
            <article
              ref={monitorRef}
              className="bg-white rounded-2xl border shadow-md p-4 md:p-5 relative"
              style={{ borderColor: COLORS.border }}
            >
              <div className="flex items-start gap-3">
                <Activity size={22} style={{ color: COLORS.accent, flexShrink: 0 }} />
                <div className="flex-1">
                  <h4 className="font-semibold text-base" style={{ color: COLORS.text }}>
                    Monitoração
                  </h4>
                  <p className="text-sm mt-2" style={{ color: COLORS.text, opacity: 0.8 }}>
                    Métricas: RMSE, MAE, Brier Score (confiabilidade)
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded" style={{ backgroundColor: COLORS.cardBG }}>
                      <div style={{ color: COLORS.text, opacity: 0.7 }}>RMSE</div>
                      <div className="font-semibold" style={{ color: COLORS.text }}>
                        0.82 mm
                      </div>
                    </div>
                    <div className="p-2 rounded" style={{ backgroundColor: COLORS.cardBG }}>
                      <div style={{ color: COLORS.text, opacity: 0.7 }}>MAE</div>
                      <div className="font-semibold" style={{ color: COLORS.text }}>
                        0.64 mm
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </div>

          {/* Coluna 3: Drift e Retreinamento */}
          <div className="space-y-5">
            {/* Drift Alert */}
            <article
              ref={driftRef}
              className="bg-white rounded-2xl border shadow-md p-4 md:p-5 relative"
              style={{ borderColor: COLORS.warning }}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle size={22} style={{ color: COLORS.warning, flexShrink: 0 }} />
                <div className="flex-1">
                  <h4 className="font-semibold text-base" style={{ color: COLORS.text }}>
                    Alarme de Drift
                  </h4>
                  <p className="text-sm mt-2" style={{ color: COLORS.text, opacity: 0.8 }}>
                    Degradação de desempenho detectada
                  </p>
                  <div className="mt-3">
                    {/* Diamante de alarme */}
                    <div className="flex items-center gap-2">
                      <svg width="24" height="24" viewBox="0 0 24 24">
                        <polygon
                          points="12,3 21,12 12,21 3,12"
                          fill={COLORS.warning}
                          fillOpacity="0.2"
                          stroke={COLORS.warning}
                          strokeWidth="2"
                        />
                      </svg>
                      <span className="text-xs" style={{ color: COLORS.text, opacity: 0.7 }}>
                        Trigger: RMSE &gt; limiar
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </article>

            {/* Retrain */}
            <article
              ref={retrainRef}
              className="bg-white rounded-2xl border shadow-md p-4 md:p-5 relative"
              style={{ borderColor: COLORS.border }}
            >
              <div className="flex items-start gap-3">
                <RotateCcw size={22} style={{ color: COLORS.accent2, flexShrink: 0 }} />
                <div className="flex-1">
                  <h4 className="font-semibold text-base" style={{ color: COLORS.text }}>
                    Retreinamento
                  </h4>
                  <p className="text-sm mt-2" style={{ color: COLORS.text, opacity: 0.8 }}>
                    Nova janela de treino com dados atualizados; rollback seguro se degradar
                  </p>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <span
                      className="text-xs px-2 py-1 rounded"
                      style={{ backgroundColor: COLORS.cardBG, color: COLORS.text }}
                    >
                      Automático
                    </span>
                    <span
                      className="text-xs px-2 py-1 rounded"
                      style={{ backgroundColor: COLORS.cardBG, color: COLORS.text }}
                    >
                      Rollback: v{Math.floor(Date.now() / 100000) - 1}
                    </span>
                  </div>
                </div>
              </div>
            </article>

            {/* Legenda */}
            <div
              className="bg-white rounded-2xl border shadow-md p-4"
              style={{ borderColor: COLORS.border }}
            >
              <h4 className="font-semibold text-sm mb-3" style={{ color: COLORS.text }}>
                Legenda
              </h4>
              <div className="space-y-2 text-xs" style={{ color: COLORS.text, opacity: 0.75 }}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: '#e0f2fe', border: `1px solid ${COLORS.border}` }}
                  ></div>
                  <span>Treino</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: '#f1f5f9', border: `1px solid ${COLORS.border}` }}
                  ></div>
                  <span>Validação</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: '#bfdbfe', border: `1px solid ${COLORS.border}` }}
                  ></div>
                  <span>Teste</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg width="16" height="4">
                    <line
                      x1="0"
                      y1="2"
                      x2="16"
                      y2="2"
                      stroke={COLORS.accent2}
                      strokeWidth="2"
                      strokeDasharray="4 2"
                    />
                  </svg>
                  <span>Retorno (rollback)</span>
                </div>
              </div>
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
            <marker
              id="arrowHeadDashed"
              markerWidth="10"
              markerHeight="8"
              refX="9"
              refY="4"
              orient="auto"
            >
              <polygon points="0 0, 10 4, 0 8" fill={COLORS.accent2} />
            </marker>
          </defs>

          {pathTrainToVal && (
            <path
              d={pathTrainToVal}
              stroke={COLORS.accent}
              strokeWidth={2.5}
              fill="none"
              markerEnd="url(#arrowHead)"
            >
              <title>Train → Validation</title>
            </path>
          )}
          {pathValToTest && (
            <path
              d={pathValToTest}
              stroke={COLORS.accent}
              strokeWidth={2.5}
              fill="none"
              markerEnd="url(#arrowHead)"
            >
              <title>Validation → Test</title>
            </path>
          )}
          {pathTestToDeploy && (
            <path
              d={pathTestToDeploy}
              stroke={COLORS.accent}
              strokeWidth={2.5}
              fill="none"
              markerEnd="url(#arrowHead)"
            >
              <title>Test → Deploy</title>
            </path>
          )}
          {pathDeployToMonitor && (
            <path
              d={pathDeployToMonitor}
              stroke={COLORS.accent}
              strokeWidth={2.5}
              fill="none"
              markerEnd="url(#arrowHead)"
            >
              <title>Deploy → Monitor</title>
            </path>
          )}
          {pathMonitorToDrift && (
            <path
              d={pathMonitorToDrift}
              stroke={COLORS.warning}
              strokeWidth={2.5}
              fill="none"
              markerEnd="url(#arrowHead)"
            >
              <title>Monitor → Drift Alert</title>
            </path>
          )}
          {pathDriftToRetrain && (
            <path
              d={pathDriftToRetrain}
              stroke={COLORS.accent2}
              strokeWidth={2.5}
              fill="none"
              strokeDasharray="6 4"
              markerEnd="url(#arrowHeadDashed)"
            >
              <title>Drift → Retrain (rollback seguro)</title>
            </path>
          )}
        </svg>
      </div>

      {/* Rodapé */}
      <div className="max-w-7xl mx-auto mt-8">
        <p className="text-xs text-center" style={{ color: COLORS.text, opacity: 0.6 }}>
          Walk-forward validation | Monitoração contínua | Rollback seguro em caso de degradação
        </p>
      </div>
    </section>
  );
}
