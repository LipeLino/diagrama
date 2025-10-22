'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Bell,
  Droplets,
  LayoutDashboard,
  ServerCog,
  Settings2,
  Sun,
  Undo2,
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

export default function Figure04DssPipeline() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1, height: 1 });
  const [gatePoints, setGatePoints] = useState<Array<{ x: number; y: number }>>([]);

  const ingestaoRef = useRef<HTMLDivElement | null>(null);
  const qaRef = useRef<HTMLDivElement | null>(null);
  const calculoRef = useRef<HTMLDivElement | null>(null);
  const balancoRef = useRef<HTMLDivElement | null>(null);
  const recomendacaoRef = useRef<HTMLDivElement | null>(null);
  const notificacaoRef = useRef<HTMLDivElement | null>(null);
  const feedbackRef = useRef<HTMLDivElement | null>(null);

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

  const pathIngestaoToQa = useConnector(ingestaoRef, qaRef, { offset: 0, curv: 0.28 });
  const pathQaToCalculo = useConnector(qaRef, calculoRef, { offset: 0, curv: 0.3 });
  const pathCalculoToBh = useConnector(calculoRef, balancoRef, { offset: 0, curv: 0.3 });
  const pathBhToRec = useConnector(balancoRef, recomendacaoRef, { offset: 0, curv: 0.3 });
  const pathRecToNotif = useConnector(recomendacaoRef, notificacaoRef, { offset: -6, curv: 0.3 });
  const pathNotifToFeedback = useConnector(notificacaoRef, feedbackRef, { offset: 6, curv: 0.3 });
  const pathFeedbackLoop = useConnector(feedbackRef, ingestaoRef, { offset: 24, curv: 0.38 });

  useEffect(() => {
    const container = containerRef.current;
    const ingestao = ingestaoRef.current;
    const qa = qaRef.current;
    const calculo = calculoRef.current;
    if (!container || !ingestao || !qa || !calculo) {
      return;
    }

    const containerRect = container.getBoundingClientRect();

    const buildGate = (fromEl: HTMLElement, toEl: HTMLElement) => {
      const fromRect = fromEl.getBoundingClientRect();
      const toRect = toEl.getBoundingClientRect();
      const x1 = fromRect.right - containerRect.left;
      const y1 = fromRect.top + fromRect.height / 2 - containerRect.top;
      const x2 = toRect.left - containerRect.left;
      const y2 = toRect.top + toRect.height / 2 - containerRect.top;
      return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
    };

    setGatePoints([buildGate(ingestao, qa), buildGate(qa, calculo)]);
  }, [canvasSize, pathIngestaoToQa, pathQaToCalculo]);

  const connectors = useMemo(
    () =>
      [
        { d: pathIngestaoToQa, color: COLORS.accent, title: 'Ingestão → QA/QC', dash: undefined },
        { d: pathQaToCalculo, color: COLORS.accent, title: 'QA/QC → Cálculo ET₀', dash: undefined },
        { d: pathCalculoToBh, color: COLORS.accent, title: 'Cálculo ET₀ → Balanço hídrico', dash: undefined },
        { d: pathBhToRec, color: COLORS.accent2, title: 'Balanço hídrico → Recomendação', dash: undefined },
        { d: pathRecToNotif, color: COLORS.accent, title: 'Recomendação → Notificação', dash: undefined },
        { d: pathNotifToFeedback, color: COLORS.accent, title: 'Notificação → Feedback de campo', dash: undefined },
        {
          d: pathFeedbackLoop,
          color: COLORS.accent2,
          title: 'Feedback de campo → Ingestão',
          dash: '6 4',
        },
      ].filter((connector) => connector.d),
    [
      pathIngestaoToQa,
      pathQaToCalculo,
      pathCalculoToBh,
      pathBhToRec,
      pathRecToNotif,
      pathNotifToFeedback,
      pathFeedbackLoop,
    ],
  );

  const svgWidth = canvasSize.width || 1;
  const svgHeight = canvasSize.height || 1;

  const cardClass =
    'group relative rounded-2xl border border-[#d6e3f2] bg-white/95 p-5 shadow-md transition hover:-translate-y-1 hover:shadow-lg';
  const bodyTextClass = 'text-[15px]/[24px] md:text-[16px]/[26px] text-[#0e223d]';
  const iconWrapperClass =
    'grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-[#e9f5ff] to-white text-[#2a7de1] shadow-inner';
  const badgeChipClass =
    'rounded-full border border-[#d6e3f2] bg-white/90 px-3 py-1 font-semibold shadow-sm';

  const renderBadges = () => (
    <div className="mt-4 flex flex-wrap gap-2 text-[12px]/[16px] text-[#0f2747]">
      <span className={badgeChipClass}>
        latência (ms/s)
      </span>
      <span className={badgeChipClass}>
        disponibilidade (%)
      </span>
    </div>
  );

  const toolbarButtonClass =
    'inline-flex items-center gap-2 rounded-xl border border-[#d6e3f2] bg-white/95 px-3.5 py-1.75 text-sm font-semibold text-[#0f2747] shadow-md transition hover:-translate-y-0.5 hover:bg-[#eff6ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0ea5e9]';

  return (
    <section
      ref={containerRef}
      aria-label="Figura 4 – Pipeline DSS de Irrigação"
      data-figure="4"
      className="relative grid grid-cols-1 gap-8 rounded-3xl border border-[#d6e3f2] bg-white p-6 shadow-xl lg:grid-cols-3"
    >
      <div className="absolute right-6 top-6 z-20 flex gap-3">
        <button
          type="button"
          className={toolbarButtonClass}
          onClick={() => exportAsSVG(svgRef, 'Figura04.svg')}
        >
          Exportar SVG
        </button>
        <button
          type="button"
          className={toolbarButtonClass}
          onClick={() => void exportAsPDF(svgRef, 'Figura04.pdf')}
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
            id="arrowHeadFig4"
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
            id="arrowHeadFig4Alt"
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
              connector.color === COLORS.accent ? 'url(#arrowHeadFig4)' : 'url(#arrowHeadFig4Alt)'
            }
          >
            <title>{connector.title}</title>
          </path>
        ))}
        {gatePoints.map((gate, index) => (
          <polygon
            key={`gate-${index}`}
            points={`${gate.x} ${gate.y - 7}, ${gate.x + 7} ${gate.y}, ${gate.x} ${gate.y + 7}, ${gate.x - 7} ${gate.y}`}
            fill={COLORS.accent2}
            opacity={0.75}
          >
            <title>Gate QA/QC</title>
          </polygon>
        ))}
      </svg>

      <div className="space-y-5">
        <div className="rounded-2xl border border-[#d6e3f2] bg-gradient-to-r from-[#cfe6ff] to-[#e8f3ff] px-5 py-3 text-sm font-semibold text-[#0f2747] shadow-sm">
          Ingestão &amp; Controle
        </div>
        <article ref={ingestaoRef} className={cardClass}>
          <div className="flex items-start gap-3">
            <div className={iconWrapperClass} aria-hidden="true">
              <ServerCog className="h-5 w-5" />
            </div>
            <div>
              <p className={`${bodyTextClass} font-semibold`}>Ingestão</p>
              <p className="mt-2 text-[14px]/[20px] text-[#0f2747]/80">
                Streams e APIs de estações WMO, satélites e cadastros de campo.
              </p>
            </div>
          </div>
          {renderBadges()}
        </article>
        <article ref={qaRef} className={cardClass}>
          <div className="flex items-start gap-3">
            <div className={iconWrapperClass} aria-hidden="true">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <p className={`${bodyTextClass} font-semibold`}>QA/QC</p>
              <p className="mt-2 text-[14px]/[20px] text-[#0f2747]/80">
                Limites físicos, consistência intervariável, flags automáticas e envelopes Rso.
              </p>
            </div>
          </div>
          {renderBadges()}
        </article>
      </div>

      <div className="space-y-5">
        <div className="rounded-2xl border border-[#d6e3f2] bg-gradient-to-r from-[#cfe6ff] to-[#e8f3ff] px-5 py-3 text-sm font-semibold text-[#0f2747] shadow-sm">
          Modelagem
        </div>
        <article ref={calculoRef} className={cardClass}>
          <div className="flex items-start gap-3">
            <div className={iconWrapperClass} aria-hidden="true">
              <Sun className="h-5 w-5" />
            </div>
            <div>
              <p className={`${bodyTextClass} font-semibold`}>Cálculo ET₀ (FAO-56)</p>
              <p className="mt-2 text-[14px]/[20px] text-[#0f2747]/80">
                Penman–Monteith com γ dependente de altitude/pressão e correções horárias.
              </p>
            </div>
          </div>
          {renderBadges()}
        </article>
        <article ref={balancoRef} className={cardClass}>
          <div className="flex items-start gap-3">
            <div className={iconWrapperClass} aria-hidden="true">
              <Droplets className="h-5 w-5" />
            </div>
            <div>
              <p className={`${bodyTextClass} font-semibold`}>Balanço hídrico</p>
              <p className="mt-2 text-[14px]/[20px] text-[#0f2747]/80">
                Pcp − ET₀ ± ΔS integrado ao perfil de solo, cultura e manejo.
              </p>
            </div>
          </div>
          {renderBadges()}
        </article>
      </div>

      <div className="space-y-5">
        <div className="rounded-2xl border border-[#d6e3f2] bg-gradient-to-r from-[#cfe6ff] to-[#e8f3ff] px-5 py-3 text-sm font-semibold text-[#0f2747] shadow-sm">
          Disseminação &amp; Ação
        </div>
        <article ref={recomendacaoRef} className={cardClass}>
          <div className="flex items-start gap-3">
            <div className={iconWrapperClass} aria-hidden="true">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div>
              <p className={`${bodyTextClass} font-semibold`}>Recomendação</p>
              <p className="mt-2 text-[14px]/[20px] text-[#0f2747]/80">
                Lâmina, janela operacional e priorização de talhões.
              </p>
            </div>
          </div>
          {renderBadges()}
        </article>
        <article ref={notificacaoRef} className={cardClass}>
          <div className="flex items-start gap-3">
            <div className={iconWrapperClass} aria-hidden="true">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <p className={`${bodyTextClass} font-semibold`}>Notificação</p>
              <p className="mt-2 text-[14px]/[20px] text-[#0f2747]/80">
                App, SMS e e-mail com confirmação de recebimento.
              </p>
            </div>
          </div>
          {renderBadges()}
        </article>
        <article ref={feedbackRef} className={cardClass}>
          <div className="flex items-start gap-3">
            <div className={iconWrapperClass} aria-hidden="true">
              <Undo2 className="h-5 w-5" />
            </div>
            <div>
              <p className={`${bodyTextClass} font-semibold`}>Feedback de campo</p>
              <p className="mt-2 text-[14px]/[20px] text-[#0f2747]/80">
                Confirmação da execução, ajustes de parâmetros e fechamento de ciclo.
              </p>
            </div>
          </div>
          {renderBadges()}
        </article>
        <p className="text-[13px]/[18px] text-[#0f2747]/70">
          ET₀ conforme FAO-56; métricas de disponibilidade/tempestividade inspiradas no WDQMS.
        </p>
      </div>
    </section>
  );
}
