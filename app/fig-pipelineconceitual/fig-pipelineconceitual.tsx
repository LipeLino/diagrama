"use client";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ClipboardCheck,
  ClipboardList,
  Clock,
  Database,
  ListChecks,
  Radio,
  Server,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Sprout,
  ThermometerSun,
  Workflow,
} from "lucide-react";

import { exportAsSVG, exportDiagramPDF } from "../figura-02/Figure02_Encadeamento";
import {
  ARROW_LENGTH,
  STRAIGHT_SEGMENT,
  useCurvedConnector,
  useMergeConnector,
  useMergePoint,
  useRerouteOnResize,
  useVerticalConnector,
} from "../_components/diagramHooks";

const COLORS = {
  gradientFrom: "#fafbfc",
  gradientTo: "#f5f7fa",
  textPrimary: "#1a2332",
  textMuted: "#4d5d7a",
  laneBorder: "#ccd6e4",
  laneBg: "rgba(255, 255, 255, 0.88)",
  connector: "#1f6feb",
  connectorLabelBorder: "#c5d2e3",
  calloutBorder: "#b8c4d6",
  legendBorder: "#d1d9e0",
  iconBorder: "#bfd2f3",
  iconBg: "#e9f1ff",
};

const toolbarButtonClass =
  "inline-flex items-center gap-2 rounded-lg border border-[#1565c0] bg-white px-5 py-2.5 text-sm font-semibold text-[#1565c0] transition-colors hover:bg-[#eef4ff]";
const stageHeaderClass =
  "grid grid-cols-[12rem_repeat(4,minmax(0,1.35fr))] gap-x-14 text-sm font-semibold uppercase tracking-[0.12em] text-[#1a2332]";
const laneWrapperClass =
  "relative rounded-2xl border border-[#ccd6e4] bg-white/95";
const laneGridClass =
  "grid grid-cols-[12rem_repeat(4,minmax(0,1.35fr))] items-start gap-x-14 gap-y-5 px-8 py-8";
const laneLabelClass =
  "flex h-full items-center justify-center px-2 text-center text-sm font-semibold uppercase tracking-[0.12em] text-[#1a2332] [writing-mode:vertical-rl] rotate-180 origin-center whitespace-normal break-words";
const stageCellClass = "flex min-h-[120px] flex-col gap-6";
const activityCardClass =
  "relative flex w-full max-w-3xl flex-col gap-3 rounded-xl border border-[#d6dde8] bg-white px-9 py-6.5";
const activityTitleClass = "text-[15px] font-semibold text-[#1a2332]";
const activityBodyClass = "text-[13px]/[20px] text-[#4d5d7a]";
const iconWrapperClass =
  "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#bfd2f3] bg-[#e9f1ff] text-[#1f6feb]";
const connectorLabelClass =
  "absolute z-30 flex items-center gap-1 rounded-full border border-[#c5d2e3] bg-white px-6 py-2 text-[14px] font-medium text-[#1a2332] -translate-x-1/2 -translate-y-1/2 shadow-sm";
const calloutClass =
  "pointer-events-auto absolute z-40 flex items-center gap-2 rounded-md border border-[#b8c4d6] bg-white px-3 py-2 text-xs font-semibold text-[#1a2332] -translate-x-1/2 -translate-y-full";

type ConnectorDescriptor = {
  id: string;
  d: string;
  color: string;
  title: string;
  marker?: "flow";
  width?: number;
  label?: string;
  labelPosition?: { x: number; y: number } | null;
  orientation: "vertical" | "horizontal";
};

const STAGES = [
  { id: "dados", label: "DADOS" },
  { id: "indicadores", label: "INDICADORES" },
  { id: "dss", label: "RECOMENDAÇÃO (DSS)" },
  { id: "acao", label: "AÇÃO" },
];

const MERGE_NODE_RADIUS = 4;

export default function Figure07PipelineConceitual() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Root wrapper (diagram + legend) for export so legend is included in PDF bounds
  const exportRootRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1, height: 1 });
  const [layoutReady, setLayoutReady] = useState(false);

  const coletarRef = useRef<HTMLDivElement | null>(null);
  const transmitirRef = useRef<HTMLDivElement | null>(null);
  const ingerirRef = useRef<HTMLDivElement | null>(null);
  const padronizarRef = useRef<HTMLDivElement | null>(null);
  const publicarRef = useRef<HTMLDivElement | null>(null);
  const calcularRef = useRef<HTMLDivElement | null>(null);
  const validarRef = useRef<HTMLDivElement | null>(null);
  const gerarRef = useRef<HTMLDivElement | null>(null);
  const priorizarRef = useRef<HTMLDivElement | null>(null);
  const decisaoRef = useRef<HTMLDivElement | null>(null);
  const executarRef = useRef<HTMLDivElement | null>(null);
  const registrarRef = useRef<HTMLDivElement | null>(null);
  const acaoStageCellRef = useRef<HTMLDivElement | null>(null);
  // Measure the "Dados ingeridos" label to align arrow with its beginning (left edge)
  const dadosLabelRef = useRef<HTMLSpanElement | null>(null);
  const [dadosLabelSize, setDadosLabelSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const updateCanvasSize = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    setCanvasSize((prev) => {
      if (Math.abs(prev.width - rect.width) > 0.5 || Math.abs(prev.height - rect.height) > 0.5) {
        return { width: rect.width, height: rect.height };
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    updateCanvasSize();
  }, [updateCanvasSize]);

  useRerouteOnResize([containerRef], updateCanvasSize);

  // Track size of "Dados ingeridos" label to place it exactly at the start of the straight segment
  useEffect(() => {
    const el = dadosLabelRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setDadosLabelSize((prev) => (
        Math.abs(prev.width - rect.width) > 0.5 || Math.abs(prev.height - rect.height) > 0.5
          ? { width: rect.width, height: rect.height }
          : prev
      ));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [layoutReady, canvasSize.width, canvasSize.height]);

  const mergeIndicadores = useMergePoint(
    containerRef,
    [padronizarRef, publicarRef],
    calcularRef,
    32,
  );

  const DECISION_VERTICAL_SHIFT = -30;
  const PRIORIZAR_DECISAO_FROM_OFFSET = -30;
  const PRIORIZAR_DECISAO_MIN_DX = 90;

  const pathColetarToTransmitir = useVerticalConnector(containerRef, coletarRef, transmitirRef);
  // Custom anchor: land at 1/3 da largura do topo do card Ingerir (targetXFraction=0.33)
  const pathTransmitirToIngerir = useVerticalConnector(containerRef, transmitirRef, ingerirRef, { targetXFraction: 0.33 });
  const pathIngerirToPadronizar = useCurvedConnector(containerRef, ingerirRef, padronizarRef, {
    // Start at top-right edge (slight inset to avoid clipping the border), end at vertical center left edge
    fromSide: 'top',
    fromXFraction: 0.55,
    fromAnchorY: 'top',
    fromInset: 6,
    toAnchorY: 'center',
    offset: 0,
    minDx: 160,
    arcLift: 16,
  });
  const pathPadronizarToMerge = useMergeConnector(
    containerRef,
    padronizarRef,
    calcularRef,
    mergeIndicadores.x,
    mergeIndicadores.y,
    -8,
    false,
    "left",
    "left",
  );
  const pathPublicarToMerge = useMergeConnector(
    containerRef,
    publicarRef,
    calcularRef,
    mergeIndicadores.x,
    mergeIndicadores.y,
    8,
    false,
    "left",
    "left",
  );
  // Vertical handoff Padronizar (top) → Publicar (bottom)
  const pathPadronizarToPublicar = useVerticalConnector(containerRef, padronizarRef, publicarRef);
  const pathMergeToCalcular = useMergeConnector(
    containerRef,
    calcularRef,
    calcularRef,
    mergeIndicadores.x,
    mergeIndicadores.y,
    0,
    true,
  );
  const pathCalcularToValidar = useVerticalConnector(containerRef, calcularRef, validarRef);
  const pathValidarToGerar = useCurvedConnector(containerRef, validarRef, gerarRef, {
    offset: 0,
    minDx: 120,
  });
  const pathGerarToPriorizar = useVerticalConnector(containerRef, gerarRef, priorizarRef);
  const pathPriorizarToDecisao = useCurvedConnector(containerRef, priorizarRef, decisaoRef, {
    fromOffset: PRIORIZAR_DECISAO_FROM_OFFSET,
    minDx: PRIORIZAR_DECISAO_MIN_DX,
  });
  const pathDecisaoToExecutar = useVerticalConnector(containerRef, decisaoRef, executarRef);
  const pathExecutarToRegistrar = useVerticalConnector(containerRef, executarRef, registrarRef);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    setCanvasSize({ width: rect.width, height: rect.height });
    // Defer connector rendering until first stable layout is measured
    requestAnimationFrame(() => {
      const keyRefs = [coletarRef, transmitirRef, ingerirRef, padronizarRef, calcularRef];
      const allMeasured = keyRefs.every((r) => r.current && r.current.getBoundingClientRect().width > 0);
      if (allMeasured) setLayoutReady(true);
    });
  }, []);

  const connectors = useMemo<ConnectorDescriptor[]>(() => {
    const container = containerRef.current;
    if (!container) return [];
    const containerRect = container.getBoundingClientRect();
  const LABEL_AXIS_MARGIN = 28; // global min gap from each card edge along connector axis
  const VERTICAL_LABEL_BASE_Y_OFFSET = 0; // vertical labels: no transform offset
  const HORIZONTAL_LABEL_BASE_Y_OFFSET = 0;
  const ESTIMATED_LABEL_HEIGHT = 34; // px, used only to keep label inside the gap if space is tight
    // Fine-grained per-label positional adjustments (y negative = move up, x positive = move right)
    const LABEL_OFFSETS: Record<string, { x?: number; y?: number }> = {
  'coletar-transmitir': { y: -16 },
    'transmitir-ingerir': { y: -14 },
  // Position "Dados ingeridos" a bit left and lower
  'ingerir-padronizar': { x: -12, y: -4 },
  'padronizar-publicar': { y: -6 },
  'padronizar-calcular': { y: -6 },
      'publicar-calcular': { y: -18 },
    // DSS / AÇÃO segment fine-tuning
  'gerar-priorizar': { y: -4 },
    'priorizar-decisao': { y: 0 },
      'decisao-executar': { y: 24 },
  'executar-registrar': { y: 0 },
      // future customizations can be added here
    };
    // Preferred curve fraction along merge feeders to place the label (0=start at source, 1=merge)
    const MERGE_LABEL_T: Record<string, number> = {
      'padronizar-calcular': 0.42,
      'publicar-calcular': 0.58,
    };
    const PER_CONNECTOR_MARGIN: Record<string, number> = {
      // horizontals
      'ingerir-padronizar': 40,
  'padronizar-calcular': 32,
  'publicar-calcular': 32,
  'padronizar-publicar': 24,
      'priorizar-decisao': 28,
      // verticals
      'coletar-transmitir': 24,
      'transmitir-ingerir': 24,
      'calcular-validar': 32,
      'decisao-executar': 32,
      'executar-registrar': 28,
      'validar-gerar': 28,
      'gerar-priorizar': 30, // ensure enough clearance above/below DSS handoff label
    };

  const defs = [
      {
        id: "coletar-transmitir",
        path: pathColetarToTransmitir,
        title: "Leituras de sensores → transmissão IoT",
        label: "Leituras coletadas",
        sourceRef: coletarRef,
        targetRef: transmitirRef,
        orientation: "vertical" as const,
      },
      {
        id: "transmitir-ingerir",
        path: pathTransmitirToIngerir,
        title: "Pacotes IoT autenticados → ingestão",
        label: "Pacotes IoT autenticados",
        sourceRef: transmitirRef,
        targetRef: ingerirRef,
        orientation: "vertical" as const,
      },
      {
        id: "ingerir-padronizar",
        path: pathIngerirToPadronizar,
        title: "Streams ingestados → normalização",
        label: "Dados ingeridos",
        sourceRef: ingerirRef,
        targetRef: padronizarRef,
        orientation: "horizontal" as const,
      },
      {
        id: "padronizar-publicar",
        path: pathPadronizarToPublicar,
        title: "Séries padronizadas → metadados/QA",
        label: "Séries padronizadas",
        sourceRef: padronizarRef,
        targetRef: publicarRef,
        orientation: "vertical" as const,
      },
      {
        id: "publicar-calcular",
        path: pathPublicarToMerge,
        title: "Metadados e QA → cálculo de indicadores",
        label: "Metadados e QA",
        sourceRef: publicarRef,
        targetRef: calcularRef,
        orientation: "horizontal" as const,
      },
      {
        id: "merge-calcular",
        path: pathMergeToCalcular,
        title: "Fusão de entradas para indicadores",
        label: "",
        sourceRef: calcularRef,
        targetRef: calcularRef,
        orientation: "horizontal" as const,
      },
      {
        id: "calcular-validar",
        path: pathCalcularToValidar,
        title: "Indicadores calculados → validação",
        label: "Indicadores calculados",
        sourceRef: calcularRef,
        targetRef: validarRef,
        orientation: "vertical" as const,
      },
      {
        id: "validar-gerar",
        path: pathValidarToGerar,
        title: "Indicadores validados → DSS",
        label: "Indicadores validados",
        sourceRef: validarRef,
        targetRef: gerarRef,
        orientation: "horizontal" as const,
      },
      {
        id: "gerar-priorizar",
        path: pathGerarToPriorizar,
        title: "Recomendações geradas → priorização",
        label: "Recomendações contextualizadas",
        sourceRef: gerarRef,
        targetRef: priorizarRef,
        orientation: "vertical" as const,
      },
      {
        id: "priorizar-decisao",
        path: pathPriorizarToDecisao,
        title: "Priorizar → decisão de execução",
        label: "Decisão",
        sourceRef: priorizarRef,
        targetRef: decisaoRef,
        orientation: "horizontal" as const,
      },
      {
        id: "decisao-executar",
        path: pathDecisaoToExecutar,
        title: "Decisão aprovada → execução em campo",
        label: "Aprovação",
        sourceRef: decisaoRef,
        targetRef: executarRef,
        orientation: "vertical" as const,
      },
      
      {
        id: "executar-registrar",
        path: pathExecutarToRegistrar,
        title: "Execução → feedback operacional",
        label: "Registro de execução",
        sourceRef: executarRef,
        targetRef: registrarRef,
        orientation: "vertical" as const,
      },
    ];

    const Z_PRIORITY: Record<string, number> = {
      // Draw this curved edge last so it sits on top of the vertical ingest arrow
      'ingerir-padronizar': 10,
    };

    const result = defs.reduce<ConnectorDescriptor[]>((acc, def) => {
      if (!def.path) {
        return acc;
      }
      let labelPosition: { x: number; y: number } | null = null;
      let pathUsed = def.path; // avoid mutating original path object directly
      const sourceEl = def.sourceRef.current;
      const targetEl = def.targetRef.current;
      if (def.label && sourceEl && targetEl) {
        const sourceRect = sourceEl.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
        const axisMargin = PER_CONNECTOR_MARGIN[def.id] ?? LABEL_AXIS_MARGIN;
        if (def.orientation === "vertical") {
          const sourceCenterX = sourceRect.left + sourceRect.width / 2;
          const targetCenterX = targetRect.left + targetRect.width / 2;
          const sourceBottom = sourceRect.bottom;
          const targetTop = targetRect.top;
          const midX = (sourceCenterX + targetCenterX) / 2 - containerRect.left;
          // Center label equally between the two cards, then ensure it fits with margins
          let gapTop = sourceBottom - containerRect.top + axisMargin;
          // For the decision diamond, use the true bottom tip as the start of the vertical gap
          if (def.id === 'decisao-executar') {
            const sourceCenterY = sourceRect.top + sourceRect.height / 2 - containerRect.top;
            const diamondBottomY = sourceCenterY + sourceRect.height / Math.SQRT2;
            gapTop = diamondBottomY + axisMargin;
          }
          const gapBottom = targetTop - containerRect.top - axisMargin;
          const gapCenter = (gapTop + gapBottom) / 2;
          // keep label fully inside the gap if space allows
          const halfH = ESTIMATED_LABEL_HEIGHT / 2;
          const minCenter = gapTop + halfH;
          const maxCenter = gapBottom - halfH;
          const centeredY = Math.max(minCenter, Math.min(gapCenter, maxCenter));
          const offsets = LABEL_OFFSETS[def.id];
          if (def.id === 'gerar-priorizar' || def.id === 'executar-registrar' || def.id === 'calcular-validar') {
            // Place label exactly at the midpoint of the vertical arrow between the two cards
            const arrowMidY = (sourceBottom + targetTop) / 2 - containerRect.top;
            labelPosition = {
              x: midX + (offsets?.x ?? 0),
              y: arrowMidY + VERTICAL_LABEL_BASE_Y_OFFSET + (offsets?.y ?? 0),
            };
          } else if (def.id === 'transmitir-ingerir') {
            // Force arrow to be a straight vertical line at 1/3 of the width of both cards
            const srcXFrac = sourceRect.left + sourceRect.width * 0.33 - containerRect.left;
            const tgtXFrac = targetRect.left + targetRect.width * 0.33 - containerRect.left;
            const arrowX = (srcXFrac + tgtXFrac) / 2;
            const startY = sourceBottom - containerRect.top;
            const endY = targetTop - containerRect.top;
            pathUsed = `M ${arrowX.toFixed(2)} ${startY.toFixed(2)} L ${arrowX.toFixed(2)} ${endY.toFixed(2)}`;
            const arrowMidY = (startY + endY) / 2;
            labelPosition = {
              x: arrowX + (offsets?.x ?? 0),
              y: arrowMidY + VERTICAL_LABEL_BASE_Y_OFFSET + (offsets?.y ?? 0),
            };
          } else {
            labelPosition = {
              x: midX + (offsets?.x ?? 0),
              y: centeredY + VERTICAL_LABEL_BASE_Y_OFFSET + (offsets?.y ?? 0),
            };
          }
          // Rebuild the vertical path for the diamond so it starts at the bottom tip, not inside the shape
          if (def.id === 'decisao-executar') {
            const sourceCenterY = sourceRect.top + sourceRect.height / 2 - containerRect.top;
            const startY = sourceCenterY + sourceRect.height / Math.SQRT2; // true bottom tip of the rotated square
            const endY = targetTop - containerRect.top; // top edge of target card
            pathUsed = `M ${midX.toFixed(2)} ${startY.toFixed(2)} L ${midX.toFixed(2)} ${endY.toFixed(2)}`;
          }
          // If available gap is larger than needed, ensure equal padding top/bottom.
          // We re-evaluate using actual label height by reserving ESTIMATED_LABEL_HEIGHT.
          const gapHeight = gapBottom - gapTop;
          if (gapHeight > ESTIMATED_LABEL_HEIGHT + axisMargin * 2) {
            // perfect center already gives equal spacing; nothing extra needed.
          }
        } else {
          const sourceRight = sourceRect.right;
          const targetLeft = targetRect.left;
          const sourceCenterY = sourceRect.top + sourceRect.height / 2;
          const targetCenterY = targetRect.top + targetRect.height / 2;
          // Special handling for merge feeders: position labels along the actual cubic towards merge
          if (def.id === 'padronizar-calcular' || def.id === 'publicar-calcular') {
            const mergeX = mergeIndicadores.x;
            const mergeY = mergeIndicadores.y;
            // Reproduce the curve used in useMergeConnector (fromSide='left')
            const fromOffset = def.id === 'padronizar-calcular' ? -8 : 8;
            const x1 = (/* fromSide=left */ sourceRect.left) - containerRect.left;
            const y1 = sourceRect.top + sourceRect.height / 2 - containerRect.top + fromOffset;
            const x2 = mergeX;
            const y2 = mergeY;
            const rawRun = x2 - x1;
            const runDir = rawRun === 0 ? 1 : rawRun > 0 ? 1 : -1;
            const absRun = Math.max(Math.abs(rawRun), 80);
            const cx1 = x1 + absRun * 0.6 * runDir;
            const cy1 = y1;
            const cx2 = x2 - absRun * 0.3 * runDir;
            const cy2 = y2;
            const t = MERGE_LABEL_T[def.id] ?? 0.5;
            const omt = 1 - t;
            const bx = omt*omt*omt*x1 + 3*omt*omt*t*cx1 + 3*omt*t*t*cx2 + t*t*t*x2;
            const by = omt*omt*omt*y1 + 3*omt*omt*t*cy1 + 3*omt*t*t*cy2 + t*t*t*y2;
            const offsets = LABEL_OFFSETS[def.id];
            labelPosition = { x: bx + (offsets?.x ?? 0), y: by + (offsets?.y ?? 0) };
          } else if (def.id === 'ingerir-padronizar') {
            // Composite path: card -> left edge of label -> through label center -> right edge -> target card
            // Label position is determined first (raise more in Y, keep X from mid arc approximation)
            const offsets = LABEL_OFFSETS[def.id];
            const fromInset = 6;
            const baseMinDx = 160; // slightly larger horizontal expansion
            const xStart = sourceRect.left + (sourceRect.width * 0.55) - containerRect.left;
            const yStart = sourceRect.top - containerRect.top + fromInset;
            const targetLeftX = targetRect.left - containerRect.left;
            const targetCenterY = targetRect.top + targetRect.height / 2 - containerRect.top;
            // Midpoint X approximation (previous Bezier midpoint used) for initial label X before width known
            const prelimMidX = (xStart + targetLeftX) / 2;
            // Use measured width if available
            const labelW = dadosLabelSize.width || 140;
            // Evaluate a virtual midpoint curve for Y baseline and then raise it
            const virtualRun = Math.max(Math.abs(targetLeftX - xStart), baseMinDx);
            const cxVirt1 = xStart + virtualRun * 0.55;
            const cxVirt2 = targetLeftX - virtualRun * 0.35;
            const cyVirt1 = yStart - 12; // lift control for virtual arc
            const cyVirt2 = targetCenterY - 8;
            const tMid = 0.5; const omtMid = 1 - tMid;
            const midYCurve = omtMid*omtMid*omtMid*yStart + 3*omtMid*omtMid*tMid*cyVirt1 + 3*omtMid*tMid*tMid*cyVirt2 + tMid*tMid*tMid*targetCenterY;
            const labelY = midYCurve - 18 + (offsets?.y ?? 0); // additional lift above virtual curve
            const labelCenterX = prelimMidX + (offsets?.x ?? 0);
            const labelLeftX = labelCenterX - labelW / 2;
            const labelRightX = labelCenterX + labelW / 2;
            // Determine the Y where the arrow should hit the target card: align with label Y but clamp inside card bounds
            const targetTopY = targetRect.top - containerRect.top;
            const targetBottomY = targetRect.bottom - containerRect.top;
            const targetHitY = Math.max(targetTopY + 8, Math.min(labelY, targetBottomY - 8));
            labelPosition = { x: labelCenterX, y: labelY };
            // Build composite path with an initial leftward bend, then head to label.
            // Ensure smooth join at the label (horizontal tangent) and avoid overshoot.
            const runInRaw = Math.max(labelLeftX - xStart, 24);
            const bendLeft = Math.min(runInRaw * 0.35, 48); // how much we first bend to the left
            const c1x = xStart - bendLeft;            // curve initially to the left as requested
            const c1y = yStart - 22;                  // lift entering the label
            const c2x = labelLeftX - Math.min(runInRaw * 0.5, 60);
            const c2y = labelY;                       // enforce horizontal tangent at label left edge
            const runOutRaw = Math.max(targetLeftX - labelRightX, 24);
            const c3x = labelRightX + runOutRaw * 0.30; // small stub forward for smooth exit
            const c3y = labelY;                         // horizontal tangent at label right edge
            const c4x = targetLeftX - runOutRaw * 0.45;
            const c4y = targetHitY;                    // horizontal entry aligned with label Y (clamped)
            pathUsed = `M ${xStart.toFixed(2)} ${yStart.toFixed(2)} C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${labelLeftX.toFixed(2)} ${labelY.toFixed(2)} L ${labelCenterX.toFixed(2)} ${labelY.toFixed(2)} L ${labelRightX.toFixed(2)} ${labelY.toFixed(2)} C ${c3x.toFixed(2)} ${c3y.toFixed(2)}, ${c4x.toFixed(2)} ${c4y.toFixed(2)}, ${targetLeftX.toFixed(2)} ${targetHitY.toFixed(2)}`;
          } else if (def.id === 'priorizar-decisao') {
            // Align label exactly with the curved arrow midpoint between PRIORIZAR and the decision diamond
            const offsets = LABEL_OFFSETS[def.id];
            const x1 = sourceRect.right - containerRect.left;
            const y1 = sourceRect.top + sourceRect.height / 2 - containerRect.top + PRIORIZAR_DECISAO_FROM_OFFSET;
            // Compute the actual left tip of the rotated diamond (45° square inside a wrapper of size w)
            // The diamond side equals the wrapper size; the left tip sits at centerX - w/√2
            const wrapperLeftX = targetRect.left - containerRect.left;
            const wrapperWidth = targetRect.width;
            const targetCenterX = wrapperLeftX + wrapperWidth / 2;
            const targetEdgeX = targetCenterX - wrapperWidth / Math.SQRT2; // true left tip of the diamond
            const y2 = targetRect.top + targetRect.height / 2 - containerRect.top;
            const arrowDir: 1 | -1 = x1 <= targetEdgeX ? 1 : -1;
            const stubLength = STRAIGHT_SEGMENT + ARROW_LENGTH;
            const straightStartX = targetEdgeX - arrowDir * stubLength;
            const straightStartY = y2;
            const rawRun = straightStartX - x1;
            const runDir: 1 | -1 = rawRun === 0 ? arrowDir : rawRun > 0 ? 1 : -1;
            const absRun = Math.max(Math.abs(rawRun), PRIORIZAR_DECISAO_MIN_DX);
            const cx1 = x1 + absRun * 0.6 * runDir;
            const cy1 = y1;
            const cx2 = straightStartX - absRun * 0.35 * runDir;
            const cy2 = straightStartY;
            const t = 0.5;
            const omt = 1 - t;
            const midX = omt*omt*omt*x1 + 3*omt*omt*t*cx1 + 3*omt*t*t*cx2 + t*t*t*straightStartX;
            const midY = omt*omt*omt*y1 + 3*omt*omt*t*cy1 + 3*omt*t*t*cy2 + t*t*t*straightStartY;
            labelPosition = {
              x: midX + (offsets?.x ?? 0),
              y: midY + (offsets?.y ?? 0),
            };
            // Force the path to end exactly at the diamond's left tip so the arrowhead lands on the tip
            // Use a curved approach into a short straight horizontal stub, then line to the exact tip.
            pathUsed = `M ${x1.toFixed(2)} ${y1.toFixed(2)} C ${cx1.toFixed(2)} ${cy1.toFixed(2)}, ${cx2.toFixed(2)} ${cy2.toFixed(2)}, ${straightStartX.toFixed(2)} ${straightStartY.toFixed(2)} L ${targetEdgeX.toFixed(2)} ${y2.toFixed(2)}`;
          } else if (def.id === 'merge-calcular') {
            // Ensure a clean, slightly curved path from merge point into CALCULAR left-center
            const x1 = mergeIndicadores.x;
            const y1 = mergeIndicadores.y;
            const x2 = targetRect.left - containerRect.left;
            const y2 = targetRect.top + targetRect.height / 2 - containerRect.top;
            const run = Math.max(x2 - x1, 80);
            const cx1 = x1 + run * 0.4;
            const cy1 = y1;
            const cx2 = x2 - run * 0.4;
            const cy2 = y2;
            pathUsed = `M ${x1.toFixed(2)} ${y1.toFixed(2)} C ${cx1.toFixed(2)} ${cy1.toFixed(2)}, ${cx2.toFixed(2)} ${cy2.toFixed(2)}, ${x2.toFixed(2)} ${y2.toFixed(2)}`;
          } else {
            const rawMidX = (sourceRight + targetLeft) / 2 - containerRect.left;
            const minX = sourceRight - containerRect.left + axisMargin;
            const maxX = targetLeft - containerRect.left - axisMargin;
            const clampedX = Math.max(minX, Math.min(rawMidX, maxX));
            const offsets = LABEL_OFFSETS[def.id];
            labelPosition = {
              x: clampedX + (offsets?.x ?? 0),
              y: (sourceCenterY + targetCenterY) / 2 - containerRect.top + HORIZONTAL_LABEL_BASE_Y_OFFSET + (offsets?.y ?? 0),
            };
          }
        }
      }
      acc.push({
        id: def.id,
        d: pathUsed,
        color: COLORS.connector,
        title: def.title,
        marker: (def.id === 'padronizar-calcular' || def.id === 'publicar-calcular') ? undefined : "flow",
        width: 1.6,
        label: def.label,
        labelPosition,
        orientation: def.orientation,
      });
      return acc;
    }, []);

    // Bring prioritized connectors to the front by drawing them last
    return result.sort((a, b) => (Z_PRIORITY[a.id] ?? 0) - (Z_PRIORITY[b.id] ?? 0));
  }, [
    pathColetarToTransmitir,
    pathTransmitirToIngerir,
    pathIngerirToPadronizar,
    pathPadronizarToMerge,
  pathPublicarToMerge,
  pathPadronizarToPublicar,
    pathMergeToCalcular,
    pathCalcularToValidar,
    pathValidarToGerar,
    pathGerarToPriorizar,
    pathPriorizarToDecisao,
    pathDecisaoToExecutar,
    pathExecutarToRegistrar,
    mergeIndicadores.x,
    mergeIndicadores.y,
    canvasSize.width,
    canvasSize.height,
    dadosLabelSize.width,
    dadosLabelSize.height,
  ]);

  const mergeNodes = useMemo(() => {
    if (!mergeIndicadores) return [];
    return [
      // Hide merge node circle since we visually present a single final arrow into CALCULAR
      { id: "indicadores", x: mergeIndicadores.x, y: mergeIndicadores.y, color: COLORS.connector, sources: 1 },
    ];
  }, [mergeIndicadores.x, mergeIndicadores.y]);

  const calloutPositions = useMemo(() => {
    const container = containerRef.current;
    if (!container) {
      return { qaqc: null, latency: null, validation: null };
    }
    const containerRect = container.getBoundingClientRect();
    const computeBetween = (
      source: React.RefObject<HTMLDivElement | null>,
      target: React.RefObject<HTMLDivElement | null>,
      offsetY = -16,
      offsetX = 0,
    ): { x: number; y: number } | null => {
      const sourceEl = source.current;
      const targetEl = target.current;
      if (!sourceEl || !targetEl) return null;
      const sourceRect = sourceEl.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();
      const sourceCenterX = sourceRect.left + sourceRect.width / 2;
      const targetCenterX = targetRect.left + targetRect.width / 2;
      const sourceCenterY = sourceRect.top + sourceRect.height / 2;
      const targetCenterY = targetRect.top + targetRect.height / 2;
      const x = (sourceCenterX + targetCenterX) / 2 - containerRect.left + offsetX;
      const y = (sourceCenterY + targetCenterY) / 2 - containerRect.top + offsetY;
      return { x, y };
    };
    // Ensure callouts stay above their related connector labels (avoid overlap)
    const ESTIMATED_LABEL_HEIGHT = 34;
    const MIN_GAP = 8; // minimal vertical gap between bottom of callout and top of label

    const qaqcBase = computeBetween(transmitirRef, ingerirRef, -18);
    let qaqc = qaqcBase;
    if (qaqc && connectors.length) {
      const label = connectors.find(c => c.id === 'transmitir-ingerir');
      if (label?.labelPosition) {
        // Lock the callout horizontally centered over the label and keep a small gap above it
        const desiredY = label.labelPosition.y - ESTIMATED_LABEL_HEIGHT / 2 - MIN_GAP;
        qaqc = { x: label.labelPosition.x, y: desiredY };
      }
    }
    // Align latency popup with its label ('Metadados e QA') between Publicar and Calcular
    const latencyBase = computeBetween(publicarRef, calcularRef, -18);
    let latency = latencyBase;
    if (latency && connectors.length) {
      // Lock the callout directly above the 'Metadados e QA' label for precise alignment
      const label = connectors.find(c => c.id === 'publicar-calcular');
      if (label?.labelPosition) {
        const desiredY = label.labelPosition.y - ESTIMATED_LABEL_HEIGHT / 2 - MIN_GAP;
        latency = { x: label.labelPosition.x, y: desiredY };
      }
    }
    const validationBase = computeBetween(decisaoRef, executarRef, -12, 0);
    let validation = validationBase;
    if (connectors.length) {
      const label = connectors.find(c => c.id === 'decisao-executar');
      if (label?.labelPosition) {
        // Lock callout directly above the 'Aprovação' label, following it if the label moves
        const desiredY = label.labelPosition.y - ESTIMATED_LABEL_HEIGHT / 2 - MIN_GAP;
        validation = { x: label.labelPosition.x, y: desiredY };
      }
    }

    return { qaqc, latency, validation };
  }, [canvasSize.width, canvasSize.height, connectors]);

  // Position the decision diamond centered vertically with the PRIORIZAR card
  const decisionCenterY = useMemo(() => {
    const prior = priorizarRef.current;
    const acaoCell = acaoStageCellRef.current;
    if (!prior || !acaoCell) return null;
    const priorRect = prior.getBoundingClientRect();
    const acaoRect = acaoCell.getBoundingClientRect();
    return priorRect.top + priorRect.height / 2 - acaoRect.top + DECISION_VERTICAL_SHIFT;
  }, [canvasSize.width, canvasSize.height]);

  const svgWidth = canvasSize.width || 1;
  const svgHeight = canvasSize.height || 1;
  const svgTitleId = "fig7-swimlane-title";
  const svgDescId = "fig7-swimlane-desc";
  const markerIds: Record<"flow", string> = {
    flow: "fig7FlowArrow",
  };

  return (
    <section
      aria-label="Figura 7 – Pipeline conceitual em faixas funcionais"
      className="w-full bg-linear-to-br from-[#fafbfc] to-[#f5f7fa] py-12"
      data-figure="7"
    >
  <div className="mx-auto flex w-full max-w-screen-3xl flex-col gap-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 border-b border-[#d1d9e0] pb-6 sm:flex-row sm:items-start sm:justify-between">
          <header className="max-w-3xl space-y-3">
            <h1 className="text-3xl font-bold text-[#1a2332] tracking-tight">
              Figura 7 – Pipeline conceitual
            </h1>
            <p className="text-base leading-relaxed text-[#37474f]">
              Representa como dados percorrem responsabilidades distintas – da captura ao campo – com repasses
              rotulados, controles e validação antes da execução.
            </p>
          </header>
          <div className="flex shrink-0 items-center gap-3">
            <button type="button" className={toolbarButtonClass} onClick={() => exportAsSVG(svgRef, "Figura07.svg")}>
              Exportar SVG
            </button>
            <button
              type="button"
              className={toolbarButtonClass}
              onClick={() => void exportDiagramPDF(svgRef, exportRootRef, "Figura07.pdf")}
            >
              Exportar PDF
            </button>
          </div>
        </div>
        <div className="relative" aria-describedby="fig7-caption" ref={exportRootRef}>
          <div className="relative" ref={containerRef}>
            <svg
              ref={svgRef}
              width={svgWidth}
              height={svgHeight}
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="pointer-events-none absolute inset-0 z-20 overflow-visible"
              role="img"
              aria-labelledby={`${svgTitleId} ${svgDescId}`}
            >
              <title id={svgTitleId}>Figura 7 – Pipeline conceitual, processo cross-functional</title>
              <desc id={svgDescId}>
                Diagrama de processo com quatro faixas horizontais, mostrando a sequência DADOS, INDICADORES, DSS e AÇÃO
                com setas rotuladas e pontos de controle QA/QC, tempestividade e validação em campo.
              </desc>
              <defs>
                <marker
                  id={markerIds.flow}
                  markerWidth="16"
                  markerHeight="9"
                  refX="16"
                  refY="4.5"
                  orient="auto"
                  markerUnits="userSpaceOnUse"
                >
                  <polygon points="0 0, 16 4.5, 0 9" fill={COLORS.connector} />
                </marker>
              </defs>
              {layoutReady && connectors.map((connector) => (
                <path
                  key={connector.id}
                  d={connector.d}
                  stroke={connector.color}
                  strokeWidth={connector.width ?? 1.6}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  markerEnd={connector.marker ? `url(#${markerIds[connector.marker]})` : undefined}
                >
                  <title>{connector.title}</title>
                </path>
              ))}
              {mergeNodes
                .filter((node) => node.sources > 1)
                .map((node) => (
                  <circle
                    key={`merge-${node.id}`}
                    cx={node.x}
                    cy={node.y}
                    r={MERGE_NODE_RADIUS}
                    fill="#ffffff"
                    stroke={node.color}
                    strokeWidth={1.4}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
            </svg>

            <div className="relative z-10 flex flex-col gap-6">
              <div className={stageHeaderClass} aria-hidden="true">
                <div />
                {STAGES.map((stage) => (
                  <div key={stage.id} className="flex items-center justify-center px-4 py-2 text-center" data-export="stage-header">
                    {stage.label}
                  </div>
                ))}
              </div>

              <div className={laneWrapperClass} data-export="lane" aria-label="Aquisição e Telemetria (IoT)">
                <div className={laneGridClass}>
                  <div className={laneLabelClass} data-export="lane-title">Aquisição &amp; Telemetria (IoT)</div>
                  <div className={stageCellClass} aria-label="Dados" data-stage="dados">
                    <article
                      ref={coletarRef}
                      className={activityCardClass}
                      data-export-card="atividade"
                      data-export-card-id="coletar-sensores"
                    >
                      <div className="flex items-start gap-3">
                        <span className={iconWrapperClass} aria-hidden="true" data-export="icon-wrapper">
                          <Radio className="h-4 w-4" data-export="icon" />
                        </span>
                        <div className="flex flex-col gap-1">
                          <h2 className={activityTitleClass} data-export="card-title">Coletar leituras de sensores</h2>
                          <p className={activityBodyClass} data-export="card-description">
                            Estações e gateways registram sinais meteorológicos, hidrológicos e status de rede.
                          </p>
                        </div>
                      </div>
                    </article>
                    <article
                      ref={transmitirRef}
                      className={activityCardClass + " mt-8 sm:mt-10"}
                      data-export-card="atividade"
                      data-export-card-id="transmitir-pacotes"
                    >
                      <div className="flex items-start gap-3">
                        <span className={iconWrapperClass} aria-hidden="true" data-export="icon-wrapper">
                          <Share2 className="h-4 w-4" data-export="icon" />
                        </span>
                        <div className="flex flex-col gap-1">
                          <h2 className={activityTitleClass} data-export="card-title">Transmitir pacotes IoT</h2>
                          <p className={activityBodyClass} data-export="card-description">
                            Pacotes autenticados enviam dados, heartbeat e metadados de origem via rede confiável.
                          </p>
                        </div>
                      </div>
                    </article>
                  </div>
                  <div className={stageCellClass} aria-hidden="true" data-stage="indicadores" />
                  <div className={stageCellClass} aria-hidden="true" data-stage="dss" />
                  <div className={stageCellClass} aria-hidden="true" data-stage="acao" />
                </div>
              </div>

              <div className={laneWrapperClass} data-export="lane" aria-label="Ingestão e Padronização (ETL/APIs)">
                <div className={laneGridClass}>
                  <div className={laneLabelClass} data-export="lane-title">Ingestão &amp; Padronização (ETL/APIs)</div>
                  <div className={stageCellClass} aria-label="Dados" data-stage="dados">
                    <article
                      ref={ingerirRef}
                      className={activityCardClass + " mt-16 sm:mt-20"}
                      data-export-card="atividade"
                      data-export-card-id="ingerir-streams"
                      data-spacing="custom-bottom-gap"
                    >
                      <div className="flex items-start gap-3">
                        <span className={iconWrapperClass} aria-hidden="true" data-export="icon-wrapper">
                          <Server className="h-4 w-4" data-export="icon" />
                        </span>
                        <div className="flex flex-col gap-1">
                          <h2 className={activityTitleClass} data-export="card-title">Ingerir streams e eventos</h2>
                          <p className={activityBodyClass} data-export="card-description">
                            Captura, autenticação e armazenamento resiliente de pacotes brutos e logs de operação.
                          </p>
                        </div>
                      </div>
                    </article>
                  </div>
                  <div className={stageCellClass} aria-label="Indicadores" data-stage="indicadores">
                    <article
                      ref={padronizarRef}
                      className={activityCardClass}
                      data-export-card="atividade"
                      data-export-card-id="padronizar-series"
                    >
                      <div className="flex items-start gap-3">
                        <span className={iconWrapperClass} aria-hidden="true" data-export="icon-wrapper">
                          <SlidersHorizontal className="h-4 w-4" data-export="icon" />
                        </span>
                        <div className="flex flex-col gap-1">
                          <h2 className={activityTitleClass} data-export="card-title">Padronizar séries</h2>
                          <p className={activityBodyClass} data-export="card-description">
                            Limpeza, QA/QC e normalização para formatos interoperáveis e consistentes.
                          </p>
                        </div>
                      </div>
                    </article>
                    <article
                      ref={publicarRef}
                      className={activityCardClass + " mt-12 sm:mt-14"}
                      data-export-card="atividade"
                      data-export-card-id="publicar-metadados"
                    >
                      <div className="flex items-start gap-3">
                        <span className={iconWrapperClass} aria-hidden="true" data-export="icon-wrapper">
                          <Database className="h-4 w-4" data-export="icon" />
                        </span>
                        <div className="flex flex-col gap-1">
                          <h2 className={activityTitleClass} data-export="card-title">Publicar catálogo e QA</h2>
                          <p className={activityBodyClass} data-export="card-description">
                            Metadados, versionamento e trilha de auditoria expostos via APIs SensorThings.
                          </p>
                        </div>
                      </div>
                    </article>
                  </div>
                  <div className={stageCellClass} aria-hidden="true" data-stage="dss" />
                  <div className={stageCellClass} aria-hidden="true" data-stage="acao" />
                </div>
              </div>

              <div className={laneWrapperClass} data-export="lane" aria-label="Indicadores e Análises (ET₀, BH)">
                <div className={laneGridClass}>
                  <div className={laneLabelClass} data-export="lane-title">Indicadores &amp; Análises (ET₀, BH)</div>
                  <div className={stageCellClass} aria-hidden="true" data-stage="dados" />
                  <div className={stageCellClass} aria-label="Indicadores" data-stage="indicadores">
                    <article
                      ref={calcularRef}
                      className={activityCardClass + " mt-4 sm:mt-6"}
                      data-export-card="atividade"
                      data-export-card-id="calcular-indicadores"
                    >
                      <div className="flex items-start gap-3">
                        <span className={iconWrapperClass} aria-hidden="true" data-export="icon-wrapper">
                          <ThermometerSun className="h-4 w-4" data-export="icon" />
                        </span>
                        <div className="flex flex-col gap-1">
                          <h2 className={activityTitleClass} data-export="card-title">Calcular ET₀ e balanço hídrico</h2>
                          <p className={activityBodyClass} data-export="card-description">
                            Modelos padronizados geram indicadores interoperáveis com rastreabilidade de insumos.
                          </p>
                        </div>
                      </div>
                    </article>
                    <article
                      ref={validarRef}
                      className={activityCardClass + " mt-10 sm:mt-14"}
                      data-export-card="atividade"
                      data-export-card-id="validar-indicadores"
                    >
                      <div className="flex items-start gap-3">
                        <span className={iconWrapperClass} aria-hidden="true" data-export="icon-wrapper">
                          <ListChecks className="h-4 w-4" data-export="icon" />
                        </span>
                        <div className="flex flex-col gap-1">
                          <h2 className={activityTitleClass} data-export="card-title">Validar indicadores</h2>
                          <p className={activityBodyClass} data-export="card-description">
                            Revisão automática e supervisada avalia consistência, qualidade e limites operacionais.
                          </p>
                        </div>
                      </div>
                    </article>
                  </div>
                  <div className={stageCellClass} aria-hidden="true" data-stage="dss" />
                  <div className={stageCellClass} aria-hidden="true" data-stage="acao" />
                </div>
              </div>

              <div className={laneWrapperClass} data-export="lane" aria-label="DSS — Recomendação">
                <div className={laneGridClass}>
                  <div className={laneLabelClass} data-export="lane-title">DSS — Recomendação</div>
                  <div className={stageCellClass} aria-hidden="true" data-stage="dados" />
                  <div className={stageCellClass} aria-hidden="true" data-stage="indicadores" />
                  <div className={stageCellClass} aria-label="Recomendação" data-stage="dss">
                    <article
                      ref={gerarRef}
                      className={activityCardClass}
                      data-export-card="atividade"
                      data-export-card-id="gerar-recomendacao"
                    >
                      <div className="flex items-start gap-3">
                        <span className={iconWrapperClass} aria-hidden="true" data-export="icon-wrapper">
                          <Workflow className="h-4 w-4" data-export="icon" />
                        </span>
                        <div className="flex flex-col gap-1">
                          <h2 className={activityTitleClass} data-export="card-title">Gerar recomendação contextualizada</h2>
                          <p className={activityBodyClass} data-export="card-description">
                            DSS aplica regras e modelos para traduzir indicadores em ações sugeridas por talhão.
                          </p>
                        </div>
                      </div>
                    </article>
                    <article
                      ref={priorizarRef}
                      className={activityCardClass + " mt-16 sm:mt-20"}
                      data-export-card="atividade"
                      data-export-card-id="priorizar-ordens"
                    >
                      <div className="flex items-start gap-3">
                        <span className={iconWrapperClass} aria-hidden="true" data-export="icon-wrapper">
                          <ClipboardList className="h-4 w-4" data-export="icon" />
                        </span>
                        <div className="flex flex-col gap-1">
                          <h2 className={activityTitleClass} data-export="card-title">Priorizar ordens e alertas</h2>
                          <p className={activityBodyClass} data-export="card-description">
                            Consolida ordens de trabalho, nível de risco e janelas disponíveis para execução.
                          </p>
                        </div>
                      </div>
                    </article>
                  </div>
                  <div className={stageCellClass} aria-hidden="true" data-stage="acao" />
                </div>
              </div>

              <div className={laneWrapperClass} data-export="lane" aria-label="Operações em Campo — Ação/Execução">
                <div className={laneGridClass}>
                  <div className={laneLabelClass} data-export="lane-title">Operações em Campo — Ação</div>
                  <div className={stageCellClass} aria-hidden="true" data-stage="dados" />
                  <div className={stageCellClass} aria-hidden="true" data-stage="indicadores" />
                  <div className={stageCellClass} aria-hidden="true" data-stage="dss" />
                  <div ref={acaoStageCellRef} className={stageCellClass + " relative"} aria-label="Ação" data-stage="acao">
                    {decisionCenterY !== null ? (
                      <div
                        ref={decisaoRef}
                        className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 h-20 w-20"
                        style={{ top: decisionCenterY }}
                        data-export-card="decisao"
                        data-export-card-id="decisao-execucao"
                      >
                        <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-md border border-[#b8c4d6] bg-white shadow-sm" />
                        <div className="absolute left-1/2 top-1/2 w-24 -translate-x-1/2 -translate-y-1/2 text-center">
                          <p className={`${activityTitleClass} leading-tight`} data-export="card-title">Validar<br />execução</p>
                        </div>
                      </div>
                    ) : null}
                    <article
                      ref={executarRef}
                      className={activityCardClass}
                      data-export-card="atividade"
                      data-export-card-id="executar-lamina"
                    >
                      <div className="flex items-start gap-3">
                        <span className={iconWrapperClass} aria-hidden="true" data-export="icon-wrapper">
                          <Sprout className="h-4 w-4" data-export="icon" />
                        </span>
                        <div className="flex flex-col gap-1">
                          <h2 className={activityTitleClass} data-export="card-title">Executar aplicação de lâmina</h2>
                          <p className={activityBodyClass} data-export="card-description">
                            Equipes de campo aplicam lâmina, turnos ou ajustes conforme ordem priorizada.
                          </p>
                        </div>
                      </div>
                    </article>
                    <article
                      ref={registrarRef}
                      className={activityCardClass + " mt-12 sm:mt-16"}
                      data-export-card="atividade"
                      data-export-card-id="registrar-feedback"
                    >
                      <div className="flex items-start gap-3">
                        <span className={iconWrapperClass} aria-hidden="true" data-export="icon-wrapper">
                          <ClipboardCheck className="h-4 w-4" data-export="icon" />
                        </span>
                        <div className="flex flex-col gap-1">
                          <h2 className={activityTitleClass} data-export="card-title">Registrar execução e feedback</h2>
                          <p className={activityBodyClass} data-export="card-description">
                            Logs, fotos e inconsistências retornam ao DSS para reavaliação e novos ciclos.
                          </p>
                        </div>
                      </div>
                    </article>
                  </div>
                </div>
              </div>
            </div>

            {layoutReady && connectors.map((connector) =>
              connector.label && connector.labelPosition ? (
                <span
                  key={`${connector.id}-label`}
                  ref={connector.id === "ingerir-padronizar" ? dadosLabelRef : undefined}
                  className={`${connectorLabelClass} ${connector.id === "ingerir-padronizar" ? "px-8" : ""}`}
                  style={{ left: connector.labelPosition.x, top: connector.labelPosition.y }}
                  aria-hidden="true"
                  data-export="connector-label"
                  data-pointer={connector.orientation === 'vertical' ? 'down' : 'right'}
                >
                  {connector.label}
                </span>
              ) : null,
            )}

            {calloutPositions.qaqc ? (
              <div
                className={calloutClass}
                style={{ left: calloutPositions.qaqc.x, top: calloutPositions.qaqc.y }}
                aria-label="Controle de QA/QC de observações"
                data-export="callout"
              >
                <ShieldCheck className="h-4 w-4 text-[#1f6feb]" aria-hidden="true" />
                QA/QC de observações
                <span className="absolute left-1/2 top-full block h-0 w-0 -translate-x-1/2 border-x-[6px] border-x-transparent border-t-[6px] border-t-[#b8c4d6]" />
                <span className="absolute left-1/2 top-full block h-0 w-0 -translate-x-1/2 border-x-[5px] border-x-transparent border-t-[5px] border-t-white" />
              </div>
            ) : null}

            {calloutPositions.latency ? (
              <div
                className={calloutClass}
                style={{ left: calloutPositions.latency.x, top: calloutPositions.latency.y }}
                aria-label="Controle de tempestividade e latência"
                data-export="callout"
              >
                <Clock className="h-4 w-4 text-[#1f6feb]" aria-hidden="true" />
                Tempestividade / Latência
                <span className="absolute left-1/2 top-full block h-0 w-0 -translate-x-1/2 border-x-[6px] border-x-transparent border-t-[6px] border-t-[#b8c4d6]" />
                <span className="absolute left-1/2 top-full block h-0 w-0 -translate-x-1/2 border-x-[5px] border-x-transparent border-t-[5px] border-t-white" />
              </div>
            ) : null}

            {calloutPositions.validation ? (
              <div
                className={calloutClass}
                style={{ left: calloutPositions.validation.x, top: calloutPositions.validation.y }}
                aria-label="Controle de validação do algoritmo em campo"
                data-export="callout"
              >
                <ClipboardCheck className="h-4 w-4 text-[#1f6feb]" aria-hidden="true" />
                Validação do algoritmo
                <span className="absolute left-1/2 top-full block h-0 w-0 -translate-x-1/2 border-x-[6px] border-x-transparent border-t-[6px] border-t-[#b8c4d6]" />
                <span className="absolute left-1/2 top-full block h-0 w-0 -translate-x-1/2 border-x-[5px] border-x-transparent border-t-[5px] border-t-white" />
              </div>
            ) : null}
          </div>

        <footer
          className="mt-6 rounded-xl border border-[#d1d9e0] bg-white/90 px-5 py-4"
          data-export="legend"
          aria-label="Legenda do diagrama"
        >
          <h2 className="text-sm font-semibold text-[#1a2332]" data-export="legend-text">Legenda</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {/* Decisão primeiro */}
            <div className="flex items-center gap-3">
              <span className="relative inline-flex items-center gap-2 rounded-md border border-[#d6dde8] bg-white px-3 py-2 text-xs font-semibold text-[#1a2332]" data-export="legend-pill">
                <span className="relative h-6 w-6" aria-hidden="true">
                  <span className="absolute left-1/2 top-1/2 block h-4 w-4 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-sm border border-[#1f6feb] bg-white" data-export="legend-diamond" />
                </span>
                <span data-export="legend-text">Decisão (losango)</span>
              </span>
              <p className="text-xs leading-snug text-[#4d5d7a]" data-export="legend-text">Ponto de aprovação que direciona execução ou revisão.</p>
            </div>
            {/* Atividade / responsável */}
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-md border border-[#d6dde8] bg-white px-3 py-2 text-xs font-semibold text-[#1a2332]" data-export="legend-pill">
                <span className={iconWrapperClass} aria-hidden="true" data-export="icon-wrapper">
                  <Workflow className="h-4 w-4" data-export="icon" />
                </span>
                <span data-export="legend-text">Atividade / responsável</span>
              </span>
              <p className="text-xs leading-snug text-[#4d5d7a]" data-export="legend-text">Caixa resume a ação sob responsabilidade da faixa.</p>
            </div>
            {/* Conector rotulado */}
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-md border border-[#d6dde8] bg-white px-3 py-2 text-xs font-semibold text-[#1a2332]" data-export="legend-pill">
                <span className="inline-block h-0.5 w-8 bg-[#1f6feb]" aria-hidden="true" data-export="legend-swatch" />
                <span data-export="legend-text">Conector rotulado</span>
              </span>
              <p className="text-xs leading-snug text-[#4d5d7a]" data-export="legend-text">Indica artefatos repassados entre faixas.</p>
            </div>
          </div>
          <p id="fig7-caption" className="mt-3 text-xs leading-6 text-[#1a2332]" data-export="legend-paragraph">
            Sequência horizontal: Dados → Indicadores → DSS → Ação. Setas apenas cruzam fronteiras de responsabilidade,
            mantendo rastreabilidade e transparência entre handoffs.
          </p>
        </footer>
        </div>
      </div>
    </section>
  );
}
