'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Activity,
  ChartSpline,
  History,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';

const COLORS = {
  bg: '#f7fbff',
  laneHead: '#cfe6ff',
  headText: '#0f2747',
  cardBG: '#e9f5ff',
  border: '#dde8f3',
  text: '#0e223d',
  accent: '#2a7de1',
  accent2: '#0ea5e9',
  drift: '#f97373',
};

type ConnectorOptions = {
  curv?: number;
  offset?: number;
};

type ExportableSVG = React.RefObject<SVGSVGElement | null>;

export const exportAsSVG = (svgRef: ExportableSVG, name: string) => {
  const svgElement = svgRef.current;
  if (!svgElement) return;

  const clone = svgElement.cloneNode(true) as SVGSVGElement;
  const bounds = svgElement.getBoundingClientRect();
  const width = Math.max(1, bounds.width);
  const height = Math.max(1, bounds.height);

  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', `${width}`);
  clone.setAttribute('height', `${height}`);
  clone.setAttribute('viewBox', `0 0 ${width} ${height}`);

  const serializer = new XMLSerializer();
  const source = serializer.serializeToString(clone);

  const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportAsPDF = async (svgRef: ExportableSVG, name: string) => {
  const svgElement = svgRef.current;
  if (!svgElement) return;

  const bounds = svgElement.getBoundingClientRect();
  const width = Math.max(1, bounds.width);
  const height = Math.max(1, bounds.height);

  const [{ jsPDF }, svg2pdfModule] = await Promise.all([import('jspdf'), import('svg2pdf.js')]);

  type Svg2Pdf = (svg: SVGSVGElement, doc: unknown, options?: { x?: number; y?: number }) => Promise<void>;
  const moduleAsUnknown = svg2pdfModule as unknown as {
    default?: Svg2Pdf;
    svg2pdf?: Svg2Pdf;
  };
  const svg2pdf: Svg2Pdf | undefined = moduleAsUnknown.default ?? moduleAsUnknown.svg2pdf;

  if (!svg2pdf) {
    throw new Error('svg2pdf.js did not expose a callable export.');
  }

  const doc = new jsPDF({ unit: 'pt', format: [width, height] });

  const clone = svgElement.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  await svg2pdf(clone, doc, { x: 0, y: 0 });
  doc.save(name);
};

export default function Figure05WalkForwardMLOps() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1, height: 1 });
  const [driftMarkers, setDriftMarkers] = useState<Array<{ x: number; y: number }>>([]);

  const walkForwardRef = useRef<HTMLDivElement | null>(null);
  const modelRef = useRef<HTMLDivElement | null>(null);
  const monitorRef = useRef<HTMLDivElement | null>(null);
  const alarmRef = useRef<HTMLDivElement | null>(null);
  const retrainRef = useRef<HTMLDivElement | null>(null);
  const rollbackRef = useRef<HTMLDivElement | null>(null);

  const useRerouteOnResize = (refs: Array<React.RefObject<Element | null>>, onResize: () => void) => {
    useEffect(() => {
      if (typeof window === 'undefined' || typeof ResizeObserver === 'undefined') {
        return;
      }

      let rafId: number | null = null;
      const schedule = () => {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
        }
        rafId = requestAnimationFrame(onResize);
      };

      const observer = new ResizeObserver(schedule);
      const observed: Element[] = [];

      refs.forEach((ref) => {
        const el = ref.current;
        if (el) {
          observer.observe(el);
          observed.push(el);
        }
      });

      window.addEventListener('resize', schedule);

      return () => {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
        }
        observed.forEach((el) => observer.unobserve(el));
        observer.disconnect();
        window.removeEventListener('resize', schedule);
      };
    }, [refs, onResize]);
  };

  const useConnector = (
    fromRef: React.RefObject<HTMLElement | null>,
    toRef: React.RefObject<HTMLElement | null>,
    { curv = 0.3, offset = 0 }: ConnectorOptions = {},
  ) => {
    const [path, setPath] = useState('');

    const updatePath = useCallback(() => {
      const container = containerRef.current;
      const fromEl = fromRef.current;
      const toEl = toRef.current;
      if (!container || !fromEl || !toEl) {
        return;
      }

      const containerRect = container.getBoundingClientRect();
      setCanvasSize((prev) => {
        const width = containerRect.width;
        const height = containerRect.height;
        if (Math.abs(prev.width - width) > 0.5 || Math.abs(prev.height - height) > 0.5) {
          return { width, height };
        }
        return prev;
      });

      const fromRect = fromEl.getBoundingClientRect();
      const toRect = toEl.getBoundingClientRect();

      const x1 = fromRect.right - containerRect.left;
      const y1 = fromRect.top + fromRect.height / 2 - containerRect.top + offset;
      const x2 = toRect.left - containerRect.left;
      const y2 = toRect.top + toRect.height / 2 - containerRect.top + offset;

      const span = x2 - x1;
      const absSpan = Math.abs(span);
      const dx = span < 60 && span > -60 ? 120 : Math.max(40, absSpan);
      const k = curv * dx;

      const c1x = x1 + k;
      const c2x = span < 0 ? x2 + k : x2 - k;

      const d = `M ${x1.toFixed(2)} ${y1.toFixed(2)} C ${c1x.toFixed(
        2,
      )} ${y1.toFixed(2)}, ${c2x.toFixed(2)} ${y2.toFixed(2)}, ${x2.toFixed(2)} ${y2.toFixed(2)}`;

      setPath(d);
    }, [curv, offset, fromRef, toRef]);

    useEffect(() => {
      updatePath();
    }, [updatePath]);

    const resizeRefs = useMemo(
      () => [containerRef as React.RefObject<Element | null>, fromRef, toRef],
      [fromRef, toRef],
    );

    useRerouteOnResize(resizeRefs, updatePath);

    return path;
  };

  const pathWalkToModel = useConnector(walkForwardRef, modelRef, { offset: 0, curv: 0.28 });
  const pathModelToMonitor = useConnector(modelRef, monitorRef, { offset: 0, curv: 0.3 });
  const pathMonitorToAlarm = useConnector(monitorRef, alarmRef, { offset: 0, curv: 0.3 });
  const pathAlarmToRetrain = useConnector(alarmRef, retrainRef, { offset: 0, curv: 0.32 });
  const pathRetrainToWalk = useConnector(retrainRef, walkForwardRef, { offset: 26, curv: 0.4 });
  const pathModelToRollback = useConnector(modelRef, rollbackRef, { offset: -26, curv: 0.35 });

  useEffect(() => {
    const container = containerRef.current;
    const monitor = monitorRef.current;
    const alarm = alarmRef.current;
    if (!container || !monitor || !alarm) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const monitorRect = monitor.getBoundingClientRect();
    const alarmRect = alarm.getBoundingClientRect();
    const x1 = monitorRect.right - containerRect.left;
    const y1 = monitorRect.top + monitorRect.height / 2 - containerRect.top;
    const x2 = alarmRect.left - containerRect.left;
    const y2 = alarmRect.top + alarmRect.height / 2 - containerRect.top;
    const baseX = (x1 + x2) / 2;
    const baseY = (y1 + y2) / 2;

    setDriftMarkers([
      { x: baseX - 18, y: baseY },
      { x: baseX, y: baseY },
      { x: baseX + 18, y: baseY },
    ]);
  }, [canvasSize, pathMonitorToAlarm]);

  const connectors = useMemo(
    () =>
      [
        { d: pathWalkToModel, color: COLORS.accent, title: 'Walk-forward → Model vX', dash: undefined },
        { d: pathModelToMonitor, color: COLORS.accent, title: 'Model vX → Monitoração', dash: undefined },
        { d: pathMonitorToAlarm, color: COLORS.drift, title: 'Monitoração → Alarmes de drift', dash: undefined },
        { d: pathAlarmToRetrain, color: COLORS.drift, title: 'Alarmes de drift → Retreinamento', dash: undefined },
        {
          d: pathRetrainToWalk,
          color: COLORS.accent2,
          title: 'Retreinamento → Nova janela Walk-forward',
          dash: '6 4',
        },
        {
          d: pathModelToRollback,
          color: COLORS.accent2,
          title: 'Model vX → Rollback seguro',
          dash: '4 4',
        },
      ].filter((connector) => connector.d),
    [
      pathWalkToModel,
      pathModelToMonitor,
      pathMonitorToAlarm,
      pathAlarmToRetrain,
      pathRetrainToWalk,
      pathModelToRollback,
    ],
  );

  const svgWidth = canvasSize.width || 1;
  const svgHeight = canvasSize.height || 1;

  const cardClass =
    'group relative rounded-2xl border border-[#d6e3f2] bg-white/95 p-5 shadow-md transition hover:-translate-y-1 hover:shadow-lg';
  const bodyTextClass = 'text-[15px]/[24px] md:text-[16px]/[26px] text-[#0e223d]';
  const iconWrapperClass =
    'grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-[#e9f5ff] to-white text-[#2a7de1] shadow-inner';
  const alertIconClass =
    'grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-[#fee2e2] to-white text-[#b91c1c] shadow-inner';

  const toolbarButtonClass =
    'inline-flex items-center gap-2 rounded-xl border border-[#d6e3f2] bg-white/95 px-3.5 py-1.75 text-sm font-semibold text-[#0f2747] shadow-md transition hover:-translate-y-0.5 hover:bg-[#eff6ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0ea5e9]';

  return (
    <section
      ref={containerRef}
      aria-label="Figura 5 – Walk-forward, monitoração e drift"
      data-figure="5"
      className="relative grid grid-cols-1 gap-8 rounded-3xl border border-[#d6e3f2] bg-white p-6 shadow-xl lg:grid-cols-3"
    >
      <div className="absolute right-6 top-6 z-20 flex gap-3">
        <button
          type="button"
          className={toolbarButtonClass}
          onClick={() => exportAsSVG(svgRef, 'Figura05.svg')}
        >
          Exportar SVG
        </button>
        <button
          type="button"
          className={toolbarButtonClass}
          onClick={() => void exportAsPDF(svgRef, 'Figura05.pdf')}
        >
          Exportar PDF
        </button>
      </div>

      <svg
        ref={svgRef}
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="pointer-events-none absolute inset-0 z-10 overflow-visible"
        role="presentation"
        aria-hidden="true"
      >
        <defs>
          <marker
            id="arrowHeadFig5"
            markerWidth="10"
            markerHeight="8"
            refX="9"
            refY="4"
            orient="auto"
          >
            <polygon
              points="0 0, 10 4, 0 8"
              fill={COLORS.accent}
              stroke={COLORS.accent}
              strokeWidth="0.75"
            />
          </marker>
          <marker
            id="arrowHeadFig5Alt"
            markerWidth="10"
            markerHeight="8"
            refX="9"
            refY="4"
            orient="auto"
          >
            <polygon
              points="0 0, 10 4, 0 8"
              fill={COLORS.accent2}
              stroke={COLORS.accent2}
              strokeWidth="0.75"
            />
          </marker>
          <marker
            id="arrowHeadFig5Drift"
            markerWidth="10"
            markerHeight="8"
            refX="9"
            refY="4"
            orient="auto"
          >
            <polygon
              points="0 0, 10 4, 0 8"
              fill={COLORS.drift}
              stroke={COLORS.drift}
              strokeWidth="0.75"
            />
          </marker>
        </defs>
        {connectors.map((connector, index) => (
          <path
            key={index}
            d={connector.d}
            stroke={connector.color}
            strokeWidth={2.75}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={connector.dash}
            markerEnd={
              connector.color === COLORS.accent
                ? 'url(#arrowHeadFig5)'
                : connector.color === COLORS.accent2
                ? 'url(#arrowHeadFig5Alt)'
                : 'url(#arrowHeadFig5Drift)'
            }
          >
            <title>{connector.title}</title>
          </path>
        ))}
        {driftMarkers.map((marker, index) => (
          <polygon
            key={`drift-${index}`}
            points={`${marker.x} ${marker.y - 8}, ${marker.x + 8} ${marker.y}, ${marker.x} ${marker.y + 8}, ${marker.x - 8} ${marker.y}`}
            fill={COLORS.drift}
            opacity={0.85}
            stroke={COLORS.drift}
            strokeWidth="0.75"
          >
            <title>Alerta de drift</title>
          </polygon>
        ))}
      </svg>

      <div className="space-y-5">
        <div className="rounded-2xl border border-[#d6e3f2] bg-gradient-to-r from-[#cfe6ff] to-[#e8f3ff] px-5 py-3 text-sm font-semibold text-[#0f2747] shadow-sm">
          Janelas walk-forward
        </div>
        <article ref={walkForwardRef} className={`${cardClass} space-y-5`}>
          <div className="flex items-start gap-3">
            <div className={iconWrapperClass} aria-hidden="true">
              <History className="h-5 w-5" />
            </div>
            <div>
              <p className={`${bodyTextClass} font-semibold`}>Walk-forward rolling window</p>
              <p className="mt-2 text-[14px]/[20px] text-[#0f2747]/80">
                Atualização contínua com janela deslizante (t<sub>0</sub>→t<sub>n</sub>) e refit incremental.
              </p>
            </div>
          </div>
          <svg
            aria-label="Eixo temporal com blocos de treino, validação e teste"
            viewBox="0 0 360 90"
            className="w-full rounded-xl border border-[#d6e3f2] bg-white p-3 shadow-inner"
          >
            <line
              x1="20"
              y1="60"
              x2="340"
              y2="60"
              stroke="#ccd9e8"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <rect x="40" y="30" width="120" height="40" rx="8" fill="#e3f1ff" />
            <rect x="180" y="30" width="80" height="40" rx="8" fill="#e7ecf5" />
            <rect x="280" y="30" width="60" height="40" rx="8" fill={COLORS.accent} />
            <text x="100" y="55" textAnchor="middle" fill="#0f2747" fontSize="13">
              Train
            </text>
            <text x="220" y="55" textAnchor="middle" fill="#0f2747" fontSize="13">
              Validation
            </text>
            <text x="310" y="55" textAnchor="middle" fill="white" fontSize="13">
              Test
            </text>
          </svg>
        </article>
      </div>

      <div className="space-y-5">
        <div className="rounded-2xl border border-[#d6e3f2] bg-gradient-to-r from-[#cfe6ff] to-[#e8f3ff] px-5 py-3 text-sm font-semibold text-[#0f2747] shadow-sm">
          Produção &amp; monitoração
        </div>
        <article ref={modelRef} className={cardClass}>
          <div className="flex items-start gap-3">
            <div className={iconWrapperClass} aria-hidden="true">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className={`${bodyTextClass} font-semibold`}>Model vX (deploy)</p>
              <p className="mt-2 text-[14px]/[20px] text-[#0f2747]/80">
                Versão promovida via CI/CD com tagging imutável e rollback seguro.
              </p>
            </div>
          </div>
        </article>
        <article ref={monitorRef} className={cardClass}>
          <div className="flex items-start gap-3">
            <div className={iconWrapperClass} aria-hidden="true">
              <ChartSpline className="h-5 w-5" />
            </div>
            <div>
              <p className={`${bodyTextClass} font-semibold`}>Monitoração</p>
              <p className="mt-2 text-[14px]/[20px] text-[#0f2747]/80">
                RMSE/MAE em produção, Brier (probabilístico), PSI e KS para distribuição.
              </p>
            </div>
          </div>
        </article>
      </div>

      <div className="space-y-5">
        <div className="rounded-2xl border border-[#d6e3f2] bg-gradient-to-r from-[#cfe6ff] to-[#e8f3ff] px-5 py-3 text-sm font-semibold text-[#0f2747] shadow-sm">
          Drift &amp; governança
        </div>
        <article ref={alarmRef} className={cardClass}>
          <div className="flex items-start gap-3">
            <div className={alertIconClass} aria-hidden="true">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className={`${bodyTextClass} font-semibold`}>Alarmes de drift</p>
              <p className="mt-2 text-[14px]/[20px] text-[#0f2747]/80">
                Threshold adaptativo, SLO de tempestividade e auditoria de anomalias.
              </p>
            </div>
          </div>
        </article>
        <article ref={retrainRef} className={cardClass}>
          <div className="flex items-start gap-3">
            <div className={iconWrapperClass} aria-hidden="true">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <p className={`${bodyTextClass} font-semibold`}>Retreinamento</p>
              <p className="mt-2 text-[14px]/[20px] text-[#0f2747]/80">
                Reusa walk-forward, validação cruzada e registro em Model Registry.
              </p>
            </div>
          </div>
        </article>
        <article ref={rollbackRef} className={cardClass}>
          <div className="flex items-start gap-3">
            <div className={iconWrapperClass} aria-hidden="true">
              <History className="h-5 w-5" />
            </div>
            <div>
              <p className={`${bodyTextClass} font-semibold`}>Rollback seguro</p>
              <p className="mt-2 text-[14px]/[20px] text-[#0f2747]/80">
                Traffic shifting, canary e reversão automática em caso de regressão.
              </p>
            </div>
          </div>
        </article>
        <div className="rounded-xl border border-[#dde8f3] bg-white p-4 text-[13px]/[18px] text-[#0f2747]/75 shadow-sm">
          <p>
            Legenda: blocos {`Train/Validation/Test`} ilustram walk-forward; setas tracejadas indicam
            rollback seguro e ciclo de retreinamento.
          </p>
        </div>
      </div>
    </section>
  );
}
