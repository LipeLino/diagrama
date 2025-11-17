"use client";

import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Activity, AlertTriangle, RefreshCw, RotateCcw, TrendingUp, Workflow } from "lucide-react";

import { exportAsSVG, exportDiagramPDF } from "../figura-02/Figure02_Encadeamento";
import { useCurvedConnector, useRerouteOnResize } from "../_components/diagramHooks";

const COLORS = {
  gradientFrom: "#fafbfc",
  gradientTo: "#f5f7fa",
  connector: "#1f6feb",
};

const STAGES = [
  { id: "timeline", label: "Linha Temporal" },
  { id: "validation", label: "Validação" },
  { id: "production", label: "Produção" },
  { id: "supervision", label: "Supervisão" },
  { id: "decision", label: "Decisão" },
  { id: "actions", label: "Ações" },
];

const TIMELINE_WINDOWS = [
  { id: "wf-01", train: "t₀…t₄", test: "t₅", color: "#1f6feb" },
  { id: "wf-02", train: "t₁…t₅", test: "t₆", color: "#0ea5e9" },
  { id: "wf-03", train: "t₂…t₆", test: "t₇", color: "#10b981" },
  { id: "wf-04", train: "t₃…t₇", test: "t₈", color: "#f97316" },
] as const;

const toolbarButtonClass =
  "inline-flex items-center gap-2 rounded-lg border border-[#1565c0] bg-white px-5 py-2.5 text-sm font-semibold text-[#1565c0] transition-colors hover:bg-[#eef4ff]";
const stageHeaderClass =
  "grid grid-cols-[12rem_repeat(6,minmax(0,2.4fr))] gap-x-14 text-sm font-semibold uppercase tracking-[0.12em] text-[#1a2332]";
const laneWrapperClass = "relative rounded-2xl border border-[#ccd6e4] bg-white/95";
const laneGridClass =
  "grid grid-cols-[12rem_repeat(6,minmax(0,2.4fr))] items-start gap-x-14 gap-y-5 px-8 py-8";
const laneLabelClass =
  "flex h-full items-center justify-center px-2 text-center text-sm font-semibold uppercase tracking-[0.12em] text-[#1a2332] [writing-mode:vertical-rl] rotate-180 origin-center whitespace-normal break-words";
const stageCellClass = "flex min-h-[140px] flex-col justify-center gap-4";
const activityCardClass =
  "relative w-full flex flex-col gap-3 rounded-xl border border-[#d6dde8] bg-white px-9 py-6 shadow-sm";
const activityTitleClass = "text-base font-semibold text-[#1a2332]";
const activityBodyClass = "text-sm leading-relaxed text-[#4d5d7a]";
const iconWrapperClass =
  "flex h-8 w-8 items-center justify-center rounded-md border border-[#bfd2f3] bg-[#e9f1ff] text-[#1f6feb]";
const connectorLabelClass =
  "pointer-events-none rounded-full border border-[#c5d2e3] bg-white px-4 py-1 text-xs font-semibold uppercase tracking-wide text-[#1a2332] shadow-sm";

type ConnectorDescriptor = {
  id: string;
  d: string;
  color: string;
  title: string;
  marker?: "flow";
  width?: number;
  label?: string;
  labelPosition?: { x: number; y: number } | null;
};

export default function Figure15_Walkforward() {
  const diagramRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const timelineRef = useRef<HTMLDivElement | null>(null);
  const validationRef = useRef<HTMLDivElement | null>(null);
  const productionRef = useRef<HTMLDivElement | null>(null);
  const monitoringRef = useRef<HTMLDivElement | null>(null);
  const driftRef = useRef<HTMLDivElement | null>(null);
  const decisionRef = useRef<HTMLDivElement | null>(null);
  const retrainRef = useRef<HTMLDivElement | null>(null);
  const rollbackRef = useRef<HTMLDivElement | null>(null);

  const timelineToValidation = useCurvedConnector(diagramRef, timelineRef, validationRef, {
    minDx: 90,
    arcLift: 14,
  });
  const validationToProduction = useCurvedConnector(diagramRef, validationRef, productionRef, {
    minDx: 110,
    arcLift: 10,
  });
  const productionToMonitoring = useCurvedConnector(diagramRef, productionRef, monitoringRef, {
    minDx: 100,
    arcLift: 4,
  });
  const productionToDrift = useCurvedConnector(diagramRef, productionRef, driftRef, {
    minDx: 100,
    arcLift: 10,
  });
  const monitoringToDecision = useCurvedConnector(diagramRef, monitoringRef, decisionRef, {
    minDx: 110,
    arcLift: 6,
  });
  const driftToDecision = useCurvedConnector(diagramRef, driftRef, decisionRef, {
    minDx: 110,
    arcLift: -6,
  });
  const decisionToRetrain = useCurvedConnector(diagramRef, decisionRef, retrainRef, {
    minDx: 100,
    fromAnchorY: "top",
    toAnchorY: "top",
    fromInset: 16,
    toInset: 12,
    arcLift: 12,
  });
  const decisionToRollback = useCurvedConnector(diagramRef, decisionRef, rollbackRef, {
    minDx: 100,
    fromAnchorY: "bottom",
    toAnchorY: "bottom",
    fromInset: 16,
    toInset: 12,
    arcLift: -12,
  });

  const timelineValidationLabel = useConnectorLabelPosition(diagramRef, timelineRef, validationRef, { y: -26 });
  const validationProductionLabel = useConnectorLabelPosition(diagramRef, validationRef, productionRef, { y: -18 });
  const prodMonitoringLabel = useConnectorLabelPosition(diagramRef, productionRef, monitoringRef, { y: -22 });
  const prodDriftLabel = useConnectorLabelPosition(diagramRef, productionRef, driftRef, { y: 20 });
  const monitoringDecisionLabel = useConnectorLabelPosition(diagramRef, monitoringRef, decisionRef, { y: -18 });
  const driftDecisionLabel = useConnectorLabelPosition(diagramRef, driftRef, decisionRef, { y: 16 });
  const decisionRetrainLabel = useConnectorLabelPosition(diagramRef, decisionRef, retrainRef, { y: -24 });
  const decisionRollbackLabel = useConnectorLabelPosition(diagramRef, decisionRef, rollbackRef, { y: 22 });

  const connectors = useMemo<ConnectorDescriptor[]>(() => {
    const items: ConnectorDescriptor[] = [];
    const addConnector = (descriptor: ConnectorDescriptor) => {
      if (!descriptor.d) return;
      items.push(descriptor);
    };

    addConnector({
      id: "timeline-validation",
      d: timelineToValidation,
      color: COLORS.connector,
      title: "Linha temporal → Validação",
      marker: "flow",
      label: "Janelas avaliadas",
      labelPosition: timelineValidationLabel,
    });
    addConnector({
      id: "validation-production",
      d: validationToProduction,
      color: COLORS.connector,
      title: "Validação → Produção",
      marker: "flow",
      label: "Modelo aprovado",
      labelPosition: validationProductionLabel,
    });
    addConnector({
      id: "production-monitoring",
      d: productionToMonitoring,
      color: COLORS.connector,
      title: "Produção → Monitoramento",
      marker: "flow",
      label: "Métricas ao vivo",
      labelPosition: prodMonitoringLabel,
    });
    addConnector({
      id: "production-drift",
      d: productionToDrift,
      color: COLORS.connector,
      title: "Produção → Detector de drift",
      marker: "flow",
      label: "Resíduos e logs",
      labelPosition: prodDriftLabel,
    });
    addConnector({
      id: "monitoring-decision",
      d: monitoringToDecision,
      color: COLORS.connector,
      title: "Monitoramento → Decisão",
      marker: "flow",
      label: "Alertas",
      labelPosition: monitoringDecisionLabel,
    });
    addConnector({
      id: "drift-decision",
      d: driftToDecision,
      color: COLORS.connector,
      title: "Drift → Decisão",
      marker: "flow",
      label: "Degradação",
      labelPosition: driftDecisionLabel,
    });
    addConnector({
      id: "decision-retrain",
      d: decisionToRetrain,
      color: "#10a37f",
      title: "Decisão → Retreinamento",
      marker: "flow",
      label: "Sim",
      labelPosition: decisionRetrainLabel,
    });
    addConnector({
      id: "decision-rollback",
      d: decisionToRollback,
      color: "#d73a49",
      title: "Decisão → Rollback",
      marker: "flow",
      label: "Não",
      labelPosition: decisionRollbackLabel,
    });

    return items;
  }, [
    decisionRetrainLabel,
    decisionRollbackLabel,
    decisionToRetrain,
    decisionToRollback,
    driftDecisionLabel,
    driftToDecision,
    monitoringDecisionLabel,
    monitoringToDecision,
    prodDriftLabel,
    prodMonitoringLabel,
    productionToDrift,
    productionToMonitoring,
    timelineToValidation,
    timelineValidationLabel,
    validationProductionLabel,
    validationToProduction,
  ]);

  const handleExportSVG = useCallback(() => {
    if (svgRef.current) {
      exportAsSVG(svgRef, "figura-15-walkforward.svg");
    }
  }, []);

  const handleExportPDF = useCallback(() => {
    if (svgRef.current && diagramRef.current) {
      exportDiagramPDF(svgRef, diagramRef, "figura-15-walkforward.pdf");
    }
  }, []);

  return (
    <div
      className="min-h-screen w-full"
      style={{ background: `linear-gradient(to bottom, ${COLORS.gradientFrom}, ${COLORS.gradientTo})` }}
    >
      <div className="mx-auto w-full px-8 py-12">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#1a2332]">Figura 15 – Walk-forward Validation em Produção</h1>
            <p className="mt-2 text-sm text-[#4d5d7a]">
              Validação iterativa, implantação, supervisão contínua, detecção de drift e governança de ações
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={handleExportSVG} className={toolbarButtonClass}>
              Exportar SVG
            </button>
            <button onClick={handleExportPDF} className={toolbarButtonClass}>
              Exportar PDF
            </button>
          </div>
        </header>

        <div ref={diagramRef} className="relative flex flex-col gap-10">
          <div className={stageHeaderClass}>
            <div />
            {STAGES.map((stage) => (
              <div key={stage.id} className="px-4">
                {stage.label}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-6">
            <LaneValidation timelineRef={timelineRef} validationRef={validationRef} />
            <LaneProduction productionRef={productionRef} />
            <LaneSupervision monitoringRef={monitoringRef} driftRef={driftRef} />
            <LaneGovernance decisionRef={decisionRef} retrainRef={retrainRef} rollbackRef={rollbackRef} />
          </div>

          <svg
            ref={svgRef}
            className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible"
            style={{ minHeight: "100%" }}
          >
            <defs>
              <marker id="arrow-flow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill={COLORS.connector} />
              </marker>
              <marker id="arrow-success" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#10a37f" />
              </marker>
              <marker id="arrow-danger" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#d73a49" />
              </marker>
            </defs>
            {connectors.map((conn) => (
              <g key={conn.id}>
                <path
                  d={conn.d}
                  fill="none"
                  stroke={conn.color}
                  strokeWidth={conn.width ?? 2.5}
                  markerEnd={
                    conn.marker
                      ? conn.color === "#10a37f"
                        ? "url(#arrow-success)"
                        : conn.color === "#d73a49"
                        ? "url(#arrow-danger)"
                        : "url(#arrow-flow)"
                      : undefined
                  }
                  style={{ filter: "drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.1))" }}
                />
                {conn.label && conn.labelPosition && (
                  <foreignObject
                    x={conn.labelPosition.x - 70}
                    y={conn.labelPosition.y - 18}
                    width={140}
                    height={36}
                    className="pointer-events-none"
                  >
                    <div className={connectorLabelClass}>{conn.label}</div>
                  </foreignObject>
                )}
              </g>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}

function LaneValidation({ timelineRef, validationRef }: { timelineRef: React.RefObject<HTMLDivElement | null>; validationRef: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div className={laneWrapperClass}>
      <div className={laneGridClass}>
        <div className={laneLabelClass}>Validação Iterativa</div>
        <div className={stageCellClass}>
          <div ref={timelineRef} className="h-full">
            <TimelineVisualization windows={TIMELINE_WINDOWS} />
          </div>
        </div>
        <div className={stageCellClass}>
          <div ref={validationRef} className={activityCardClass}>
            <div className="flex items-start gap-3">
              <div className={iconWrapperClass}>
                <TrendingUp size={18} />
              </div>
              <div className="flex-1">
                <h3 className={activityTitleClass}>Walk-forward Validation</h3>
                <p className={activityBodyClass}>
                  Janelas deslizantes de treino/teste garantem avaliação prospectiva (t₀…t₄ → t₅, t₁…t₅ → t₆, etc.).
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className={stageCellClass} aria-hidden="true" />
        <div className={stageCellClass} aria-hidden="true" />
        <div className={stageCellClass} aria-hidden="true" />
        <div className={stageCellClass} aria-hidden="true" />
      </div>
    </div>
  );
}

function LaneProduction({ productionRef }: { productionRef: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div className={laneWrapperClass}>
      <div className={laneGridClass}>
        <div className={laneLabelClass}>Produção Operacional</div>
        <div className={stageCellClass} aria-hidden="true" />
        <div className={stageCellClass} aria-hidden="true" />
        <div className={stageCellClass}>
          <div ref={productionRef} className={activityCardClass}>
            <div className="flex items-start gap-3">
              <div className={iconWrapperClass}>
                <Workflow size={18} />
              </div>
              <div className="flex-1">
                <h3 className={activityTitleClass}>Implantação em Produção</h3>
                <p className={activityBodyClass}>
                  Modelo validado publica ET₀ via APIs (`/api/chart-data`) e jobs batch sincronizam o painel.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className={stageCellClass}>
          <div className="flex h-full items-center rounded-xl border border-dashed border-[#cfd8ec] bg-white/50 px-6 py-4 text-sm text-[#4d5d7a]">
            Telemetria (latência, logs, disponibilidade) abastece a faixa de supervisão contínua.
          </div>
        </div>
        <div className={stageCellClass} aria-hidden="true" />
        <div className={stageCellClass} aria-hidden="true" />
      </div>
    </div>
  );
}

function LaneSupervision({
  monitoringRef,
  driftRef,
}: {
  monitoringRef: React.RefObject<HTMLDivElement | null>;
  driftRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className={laneWrapperClass}>
      <div className={laneGridClass}>
        <div className={laneLabelClass}>Supervisão Pós-Implantação</div>
        <div className={stageCellClass} aria-hidden="true" />
        <div className={stageCellClass} aria-hidden="true" />
        <div className={stageCellClass} aria-hidden="true" />
        <div className={stageCellClass}>
          <div className="relative pt-4">
            <div className="absolute inset-0 -mx-4 -my-3 rounded-xl border-2 border-dashed border-[#8250df]/40 bg-[#8250df]/5" />
            <div className="absolute -top-8 left-2 rounded-md bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#8250df]">
              Observabilidade Contínua
            </div>
            <div className="relative z-10 flex flex-col gap-5">
              <div ref={monitoringRef} className={activityCardClass}>
                <div className="flex items-start gap-3">
                  <div className={iconWrapperClass}>
                    <Activity size={18} />
                  </div>
                  <div className="flex-1">
                    <h3 className={activityTitleClass}>Monitoramento de Métricas</h3>
                    <p className={activityBodyClass}>
                      Acompanha MAE, RMSE, latência, disponibilidade e freshness de dados em dashboards Prometheus/Grafana.
                    </p>
                  </div>
                </div>
              </div>
              <div ref={driftRef} className={activityCardClass}>
                <div className="flex items-start gap-3">
                  <div className={iconWrapperClass}>
                    <AlertTriangle size={18} />
                  </div>
                  <div className="flex-1">
                    <h3 className={activityTitleClass}>Detecção de Drift</h3>
                    <p className={activityBodyClass}>
                      Detecta mudanças em distribuição, sazonalidade e erro acumulado com testes KS/CUSUM e gatilhos sazonais.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className={stageCellClass} aria-hidden="true" />
        <div className={stageCellClass} aria-hidden="true" />
      </div>
    </div>
  );
}

function LaneGovernance({
  decisionRef,
  retrainRef,
  rollbackRef,
}: {
  decisionRef: React.RefObject<HTMLDivElement | null>;
  retrainRef: React.RefObject<HTMLDivElement | null>;
  rollbackRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className={laneWrapperClass}>
      <div className={laneGridClass}>
        <div className={laneLabelClass}>Governança & Ações</div>
        <div className={stageCellClass} aria-hidden="true" />
        <div className={stageCellClass} aria-hidden="true" />
        <div className={stageCellClass} aria-hidden="true" />
        <div className={stageCellClass} aria-hidden="true" />
        <div className={`${stageCellClass} items-center`}>
          <div ref={decisionRef} className="flex min-h-[140px] items-center justify-center">
            <DecisionDiamond label="Intervir?" />
          </div>
        </div>
        <div className={stageCellClass}>
          <div className="flex flex-col gap-5">
            <div ref={retrainRef} className={activityCardClass}>
              <div className="flex items-start gap-3">
                <div className={iconWrapperClass}>
                  <RefreshCw size={18} />
                </div>
                <div className="flex-1">
                  <h3 className={activityTitleClass}>Retreinamento</h3>
                  <p className={activityBodyClass}>
                    Atualiza pesos com dados recentes, reexecuta validação walk-forward e versiona o modelo antes da nova implantação.
                  </p>
                </div>
              </div>
            </div>
            <div ref={rollbackRef} className={activityCardClass}>
              <div className="flex items-start gap-3">
                <div className={iconWrapperClass}>
                  <RotateCcw size={18} />
                </div>
                <div className="flex-1">
                  <h3 className={activityTitleClass}>Rollback</h3>
                  <p className={activityBodyClass}>
                    Reverte para a versão estável anterior enquanto a equipe analisa incidentes e ajusta limites operacionais.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineVisualization({ windows }: { windows: typeof TIMELINE_WINDOWS }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[#d6dde8] bg-white px-4 py-4">
      <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-[#1a2332]">Janelas Walk-forward</h3>
      <svg width="100%" height="110" viewBox="0 0 320 110">
        {windows.map((win, idx) => {
          const y = 10 + idx * 26;
          return (
            <g key={win.id}>
              <rect x="5" y={y} width="140" height="20" fill={win.color} fillOpacity="0.2" stroke={win.color} strokeWidth="1.5" rx="3" />
              <rect x="150" y={y} width="55" height="20" fill={win.color} fillOpacity="0.5" stroke={win.color} strokeWidth="1.5" rx="3" />
              <text x="10" y={y + 14} fontSize="9" fill="#1a2332" fontWeight="600">
                Treino: {win.train}
              </text>
              <text x="155" y={y + 14} fontSize="9" fill="#1a2332" fontWeight="600">
                Teste: {win.test}
              </text>
              {idx < windows.length - 1 && (
                <path d={`M 215 ${y + 10} L 230 ${y + 36}`} stroke="#4d5d7a" strokeWidth="1.5" markerEnd="url(#timeline-arrow)" strokeDasharray="3,3" />
              )}
            </g>
          );
        })}
        <defs>
          <marker id="timeline-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#4d5d7a" />
          </marker>
        </defs>
      </svg>
    </div>
  );
}

function DecisionDiamond({ label }: { label: string }) {
  return (
    <svg width="110" height="110" viewBox="0 0 100 100">
      <path d="M 50 5 L 95 50 L 50 95 L 5 50 Z" fill="white" stroke="#1f6feb" strokeWidth="2.5" />
      <text
        x="50"
        y="50"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="14"
        fontWeight="600"
        fill="#1a2332"
      >
        {label}
      </text>
    </svg>
  );
}

function useConnectorLabelPosition(
  containerRef: React.RefObject<HTMLDivElement | null>,
  fromRef: React.RefObject<HTMLElement | null>,
  toRef: React.RefObject<HTMLElement | null>,
  offsets: { x?: number; y?: number } = {},
) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const offsetX = offsets.x ?? 0;
  const offsetY = offsets.y ?? 0;

  const update = useCallback(() => {
    const container = containerRef.current;
    const fromEl = fromRef.current;
    const toEl = toRef.current;
    if (!container || !fromEl || !toEl) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();

    const startX = fromRect.right - containerRect.left;
    const startY = fromRect.top + fromRect.height / 2 - containerRect.top;
    const endX = toRect.left - containerRect.left;
    const endY = toRect.top + toRect.height / 2 - containerRect.top;

    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    const dx = endX - startX;
    const dy = endY - startY;

    let labelX = midX + offsetX;
    let labelY = midY + offsetY;

    // Prefer to offset labels in the perpendicular direction to the connector
    if (Math.abs(dx) > Math.abs(dy)) {
      // Mostly horizontal connector -> move label vertically away from the path
      const verticalOffset = dy >= 0 ? -22 : 22;
      labelY = midY + verticalOffset + offsetY;
    } else {
      // Mostly vertical connector -> move label horizontally away from the path
      const horizontalOffset = dx >= 0 ? 28 : -28;
      labelX = midX + horizontalOffset + offsetX;
    }

    // Keep labels inside the diagram container with a minimum margin
    const MARGIN = 12;
    const boundedX = Math.min(Math.max(labelX, MARGIN), containerRect.width - MARGIN);
    const boundedY = Math.min(Math.max(labelY, MARGIN), containerRect.height - MARGIN);

    setPosition({ x: boundedX, y: boundedY });
  }, [containerRef, fromRef, toRef, offsetX, offsetY]);

  useLayoutEffect(() => {
    update();
  }, [update]);

  useRerouteOnResize([containerRef, fromRef, toRef], update);

  return position;
}

