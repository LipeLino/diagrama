/**
 * Scientific traceability:
 * - FAO-56 / ASCE Penman–Monteith for ET₀ (FAO Irrigation & Drainage Paper 56).
 * - WMO-No. 8 guidelines for agrometeorological station siting and instrumentation.
 * - OGC SensorThings API (Sensing profile) for interoperable indicator exposure.
 */
'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  BarChart3,
  CloudRain,
  Database,
  Droplets,
  LayoutDashboard,
  Sun,
  Thermometer,
  Wind,
} from 'lucide-react';

const COLORS = {
  bg: '#fafbfc',
  laneHead: '#1565c0',
  headText: '#ffffff',
  border: '#d1d9e0',
  cardBorder: '#e0e7ef',
  text: '#1a2332',
  accent: '#1565c0',
  accent2: '#2196F3',
  iconBg: '#e3f2fd',
  iconBorder: '#1565C0',
  hint: '#37474f',
};

const toolbarButtonClass =
  'inline-flex items-center gap-2 rounded-lg border-2 border-[#1565c0] bg-white px-5 py-2.5 text-sm font-semibold text-[#1565c0] shadow-sm hover:bg-[#f5f5f5] transition-colors';
const laneClass =
  'relative overflow-visible rounded-xl border-2 border-[#d1d9e0] bg-white w-full shadow-sm';
const laneHeadClass =
  'flex items-center justify-center rounded-t-xl bg-[#1565c0] px-4 py-4 text-base font-bold text-white tracking-wide uppercase shadow-sm antialiased';
const laneBodyClass = 'relative flex flex-col gap-6 px-5 py-6 bg-gradient-to-b from-white to-[#fafbfc]';
const hintClass = 'inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 text-sm font-semibold text-[#1565c0] bg-[#e3f2fd] border border-[#90caf9] rounded-md w-fit antialiased';
const cardContainerClass =
  'relative mx-auto w-full rounded-lg border border-[#e0e7ef] bg-white px-6 py-4 max-w-[380px] shadow-sm hover:shadow-md transition-shadow';
const variableCardClass =
  'relative mx-auto w-full rounded-lg border border-[#e0e7ef] bg-white px-6 py-4 max-w-[450px] shadow-sm hover:shadow-md transition-shadow';
const cardTitleClass = 'text-[15px] font-bold text-[#1a2332] leading-snug antialiased';
const cardBodyTextClass = 'text-[13px] leading-relaxed text-[#2d3748] antialiased';
const pillTextClass =
  'whitespace-nowrap rounded-md bg-gradient-to-r from-[#e3f2fd] to-[#bbdefb] px-3 py-1 text-[13px] font-bold text-[#0d47a1] border border-[#90caf9] antialiased';
const iconWrapperClass =
  'flex h-7 w-7 items-center justify-center rounded-lg bg-[#e3f2fd] text-[#1565C0] border border-[#90caf9] shadow-sm';

type ConnectorOptions = {
  curv?: number;
  offset?: number;
  fromOffset?: number;
  toOffset?: number;
  minDx?: number;
};

interface CardDefinition {
  id: string;
  title: string;
  unit?: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
  ref: React.RefObject<HTMLDivElement | null>;
}

interface DecisionDetail {
  icon: string;
  text: string;
}

interface DecisionCardDefinition {
  id: string;
  title: string;
  Icon: React.ComponentType<{ className?: string }>;
  details: DecisionDetail[];
  hint: string;
  ref: React.RefObject<HTMLDivElement | null>;
}

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

  type Svg2Pdf = (svg: SVGSVGElement, doc: InstanceType<typeof jsPDF>, options?: { x?: number; y?: number }) => Promise<void>;
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

function useRerouteOnResize(refs: Array<React.RefObject<Element | null>>, onResize: () => void) {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof ResizeObserver === 'undefined') {
      return;
    }

    let frame: number | null = null;
    const schedule = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(onResize);
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
    schedule();

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      observed.forEach((el) => observer.unobserve(el));
      observer.disconnect();
      window.removeEventListener('resize', schedule);
    };
  }, [onResize]);
}

// Compute a dynamic merge point for multiple sources going into one target.
// The merge X is placed a fixed gap to the left of the target; the merge Y
// is the average of source centerlines, clamped within the target band.
function useMergePoint(
  containerRef: React.RefObject<HTMLDivElement | null>,
  sourceRefs: Array<React.RefObject<HTMLElement | null>>,
  targetRef: React.RefObject<HTMLElement | null>,
  xGap: number = 60,
): { x: number; y: number } {
  const [pt, setPt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  // Hold latest sourceRefs to avoid recreating callbacks/effects on each render
  const sourceRefsRef = useRef(sourceRefs);
  useEffect(() => {
    sourceRefsRef.current = sourceRefs;
  }, [sourceRefs]);

  const update = useCallback(() => {
    const container = containerRef.current;
    const target = targetRef.current;
    if (!container || !target) return;

    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    const centers: number[] = [];
    for (const r of sourceRefsRef.current) {
      const el = r.current;
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      centers.push(rect.top + rect.height / 2 - containerRect.top);
    }
    // Fallback to target center if sources not ready
    const avgY =
      centers.length > 0
        ? centers.reduce((a, b) => a + b, 0) / centers.length
        : targetRect.top + targetRect.height / 2 - containerRect.top;

    const targetTop = targetRect.top - containerRect.top;
    const targetBottom = targetTop + targetRect.height;
    // Keep the merge Y within the vertical band near the target for pleasant curves
    const y = Math.max(targetTop + targetRect.height * 0.2, Math.min(avgY, targetBottom - targetRect.height * 0.2));
    const x = Math.max(0, targetRect.left - containerRect.left - xGap);
    setPt({ x, y });
  }, [containerRef, targetRef, xGap]);

  useEffect(() => {
    update();
  }, [update]);

  useRerouteOnResize([containerRef, targetRef, ...sourceRefsRef.current], update);
  return pt;
}

function useCurvedConnector(
  containerRef: React.RefObject<HTMLDivElement | null>,
  fromRef: React.RefObject<HTMLElement | null>,
  toRef: React.RefObject<HTMLElement | null>,
  { offset = 0, fromOffset, toOffset }: ConnectorOptions = {},
): string {
  const [path, setPath] = useState('');

  const updatePath = useCallback(() => {
    const container = containerRef.current;
    const fromEl = fromRef.current;
    const toEl = toRef.current;
    if (!container || !fromEl || !toEl) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();

    const startOffset = fromOffset ?? offset;
    const endOffset = toOffset ?? offset;

    // Smooth curved connectors with center-lateral anchoring
    const x1 = fromRect.right - containerRect.left;
    const y1 = fromRect.top + fromRect.height / 2 - containerRect.top + startOffset;
    const x2 = toRect.left - containerRect.left;
    const y2 = toRect.top + toRect.height / 2 - containerRect.top + endOffset;

    // Create smooth Bézier curve with control points at 40% of horizontal distance
    const controlOffset = (x2 - x1) * 0.4;
    const cx1 = x1 + controlOffset;
    const cy1 = y1;
    const cx2 = x2 - controlOffset;
    const cy2 = y2;
    
    const d = `M ${x1.toFixed(2)} ${y1.toFixed(2)} C ${cx1.toFixed(2)} ${cy1.toFixed(2)}, ${cx2.toFixed(2)} ${cy2.toFixed(2)}, ${x2.toFixed(2)} ${y2.toFixed(2)}`;

    setPath(d);
  }, [containerRef, fromRef, toRef, offset, fromOffset, toOffset]);

  useEffect(() => {
    updatePath();
  }, [updatePath]);

  useRerouteOnResize([containerRef, fromRef, toRef], updatePath);

  return path;
}

// Merge node connector: from card to a virtual merge point
function useMergeConnector(
  containerRef: React.RefObject<HTMLDivElement | null>,
  fromRef: React.RefObject<HTMLElement | null>,
  toRef: React.RefObject<HTMLElement | null>,
  mergeX: number, // relative X position of merge node
  mergeY: number, // relative Y position of merge node
  fromOffset: number = 0,
  isFromMerge: boolean = false, // true if from merge node to target
): string {
  const [path, setPath] = useState('');

  const updatePath = useCallback(() => {
    const container = containerRef.current;
    const fromEl = fromRef.current;
    const toEl = toRef.current;
    if (!container || !fromEl || !toEl) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();

    if (isFromMerge) {
      // From merge node to target (tighter curve)
      const x1 = mergeX;
      const y1 = mergeY;
      const x2 = toRect.left - containerRect.left;
      const y2 = toRect.top + toRect.height / 2 - containerRect.top;

      const controlOffset = (x2 - x1) * 0.3; // Tighter curve for merge-to-target
      const cx1 = x1 + controlOffset;
      const cy1 = y1;
      const cx2 = x2 - controlOffset;
      const cy2 = y2;
      
      const d = `M ${x1.toFixed(2)} ${y1.toFixed(2)} C ${cx1.toFixed(2)} ${cy1.toFixed(2)}, ${cx2.toFixed(2)} ${cy2.toFixed(2)}, ${x2.toFixed(2)} ${y2.toFixed(2)}`;
      setPath(d);
    } else {
      // From source to merge node
      const x1 = fromRect.right - containerRect.left;
      const y1 = fromRect.top + fromRect.height / 2 - containerRect.top + fromOffset;
      const x2 = mergeX;
      const y2 = mergeY;

      const controlOffset = (x2 - x1) * 0.4;
      const cx1 = x1 + controlOffset;
      const cy1 = y1;
      const cx2 = x2 - controlOffset;
      const cy2 = y2;
      
      const d = `M ${x1.toFixed(2)} ${y1.toFixed(2)} C ${cx1.toFixed(2)} ${cy1.toFixed(2)}, ${cx2.toFixed(2)} ${cy2.toFixed(2)}, ${x2.toFixed(2)} ${y2.toFixed(2)}`;
      setPath(d);
    }
  }, [containerRef, fromRef, toRef, mergeX, mergeY, fromOffset, isFromMerge]);

  useEffect(() => {
    updatePath();
  }, [updatePath]);

  useRerouteOnResize([containerRef, fromRef, toRef], updatePath);

  return path;
}

export default function Figure02_Encadeamento(): React.ReactElement {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1, height: 1 });

  const rsRef = useRef<HTMLDivElement | null>(null);
  const tempRef = useRef<HTMLDivElement | null>(null);
  const umidadeRef = useRef<HTMLDivElement | null>(null);
  const ventoRef = useRef<HTMLDivElement | null>(null);
  const pressaoRef = useRef<HTMLDivElement | null>(null);
  const precipitacaoRef = useRef<HTMLDivElement | null>(null);
  const armazenamentoRef = useRef<HTMLDivElement | null>(null);

  const et0Ref = useRef<HTMLDivElement | null>(null);
  const gddRef = useRef<HTMLDivElement | null>(null);
  const bhRef = useRef<HTMLDivElement | null>(null);

  const d1Ref = useRef<HTMLDivElement | null>(null);
  const d2Ref = useRef<HTMLDivElement | null>(null);
  const d3Ref = useRef<HTMLDivElement | null>(null);

  const variableCards: CardDefinition[] = [
    // Group 1: ET₀ inputs (Rs, T, UR, u₂, P) - Top section
    {
      id: 'rs',
      title: 'Radiação solar global - Rs',
      unit: 'MJ m⁻² d⁻¹',
      description: 'Entrada de balanço de energia (ET₀).',
      Icon: Sun,
      ref: rsRef,
    },
    {
      id: 'temp',
      title: 'Temperatura do ar (méd./máx./mín.) - T, Tmax, Tmin',
      unit: '°C',
      description: 'eₛ(T), Δ e termos de ET₀; base para GDD.',
      Icon: Thermometer,
      ref: tempRef,
    },
    {
      id: 'ur',
      title: 'Umidade relativa do ar - UR',
      unit: '%',
      description: 'Determina eₐ e o VPD em ET₀.',
      Icon: Droplets,
      ref: umidadeRef,
    },
    {
      id: 'u2',
      title: 'Vento a 2 m - u₂',
      unit: 'm s⁻¹',
      description: 'Controla o termo aerodinâmico de ET₀.',
      Icon: Wind,
      ref: ventoRef,
    },
    {
      id: 'pressao',
      title: 'Pressão atmosférica - P',
      unit: 'kPa',
      description: 'Ajusta a constante psicrométrica γ em ET₀.',
      Icon: BarChart3,
      ref: pressaoRef,
    },
    // Group 2: BH inputs (Pcp, ΔS) - Bottom section
    {
      id: 'pcp',
      title: 'Precipitação observada - Pcp',
      unit: 'mm',
      description: 'Entrada do balanço hídrico (BH).',
      Icon: CloudRain,
      ref: precipitacaoRef,
    },
    {
      id: 'solo',
      title: 'Armazenamento de água no solo - S',
      unit: 'mm',
      description: 'ΔS fecha o balanço hídrico diário.',
      Icon: Database,
      ref: armazenamentoRef,
    },
  ];

  const indicatorCards: CardDefinition[] = [
    // Top: ET₀ (feeds into BH and D1)
    {
      id: 'et0',
      title: 'ET₀ — Evapotranspiração de referência',
      unit: 'mm d⁻¹',
      description: 'Penman–Monteith FAO-56/ASCE.',
      Icon: Sun,
      ref: et0Ref,
    },
    // Middle: BH (receives ET₀, Pcp, ΔS; feeds D1)
    {
      id: 'bh',
      title: 'Balanço hídrico — BH',
      unit: 'mm',
      description: 'BH = Pcp − ET₀ ± ΔS.',
      Icon: Droplets,
      ref: bhRef,
    },
    // Bottom: GDD (receives T; feeds D3)
    {
      id: 'gdd',
      title: 'GDD — Graus-dia de desenvolvimento',
      unit: '°C·d',
      description: 'Σ[(Tmax + Tmin)/2 − Tbase].',
      Icon: Thermometer,
      ref: gddRef,
    },
  ];

  const decisionCards: DecisionCardDefinition[] = [
    // Top: Receives from ET₀ + BH
    {
      id: 'd1',
      title: 'Decisão de irrigação',
      Icon: Droplets,
      details: [
        { icon: '•', text: 'Lâmina estimada via BH/ET₀' },
        { icon: '•', text: 'Momento: janela de déficit crítico' },
        { icon: '•', text: 'Risco de déficit: calculado por BH' },
      ],
      hint: 'Baseado em ET₀ e balanço hídrico',
      ref: d1Ref,
    },
    // Bottom: Receives from GDD + ET₀
    {
      id: 'd3',
      title: 'Planejamento operacional',
      Icon: LayoutDashboard,
      details: [
        { icon: '•', text: 'Janela via GDD para maturação' },
        { icon: '•', text: 'Risco: previsão + reservatório' },
        { icon: '•', text: 'GDD: 850 °C·d (estimado)' },
      ],
      hint: 'Baseado em GDD e previsão climática',
      ref: d3Ref,
    },
    // Middle: No connections (would need proper indicator)
    {
      id: 'd2',
      title: 'Manejo fitossanitário',
      Icon: Wind,
      details: [
        { icon: '•', text: 'Risco via GDD + índice UR/T' },
        { icon: '•', text: 'Janela térmica: monitorada' },
        { icon: '•', text: 'Condição vento: no índice aplicação' },
      ],
      hint: 'Baseado em indicador de risco (GDD)',
      ref: d2Ref,
    },
  ];

  // Compute merge points for groups that share a common target
  const mergeEt0 = useMergePoint(containerRef, [rsRef, tempRef, umidadeRef, ventoRef, pressaoRef], et0Ref, 70);
  const mergeBh = useMergePoint(containerRef, [precipitacaoRef, armazenamentoRef, et0Ref], bhRef, 70);
  const mergeD1 = useMergePoint(containerRef, [et0Ref, bhRef], d1Ref, 70);
  const mergeD3 = useMergePoint(containerRef, [et0Ref, gddRef], d3Ref, 70);

  // VARIABLES → INDICATORS (with merge into a single arrow per target)
  // Sources to merge for ET₀
  const pathRsToEt0Merge = useMergeConnector(containerRef, rsRef, et0Ref, mergeEt0.x, mergeEt0.y, -40, false);
  const pathTempToEt0Merge = useMergeConnector(containerRef, tempRef, et0Ref, mergeEt0.x, mergeEt0.y, -20, false);
  const pathUrToEt0Merge = useMergeConnector(containerRef, umidadeRef, et0Ref, mergeEt0.x, mergeEt0.y, 0, false);
  const pathVentoToEt0Merge = useMergeConnector(containerRef, ventoRef, et0Ref, mergeEt0.x, mergeEt0.y, 20, false);
  const pathPressToEt0Merge = useMergeConnector(containerRef, pressaoRef, et0Ref, mergeEt0.x, mergeEt0.y, 40, false);
  // Single arrow from merge to ET₀ target
  const pathMergeToEt0 = useMergeConnector(containerRef, et0Ref, et0Ref, mergeEt0.x, mergeEt0.y, 0, true);

  // T → GDD (single connection)
  const pathTempToGdd = useCurvedConnector(containerRef, tempRef, gddRef, { fromOffset: 60, toOffset: -30 });
  
  // Pcp, ΔS, ET₀ → BH (merge then single arrow)
  const pathPcpToBhMerge = useMergeConnector(containerRef, precipitacaoRef, bhRef, mergeBh.x, mergeBh.y, -15, false);
  const pathSoloToBhMerge = useMergeConnector(containerRef, armazenamentoRef, bhRef, mergeBh.x, mergeBh.y, 15, false);
  const pathEt0ToBhMerge = useMergeConnector(containerRef, et0Ref, bhRef, mergeBh.x, mergeBh.y, 0, false);
  const pathMergeToBh = useMergeConnector(containerRef, bhRef, bhRef, mergeBh.x, mergeBh.y, 0, true);
  
  // INDICATORS → DECISIONS
  // Merge ET₀ + BH → D1 (single final arrow)
  const pathEt0ToD1Merge = useMergeConnector(containerRef, et0Ref, d1Ref, mergeD1.x, mergeD1.y, -10, false);
  const pathBhToD1Merge = useMergeConnector(containerRef, bhRef, d1Ref, mergeD1.x, mergeD1.y, 10, false);
  const pathMergeToD1 = useMergeConnector(containerRef, d1Ref, d1Ref, mergeD1.x, mergeD1.y, 0, true);
  // GDD → Manejo Fitossanitário (bottom to middle) remains direct
  const pathGddToD2 = useCurvedConnector(containerRef, gddRef, d2Ref, { fromOffset: -20, toOffset: 0 });
  // Merge ET₀ + GDD → D3 (single final arrow)
  const pathEt0ToD3Merge = useMergeConnector(containerRef, et0Ref, d3Ref, mergeD3.x, mergeD3.y, -10, false);
  const pathGddToD3Merge = useMergeConnector(containerRef, gddRef, d3Ref, mergeD3.x, mergeD3.y, 10, false);
  const pathMergeToD3 = useMergeConnector(containerRef, d3Ref, d3Ref, mergeD3.x, mergeD3.y, 0, true);


  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    setCanvasSize({ width: rect.width, height: rect.height });
  }, [containerRef]);

  const connectors = useMemo(
    () =>
      [
        // STEP 1: Variables → Indicators (merge to single arrow)
        { id: 'rs-et0-merge', d: pathRsToEt0Merge, color: COLORS.accent, width: 1.8, title: 'Rs → merge(ET₀)', arrow: false },
        { id: 'temp-et0-merge', d: pathTempToEt0Merge, color: COLORS.accent, width: 1.8, title: 'T → merge(ET₀)', arrow: false },
        { id: 'ur-et0-merge', d: pathUrToEt0Merge, color: COLORS.accent, width: 1.8, title: 'UR → merge(ET₀)', arrow: false },
        { id: 'vento-et0-merge', d: pathVentoToEt0Merge, color: COLORS.accent, width: 1.8, title: 'u₂ → merge(ET₀)', arrow: false },
        { id: 'press-et0-merge', d: pathPressToEt0Merge, color: COLORS.accent, width: 1.8, title: 'P → merge(ET₀)', arrow: false },
        { id: 'merge-et0', d: pathMergeToEt0, color: COLORS.accent, width: 1.8, title: 'Merge → ET₀', arrow: true },
        
        // T → GDD (phenology indicator)
        { id: 'temp-gdd', d: pathTempToGdd, color: COLORS.accent, width: 1.8, title: 'T → GDD', arrow: true },
        
        // Variables → BH (water balance, merged)
        { id: 'pcp-bh-merge', d: pathPcpToBhMerge, color: COLORS.accent, width: 1.8, title: 'Pcp → merge(BH)', arrow: false },
        { id: 'solo-bh-merge', d: pathSoloToBhMerge, color: COLORS.accent, width: 1.8, title: 'ΔS → merge(BH)', arrow: false },
        { id: 'et0-bh-merge', d: pathEt0ToBhMerge, color: COLORS.accent, width: 1.8, title: 'ET₀ → merge(BH)', arrow: false },
        { id: 'merge-bh', d: pathMergeToBh, color: COLORS.accent, width: 1.8, title: 'Merge → BH', arrow: true },
        
        // STEP 2: Indicators → Decisions (merged)
        { id: 'et0-d1-merge', d: pathEt0ToD1Merge, color: COLORS.accent2, width: 1.8, title: 'ET₀ → merge(D1)', arrow: false },
        { id: 'bh-d1-merge', d: pathBhToD1Merge, color: COLORS.accent2, width: 1.8, title: 'BH → merge(D1)', arrow: false },
        { id: 'merge-d1', d: pathMergeToD1, color: COLORS.accent2, width: 1.8, title: 'Merge → Decisão Irrigação', arrow: true },
        { id: 'gdd-d2', d: pathGddToD2, color: COLORS.accent2, width: 1.8, title: 'GDD → Manejo Fitossanitário', arrow: true },
        { id: 'et0-d3-merge', d: pathEt0ToD3Merge, color: COLORS.accent2, width: 1.8, title: 'ET₀ → merge(D3)', arrow: false },
        { id: 'gdd-d3-merge', d: pathGddToD3Merge, color: COLORS.accent2, width: 1.8, title: 'GDD → merge(D3)', arrow: false },
        { id: 'merge-d3', d: pathMergeToD3, color: COLORS.accent2, width: 1.8, title: 'Merge → Planejamento', arrow: true },
      ].filter((connector) => connector.d),
    [
      pathRsToEt0Merge,
      pathTempToEt0Merge,
      pathUrToEt0Merge,
      pathVentoToEt0Merge,
      pathPressToEt0Merge,
      pathMergeToEt0,
      pathTempToGdd,
      pathPcpToBhMerge,
      pathSoloToBhMerge,
      pathEt0ToBhMerge,
      pathMergeToBh,
      pathEt0ToD1Merge,
      pathBhToD1Merge,
      pathMergeToD1,
      pathGddToD2,
      pathEt0ToD3Merge,
      pathGddToD3Merge,
      pathMergeToD3,
    ],
  );

  const svgWidth = canvasSize.width || 1;
  const svgHeight = canvasSize.height || 1;

  return (
    <section aria-label="Figura 2 – Variáveis, indicadores e decisões agroclimáticas" className="w-full bg-gradient-to-br from-[#fafbfc] to-[#f5f7fa] py-12">
  <div className="mx-auto flex w-full flex-col gap-8 px-4 sm:px-6 lg:px-8 overflow-x-auto">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between border-b-2 border-[#d1d9e0] pb-6">
          <header className="max-w-3xl space-y-3">
            <h1 className="text-3xl font-bold text-[#1a2332] tracking-tight">Figura 2 – Variáveis → Indicadores → Decisões</h1>
            <p className="text-base text-[#37474f] leading-relaxed">
              Encadeamento de variáveis meteorológicas (WMO-No. 8) em indicadores interoperáveis (OGC SensorThings)
              com cálculo de ET₀ conforme FAO-56 e resultantes decisões operacionais.
            </p>
          </header>
          <div className="flex shrink-0 items-center gap-3">
            <button type="button" className={toolbarButtonClass} onClick={() => exportAsSVG(svgRef, 'Figura02.svg')}>
              Exportar SVG
            </button>
            <button
              type="button"
              className={toolbarButtonClass}
              onClick={() => void exportAsPDF(svgRef, 'Figura02.pdf')}
            >
              Exportar PDF
            </button>
          </div>
        </div>

  <div ref={containerRef} className="relative min-w-[1600px] grid grid-cols-1 gap-6 lg:grid-cols-[460px_420px_400px] lg:gap-40" aria-describedby="fig2-caption">
          <svg
            ref={svgRef}
            width={svgWidth}
            height={svgHeight}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="pointer-events-none absolute inset-0 z-30 overflow-visible"
            role="presentation"
            aria-hidden="true"
          >
            <defs>
              <marker
                id="arrowHeadFig2"
                markerWidth="12"
                markerHeight="11"
                refX="10"
                refY="5.5"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <polygon points="0 1, 10 5.5, 0 10" fill={COLORS.accent} stroke={COLORS.accent} strokeWidth="0.5" />
              </marker>
              <marker
                id="arrowHeadFig2Alt"
                markerWidth="12"
                markerHeight="11"
                refX="10"
                refY="5.5"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <polygon points="0 1, 10 5.5, 0 10" fill={COLORS.accent2} stroke={COLORS.accent2} strokeWidth="0.5" />
              </marker>
              <filter id="dropShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="1.5"/>
                <feOffset dx="0" dy="1" result="offsetblur"/>
                <feFlood floodColor="#1565c0" floodOpacity="0.15"/>
                <feComposite in2="offsetblur" operator="in"/>
                <feMerge>
                  <feMergeNode/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <filter id="mergeGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            {connectors.map((connector) => (
              <path
                key={connector.id}
                d={connector.d}
                stroke={connector.color}
                strokeWidth={connector.width || 1.5}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                markerEnd={connector.arrow ? (connector.color === COLORS.accent ? 'url(#arrowHeadFig2)' : 'url(#arrowHeadFig2Alt)') : undefined}
              >
                <title>{connector.title}</title>
              </path>
            ))}
          </svg>

          <section className={laneClass} aria-labelledby="lane-variables">
            <div className={laneHeadClass} id="lane-variables">
              Variáveis Meteorológicas
            </div>
            <div className={laneBodyClass}>
              {variableCards.map(({ id, title, unit, description, Icon, ref }) => {
                return (
                  <article key={id} ref={ref} className={variableCardClass}>
                    <div className="flex items-center gap-4">
                      <div className={`${iconWrapperClass} shrink-0`} aria-hidden="true">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex w-full flex-col gap-y-1.5">
                        <div className="relative flex items-start">
                          <h2 className={`${cardTitleClass} flex-1 min-w-0 pr-16`}>{title}</h2>
                          {unit ? (
                            <span className={`${pillTextClass} shrink-0 absolute top-0 right-0`}>{unit}</span>
                          ) : null}
                        </div>
                        <p className={cardBodyTextClass}>{description}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className={laneClass} aria-labelledby="lane-indicadores">
            <div className={laneHeadClass} id="lane-indicadores">
              Indicadores Derivados
            </div>
            <div className={`${laneBodyClass} justify-between`}>
              {indicatorCards.map(({ id, title, unit, description, Icon, ref }) => {
                return (
                  <article key={id} ref={ref} className={cardContainerClass}>
                    <div className="flex items-center gap-4">
                      <div className={`${iconWrapperClass} shrink-0`} aria-hidden="true">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex w-full flex-col gap-y-1.5">
                        <div className="relative flex items-start">
                          <h2 className={`${cardTitleClass} flex-1 min-w-0 pr-16`}>{title}</h2>
                          {unit ? (
                            <span className={`${pillTextClass} shrink-0 absolute top-0 right-0`}>{unit}</span>
                          ) : null}
                        </div>
                        <p className={cardBodyTextClass}>{description}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className={laneClass} aria-labelledby="lane-decisoes">
            <div className={laneHeadClass} id="lane-decisoes">
              Decisão Operacional
            </div>
            <div className={laneBodyClass}>
              {decisionCards.map(({ id, title, Icon, details, hint, ref }) => (
                <article key={id} ref={ref} className={cardContainerClass}>
                  <div className="flex w-full flex-col">
                    <div className="flex items-center gap-4 mb-3">
                      <div className={iconWrapperClass} aria-hidden="true">
                        <Icon className="h-4 w-4" />
                      </div>
                      <h2 className={`${cardTitleClass} uppercase tracking-wide`}>{title}</h2>
                    </div>
                    <div className="border-t border-[#d1d9e0] pt-2.5 pb-1.5">
                      <ul className="space-y-1 text-xs leading-snug text-[#37474f]">
                        {details.map(({ icon, text }) => (
                          <li key={text} className="flex items-start gap-2">
                            {icon && (
                              <span className="inline-flex w-6 justify-center text-base shrink-0 mt-0.5 text-[#1565c0] font-bold" aria-hidden="true">
                                {icon}
                              </span>
                            )}
                            <span className="flex-1">{text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <p className={hintClass}>{hint}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <footer className="border-t-2 border-[#d1d9e0] pt-5 space-y-3 bg-white/50 rounded-lg px-6 py-4">
          <p id="fig2-caption" className="text-xs text-[#1a2332] leading-relaxed">
            <strong className="text-[#1565c0]">Legenda:</strong> Fluxo em duas etapas: (1) Variáveis → Indicadores; (2) Indicadores → Decisões. 
            ET₀ recebe Rs, T, UR, u₂, P (conforme FAO-56); BH recebe Pcp, ΔS, ET₀; GDD recebe T.
            Setas azul escuro (1,8 px) = Variável→Indicador; setas azul claro (1,8 px) = Indicador→Decisão. 
            <strong>Proibida conexão direta Variável→Decisão</strong> (metodologia baseada em FAO-56, WMO-No. 8).
          </p>
          <p className="text-xs text-[#37474f] italic">
            Fonte: Elaborado pelo autor conforme WMO-No. 8, FAO-56/ASCE e OGC SensorThings API.
          </p>
        </footer>
      </div>
    </section>
  );
}
