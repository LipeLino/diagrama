'use client';

import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import {
	Camera,
	Cpu,
	Database,
	Droplets,
	Gauge,
		Globe,
		LayoutDashboard,
		RadioTower,
	ServerCog,
	Settings2,
	Sun,
} from 'lucide-react';

import { exportAsSVG, exportDiagramPDF } from '../figura-02/Figure02_Encadeamento';

const STROKE_BY_TARGET = {
	field: '#1E88E5',
	network: '#00897B',
	platform: '#6C5CE7',
	consumer: '#FB8C00',
} as const;

const toolbarButtonClass =
	'inline-flex items-center gap-2 rounded-lg border-2 border-[#1565c0] bg-white px-5 py-2.5 text-sm font-semibold text-[#1565c0] shadow-sm hover:bg-[#f5f5f5] transition-colors';
const laneClass =
	'relative z-0 overflow-visible rounded-xl border-2 border-[#d1d9e0] bg-white w-full shadow-sm';
const laneHeadClass =
	'flex items-center justify-center rounded-t-xl bg-[#1565c0] px-4 py-4 text-base font-bold text-white tracking-wide uppercase shadow-sm antialiased';
const laneBodyClass = 'relative flex flex-col gap-6 px-5 py-6 bg-gradient-to-b from-white to-[#fafbfc]';
const hintClass = 'inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 text-sm font-semibold text-[#1565c0] bg-[#e3f2fd] border border-[#90caf9] rounded-md w-fit antialiased';
const platformCardClass =
	'relative mx-auto w-full rounded-lg border border-[#e0e7ef] bg-white px-6 py-4 max-w-[440px] shadow-sm hover:shadow-md transition-shadow';
const cardContainerClass =
	'relative mx-auto w-full rounded-lg border border-[#e0e7ef] bg-white px-6 py-4 max-w-[415px] shadow-sm hover:shadow-md transition-shadow';
const variableCardClass =
	'relative mx-auto w-full rounded-lg border border-[#e0e7ef] bg-white px-6 py-4 max-w-[450px] shadow-sm hover:shadow-md transition-shadow';
const cardTitleClass = 'text-[15px] font-bold text-[#1a2332] leading-snug antialiased';
const cardBodyTextClass = 'text-[13px] leading-relaxed text-[#2d3748] antialiased';
const pillTextClass =
	'whitespace-nowrap rounded-md bg-linear-to-r from-[#e3f2fd] to-[#bbdefb] px-3 py-1 text-[13px] font-bold text-[#0d47a1] border border-[#90caf9] antialiased';
const iconWrapperClass =
	'flex h-7 w-7 items-center justify-center rounded-lg bg-[#e3f2fd] text-[#1565C0] border border-[#90caf9] shadow-sm';

const ARROW_LENGTH = 16;
const STRAIGHT_SEGMENT = 12;
const MERGE_NODE_R = 4;
const MERGE_MIN_GAP = 36;
const RIGHT_GUTTER = 80;
const DASHBOARD_MERGE_Y_OFFSET = 56;

type ConnectorOptions = {
	curv?: number;
	offset?: number;
	fromOffset?: number;
	toOffset?: number;
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

const getStrokeByTarget = (targetId: keyof typeof STROKE_BY_TARGET) => STROKE_BY_TARGET[targetId];

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
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		if (document.fonts && 'ready' in document.fonts) {
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			(document.fonts.ready as Promise<void>).then(() => schedule());
		}
		schedule();

		return () => {
			if (frame !== null) cancelAnimationFrame(frame);
			observed.forEach((el) => observer.unobserve(el));
			observer.disconnect();
			window.removeEventListener('resize', schedule);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [onResize]);
}

function useMergePoint(
	containerRef: React.RefObject<HTMLDivElement | null>,
	sourceRefs: Array<React.RefObject<HTMLElement | null>>,
	targetRef: React.RefObject<HTMLElement | null>,
	xGap: number = 28,
	side: 'left' | 'right' = 'left',
): { x: number; y: number } {
	const [pt, setPt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
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

		const y = targetRect.top + targetRect.height / 2 - containerRect.top;
		const effectiveGap = Math.max(xGap, MERGE_MIN_GAP);
		const x = side === 'left'
			? Math.max(0, targetRect.left - containerRect.left - effectiveGap)
			: targetRect.right - containerRect.left + effectiveGap;
		setPt({ x, y });
	}, [containerRef, targetRef, xGap, side]);

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

		const x1 = fromRect.right - containerRect.left;
		const y1 = fromRect.top + fromRect.height / 2 - containerRect.top + startOffset;
		const targetX = toRect.left - containerRect.left;
		const targetY = toRect.top + toRect.height / 2 - containerRect.top + endOffset;
		const x2 = targetX;
		const y2 = targetY;

		const straightStartX = x2 - STRAIGHT_SEGMENT - ARROW_LENGTH;
		const straightStartY = y2;

		const dx = Math.max(straightStartX - x1, 60);
		const c = 0.35 * dx;
		const cx1 = x1 + c;
		const cy1 = y1;
		const cx2 = straightStartX - c;
		const cy2 = straightStartY;

		const d = `M ${x1.toFixed(2)} ${y1.toFixed(2)} C ${cx1.toFixed(2)} ${cy1.toFixed(2)}, ${cx2.toFixed(2)} ${cy2.toFixed(2)}, ${straightStartX.toFixed(2)} ${straightStartY.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)}`;

		setPath(d);
	}, [containerRef, fromRef, toRef, offset, fromOffset, toOffset]);

	useEffect(() => {
		updatePath();
	}, [updatePath]);

	useRerouteOnResize([containerRef, fromRef, toRef], updatePath);

	return path;
}

function useVerticalConnector(
	containerRef: React.RefObject<HTMLDivElement | null>,
	fromRef: React.RefObject<HTMLElement | null>,
	toRef: React.RefObject<HTMLElement | null>,
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

		const x1 = fromRect.left + fromRect.width / 2 - containerRect.left;
		const y1 = fromRect.bottom - containerRect.top;
		const targetX = toRect.left + toRect.width / 2 - containerRect.left;
		const targetY = toRect.top - containerRect.top;
		const x2 = targetX;
		const y2 = targetY;

		const straightStartX = x2;
		const straightStartY = y2 - STRAIGHT_SEGMENT - ARROW_LENGTH;

		const dy = straightStartY - y1;
		const c = 0.4 * dy;

		const cx1 = x1;
		const cy1 = y1 + c;
		const cx2 = straightStartX;
		const cy2 = straightStartY - c;

		const d = `M ${x1.toFixed(2)} ${y1.toFixed(2)} C ${cx1.toFixed(2)} ${cy1.toFixed(2)}, ${cx2.toFixed(2)} ${cy2.toFixed(2)}, ${straightStartX.toFixed(2)} ${straightStartY.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)}`;

		setPath(d);
	}, [containerRef, fromRef, toRef]);

	useEffect(() => {
		updatePath();
	}, [updatePath]);

	useRerouteOnResize([containerRef, fromRef, toRef], updatePath);

	return path;
}

function useMergeConnector(
	containerRef: React.RefObject<HTMLDivElement | null>,
	fromRef: React.RefObject<HTMLElement | null>,
	toRef: React.RefObject<HTMLElement | null>,
	mergeX: number,
	mergeY: number,
	fromOffset: number = 0,
	isFromMerge: boolean = false,
	targetSide: 'left' | 'right' = 'left',
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
			const x1 = mergeX;
			const y1 = mergeY;
			const y2 = toRect.top + toRect.height / 2 - containerRect.top;
			const arrowDir = targetSide === 'right' ? -1 : 1;
			const targetEdgeX = targetSide === 'right'
				? toRect.right - containerRect.left
				: toRect.left - containerRect.left;
			const x2 = targetEdgeX;
			const stubLength = STRAIGHT_SEGMENT + ARROW_LENGTH;
			const straightStartX = x2 - arrowDir * stubLength;
			const straightStartY = y2;
			const rawRun = straightStartX - x1;
			const runDir = rawRun === 0 ? arrowDir : Math.sign(rawRun);
			const absRun = Math.max(Math.abs(rawRun), 72);
			const yDelta = y2 - y1;
			let cySpan = yDelta * 0.35;
			if (cySpan > 48) cySpan = 48;
			if (cySpan < -48) cySpan = -48;
			const cx1 = x1 + absRun * 0.6 * runDir;
			const cy1 = y1 + cySpan;
			const cx2 = straightStartX - absRun * 0.3 * runDir;
			const cy2 = straightStartY - cySpan * 0.25;
			const d = `M ${x1.toFixed(2)} ${y1.toFixed(2)} C ${cx1.toFixed(2)} ${cy1.toFixed(2)}, ${cx2.toFixed(2)} ${cy2.toFixed(2)}, ${straightStartX.toFixed(2)} ${straightStartY.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)}`;
			setPath(d);
		} else {
			const x1 = fromRect.right - containerRect.left;
			const y1 = fromRect.top + fromRect.height / 2 - containerRect.top + fromOffset;
			const x2 = mergeX;
			const y2 = mergeY;

			const dx = Math.max(x2 - x1, 80);
			const c = 0.35 * dx;
			const cx1 = x1 + c;
			const cy1 = y1;
			const cx2 = x2 - c;
			const cy2 = y2;

			const d = `M ${x1.toFixed(2)} ${y1.toFixed(2)} C ${cx1.toFixed(2)} ${cy1.toFixed(2)}, ${cx2.toFixed(2)} ${cy2.toFixed(2)}, ${x2.toFixed(2)} ${y2.toFixed(2)}`;
			setPath(d);
		}
		}, [containerRef, fromRef, toRef, mergeX, mergeY, fromOffset, isFromMerge, targetSide]);

	useEffect(() => {
		updatePath();
	}, [updatePath]);

	useRerouteOnResize([containerRef, fromRef, toRef], updatePath);

	return path;
}

interface ConsumerFeederOptions {
	fromOffset?: number;
	mergeYOffset?: number;
}

function useConsumerFeederConnector(
	containerRef: React.RefObject<HTMLDivElement | null>,
	fromRef: React.RefObject<HTMLElement | null>,
	mergeX: number,
	mergeY: number,
	{ fromOffset = 0, mergeYOffset = 0 }: ConsumerFeederOptions = {},
): string {
	const [path, setPath] = useState('');

	const updatePath = useCallback(() => {
		const container = containerRef.current;
		const fromEl = fromRef.current;
		if (!container || !fromEl) {
			return;
		}

		const containerRect = container.getBoundingClientRect();
		const fromRect = fromEl.getBoundingClientRect();

		const x1 = fromRect.right - containerRect.left;
		const y1 = fromRect.top + fromRect.height / 2 - containerRect.top + fromOffset;
		const x2 = mergeX;
		const y2 = mergeY + mergeYOffset;

		const run = Math.max(x2 - x1, 96);
		const c1 = x1 + run * 0.6;
		const c2 = x2 - run * 0.25;

		const d = `M ${x1.toFixed(2)} ${y1.toFixed(2)} C ${c1.toFixed(2)} ${y1.toFixed(2)}, ${c2.toFixed(2)} ${y2.toFixed(2)}, ${x2.toFixed(2)} ${y2.toFixed(2)}`;
		setPath(d);
	}, [containerRef, fromRef, mergeX, mergeY, fromOffset, mergeYOffset]);

	useEffect(() => {
		updatePath();
	}, [updatePath]);

	useRerouteOnResize([containerRef, fromRef], updatePath);

	return path;
}

export default function Figure03_IoT_Arquitetura(): React.ReactElement {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const svgRef = useRef<SVGSVGElement | null>(null);
	const [canvasSize, setCanvasSize] = useState({ width: 1, height: 1 });

	const metRef = useRef<HTMLDivElement | null>(null);
	const soilRef = useRef<HTMLDivElement | null>(null);
	const hidroRef = useRef<HTMLDivElement | null>(null);
	const imagingRef = useRef<HTMLDivElement | null>(null);

	const gatewayRef = useRef<HTMLDivElement | null>(null);
	const brokerRef = useRef<HTMLDivElement | null>(null);
	const sensorThingsRef = useRef<HTMLDivElement | null>(null);
	const timeSeriesRef = useRef<HTMLDivElement | null>(null);

	const digitalTwinRef = useRef<HTMLDivElement | null>(null);
	const automationRef = useRef<HTMLDivElement | null>(null);
	const dashboardsRef = useRef<HTMLDivElement | null>(null);

	const sensorCards: CardDefinition[] = [
		{
			id: 'sensor-met',
			title: 'Estação meteorológica (WMO-No. 8)',
			unit: 'SDI-12',
			description: 'Radiação, vento, UR, temperatura e pressão calibradas para ET₀.',
			Icon: Sun,
			ref: metRef,
		},
		{
			id: 'sensor-solo',
			title: 'Sondas de umidade e temperatura do solo',
			unit: '4–20 mA',
			description: 'Perfis volumétricos e tensiômetros em camadas críticas de manejo.',
			Icon: Droplets,
			ref: soilRef,
		},
		{
			id: 'sensor-hidraulico',
			title: 'Sensores hidráulicos (vazão/pressão)',
			unit: 'Modbus RTU',
			description: 'Detecta perdas, cavitações e status de bombas na linha principal.',
			Icon: Gauge,
			ref: hidroRef,
		},
		{
			id: 'sensor-imagem',
			title: 'Câmera multispectral / NDVI',
			unit: 'RTSP',
			description: 'Vigor e estresse térmico integrados ao monitoramento do pivô.',
			Icon: Camera,
			ref: imagingRef,
		},
	];

	const gatewayCards: CardDefinition[] = [
		{
			id: 'gateway-arm',
			title: 'Gateway ARM + RTOS',
			unit: 'MQTT 5.0',
			description: 'Normaliza payloads SDI-12/Modbus, georreferencia Things e filtra ruídos.',
			Icon: ServerCog,
			ref: gatewayRef,
		},
		{
			id: 'broker-mqtt',
			title: 'Broker MQTT + adapter OGC',
			unit: 'QoS 1/2',
			description: 'Gerencia tópicos, buffers offline e aplica schema SensorThings.',
			Icon: RadioTower,
			ref: brokerRef,
		},
		{
			id: 'ogc-sensor-things',
			title: 'API OGC SensorThings',
			unit: 'REST & JSON',
			description: 'Publica Things, Datastreams e Observations interoperáveis.',
			Icon: Globe,
			ref: sensorThingsRef,
		},
		{
			id: 'timeseries-lake',
			title: 'Time-series lake + retenção',
			unit: 'Influx/Parquet',
			description: 'Armazena observações com políticas de retenção, compressão e QA/QC.',
			Icon: Database,
			ref: timeSeriesRef,
		},
	];

	const consumerCards: DecisionCardDefinition[] = [
		{
			id: 'digital-twin',
			title: 'Digital twin & analytics',
			Icon: Cpu,
			details: [
				{ icon: '•', text: 'Simula balanço hídrico em tempo quase real.' },
				{ icon: '•', text: 'Concilia previsões, séries históricas e sensoriamento orbital.' },
				{ icon: '•', text: 'Emite indicadores STA com ObservedProperty padronizado.' },
			],
			hint: 'Entrada: API SensorThings + lake temporal.',
			ref: digitalTwinRef,
		},
		{
			id: 'automation',
			title: 'Microsserviços de automação',
			Icon: Settings2,
			details: [
				{ icon: '•', text: 'Regras OTA para bombas, válvulas e fertirrigação.' },
				{ icon: '•', text: 'Alertas em tempo real (latência &lt; 5 s).' },
				{ icon: '•', text: 'Integração OPC-UA/Modbus para atuação no campo.' },
			],
			hint: 'Entrada: gêmeo digital + métricas de confiabilidade.',
			ref: automationRef,
		},
		{
			id: 'dashboards',
			title: 'Portal DSS & APIs externas',
			Icon: LayoutDashboard,
			details: [
				{ icon: '•', text: 'Painéis agroclimáticos com indicadores ET₀ e BH.' },
				{ icon: '•', text: 'APIs REST/OGC para ERPs e parceiros.' },
				{ icon: '•', text: 'Logs auditáveis e trilhas LGPD.' },
			],
			hint: 'Saída: decisores, ERPs e parceiros.',
			ref: dashboardsRef,
		},
	];

	const mergeEdge = useMergePoint(containerRef, [metRef, soilRef, hidroRef, imagingRef], gatewayRef, 32);
	const mergeDigitalTwin = useMergePoint(containerRef, [sensorThingsRef, timeSeriesRef], digitalTwinRef, 32);
	const mergeDashboards = useMergePoint(containerRef, [digitalTwinRef, automationRef], dashboardsRef, 96, 'right');
	const mergeDashboardsNode = useMemo(
		() => ({
			x: mergeDashboards.x,
			y: Math.max(mergeDashboards.y - DASHBOARD_MERGE_Y_OFFSET, 0),
		}),
		[mergeDashboards.x, mergeDashboards.y],
	);

	const pathMetToEdgeMerge = useMergeConnector(containerRef, metRef, gatewayRef, mergeEdge.x, mergeEdge.y, -10, false);
	const pathSoilToEdgeMerge = useMergeConnector(containerRef, soilRef, gatewayRef, mergeEdge.x, mergeEdge.y, 0, false);
	const pathHidroToEdgeMerge = useMergeConnector(containerRef, hidroRef, gatewayRef, mergeEdge.x, mergeEdge.y, 6, false);
	const pathImagingToEdgeMerge = useMergeConnector(containerRef, imagingRef, gatewayRef, mergeEdge.x, mergeEdge.y, -6, false);
	const pathMergeToEdge = useMergeConnector(containerRef, gatewayRef, gatewayRef, mergeEdge.x, mergeEdge.y, 0, true);

	const pathEdgeToBroker = useVerticalConnector(containerRef, gatewayRef, brokerRef);
	const pathBrokerToSensorThings = useVerticalConnector(containerRef, brokerRef, sensorThingsRef);
	const pathSensorThingsToTimeseries = useVerticalConnector(containerRef, sensorThingsRef, timeSeriesRef);

	const pathSensorThingsToTwinMerge = useMergeConnector(containerRef, sensorThingsRef, digitalTwinRef, mergeDigitalTwin.x, mergeDigitalTwin.y, 0, false);
	const pathTimeseriesToTwinMerge = useMergeConnector(containerRef, timeSeriesRef, digitalTwinRef, mergeDigitalTwin.x, mergeDigitalTwin.y, 10, false);
	const pathMergeToDigitalTwin = useMergeConnector(containerRef, digitalTwinRef, digitalTwinRef, mergeDigitalTwin.x, mergeDigitalTwin.y, 0, true);

	const pathDigitalTwinToAutomation = useVerticalConnector(containerRef, digitalTwinRef, automationRef);
	const pathTimeseriesToAutomation = useCurvedConnector(containerRef, timeSeriesRef, automationRef, { fromOffset: 0, toOffset: 0 });

		const pathDigitalTwinToDashMerge = useConsumerFeederConnector(containerRef, digitalTwinRef, mergeDashboardsNode.x, mergeDashboardsNode.y, {
			fromOffset: -8,
		});
		const pathAutomationToDashMerge = useConsumerFeederConnector(containerRef, automationRef, mergeDashboardsNode.x, mergeDashboardsNode.y, {
			fromOffset: 8,
		});
		const pathMergeToDashboards = useMergeConnector(containerRef, dashboardsRef, dashboardsRef, mergeDashboardsNode.x, mergeDashboardsNode.y, 0, true, 'right');

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;
		const rect = container.getBoundingClientRect();
		setCanvasSize({ width: rect.width, height: rect.height });
	}, [containerRef]);

	const connectors = useMemo(
		() =>
			[
				{ id: 'met-gateway-merge', d: pathMetToEdgeMerge, color: getStrokeByTarget('field'), target: 'field', width: 1.8, title: 'Estação met → merge(gateway)', arrow: false },
				{ id: 'solo-gateway-merge', d: pathSoilToEdgeMerge, color: getStrokeByTarget('field'), target: 'field', width: 1.8, title: 'Sondas de solo → merge(gateway)', arrow: false },
				{ id: 'hidro-gateway-merge', d: pathHidroToEdgeMerge, color: getStrokeByTarget('field'), target: 'field', width: 1.8, title: 'Sensores hidráulicos → merge(gateway)', arrow: false },
				{ id: 'imagem-gateway-merge', d: pathImagingToEdgeMerge, color: getStrokeByTarget('field'), target: 'field', width: 1.8, title: 'Câmera NDVI → merge(gateway)', arrow: false },
				{ id: 'merge-gateway', d: pathMergeToEdge, color: getStrokeByTarget('field'), target: 'field', width: 1.8, title: 'Merge → Gateway ARM + RTOS', arrow: true },

				{ id: 'gateway-broker', d: pathEdgeToBroker, color: getStrokeByTarget('network'), target: 'network', width: 1.8, title: 'Gateway → Broker MQTT', arrow: true },
				{ id: 'broker-sensorThings', d: pathBrokerToSensorThings, color: getStrokeByTarget('network'), target: 'network', width: 1.8, title: 'Broker → API SensorThings', arrow: true },
				{ id: 'sensorThings-timeseries', d: pathSensorThingsToTimeseries, color: getStrokeByTarget('network'), target: 'network', width: 1.8, title: 'SensorThings → Time-series lake', arrow: true },

				{ id: 'sensorThings-twin-merge', d: pathSensorThingsToTwinMerge, color: getStrokeByTarget('platform'), target: 'platform', width: 1.8, title: 'SensorThings → merge(digital twin)', arrow: false },
				{ id: 'timeseries-twin-merge', d: pathTimeseriesToTwinMerge, color: getStrokeByTarget('platform'), target: 'platform', width: 1.8, title: 'Lake temporal → merge(digital twin)', arrow: false },
				{ id: 'merge-digitalTwin', d: pathMergeToDigitalTwin, color: getStrokeByTarget('platform'), target: 'platform', width: 1.8, title: 'Merge → Digital twin & analytics', arrow: true },
				{ id: 'digitalTwin-automation', d: pathDigitalTwinToAutomation, color: getStrokeByTarget('platform'), target: 'platform', width: 1.8, title: 'Digital twin → Microsserviços de automação', arrow: true },
				{ id: 'timeseries-automation', d: pathTimeseriesToAutomation, color: getStrokeByTarget('platform'), target: 'platform', width: 1.8, title: 'Lake temporal → Microsserviços', arrow: true },

				{ id: 'digitalTwin-dash-merge', d: pathDigitalTwinToDashMerge, color: getStrokeByTarget('consumer'), target: 'consumer', width: 1.8, title: 'Digital twin → merge(portal)', arrow: false },
				{ id: 'automation-dash-merge', d: pathAutomationToDashMerge, color: getStrokeByTarget('consumer'), target: 'consumer', width: 1.8, title: 'Automação → merge(portal)', arrow: false },
				{ id: 'merge-dashboards', d: pathMergeToDashboards, color: getStrokeByTarget('consumer'), target: 'consumer', width: 1.8, title: 'Merge → Portal DSS & APIs', arrow: true },
			].filter((connector) => connector.d),
		[
			pathMetToEdgeMerge,
			pathSoilToEdgeMerge,
			pathHidroToEdgeMerge,
			pathImagingToEdgeMerge,
			pathMergeToEdge,
			pathEdgeToBroker,
			pathBrokerToSensorThings,
			pathSensorThingsToTimeseries,
			pathSensorThingsToTwinMerge,
			pathTimeseriesToTwinMerge,
			pathMergeToDigitalTwin,
			pathDigitalTwinToAutomation,
			pathTimeseriesToAutomation,
			pathDigitalTwinToDashMerge,
			pathAutomationToDashMerge,
			pathMergeToDashboards,
		],
	);

	const svgWidth = canvasSize.width || 1;
	const svgHeight = canvasSize.height || 1;

	const mergeNodes = useMemo(
		() => [
			{ id: 'edge', x: mergeEdge.x, y: mergeEdge.y, color: getStrokeByTarget('field'), sources: 4 },
			{ id: 'digitalTwin', x: mergeDigitalTwin.x, y: mergeDigitalTwin.y, color: getStrokeByTarget('platform'), sources: 2 },
			{ id: 'dashboards', x: mergeDashboardsNode.x, y: mergeDashboardsNode.y, color: getStrokeByTarget('consumer'), sources: 2 },
		],
		[mergeEdge.x, mergeEdge.y, mergeDigitalTwin.x, mergeDigitalTwin.y, mergeDashboardsNode.x, mergeDashboardsNode.y],
	);

	return (
		<section aria-label="Figura 3 – Estação IoT → Plataforma" className="w-full bg-linear-to-br from-[#fafbfc] to-[#f5f7fa] py-12">
			<div className="mx-auto flex w-full flex-col gap-8 px-4 sm:px-6 lg:px-8 overflow-x-auto">
				<div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between border-b-2 border-[#d1d9e0] pb-6">
					<header className="max-w-3xl space-y-3">
						<h1 className="text-3xl font-bold text-[#1a2332] tracking-tight">Figura 3 – Estação IoT → Plataforma</h1>
						<p className="text-base text-[#37474f] leading-relaxed">
							Arquitetura de telemetria híbrida com interoperabilidade OGC SensorThings, conectividade resiliente e fluxo fim a fim
							até serviços digitais de suporte à decisão.
						</p>
					</header>
					<div className="flex shrink-0 items-center gap-3">
						<button type="button" className={toolbarButtonClass} onClick={() => exportAsSVG(svgRef, 'Figura03.svg')}>
							Exportar SVG
						</button>
						<button
							type="button"
							className={toolbarButtonClass}
							onClick={() => void exportDiagramPDF(svgRef, containerRef, 'Figura03.pdf', { padding: 4 })}
						>
							Exportar PDF
						</button>
					</div>
				</div>

				<div className="relative" aria-describedby="fig3-caption">
								<div
									ref={containerRef}
									className="grid grid-cols-1 gap-y-12 gap-x-6 lg:grid-cols-[440px_470px_440px] lg:gap-x-36 lg:gap-y-12"
									style={{ paddingRight: RIGHT_GUTTER }}
								>
						<svg
							ref={svgRef}
							width={svgWidth}
							height={svgHeight}
							viewBox={`0 0 ${svgWidth} ${svgHeight}`}
							preserveAspectRatio="xMinYMin meet"
							className="pointer-events-none absolute inset-0 z-20 overflow-visible"
							shapeRendering="geometricPrecision"
							role="presentation"
							aria-hidden="true"
						>
							<defs>
								<marker id="arrowHead-field" markerWidth="16" markerHeight="9" refX="16" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
									<polygon points="0 0, 16 4.5, 0 9" fill={STROKE_BY_TARGET.field} />
								</marker>
								<marker id="arrowHead-network" markerWidth="16" markerHeight="9" refX="16" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
									<polygon points="0 0, 16 4.5, 0 9" fill={STROKE_BY_TARGET.network} />
								</marker>
								<marker id="arrowHead-platform" markerWidth="16" markerHeight="9" refX="16" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
									<polygon points="0 0, 16 4.5, 0 9" fill={STROKE_BY_TARGET.platform} />
								</marker>
								<marker id="arrowHead-consumer" markerWidth="16" markerHeight="9" refX="16" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
									<polygon points="0 0, 16 4.5, 0 9" fill={STROKE_BY_TARGET.consumer} />
								</marker>
								<filter id="mergeGlowFig3" x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
									<feDropShadow dx="0" dy="0" stdDeviation="1" floodColor="#000000" floodOpacity="0.18" />
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
									vectorEffect="non-scaling-stroke"
									markerEnd={connector.arrow ? `url(#arrowHead-${connector.target})` : undefined}
								>
									<title>{connector.title}</title>
								</path>
							))}

							{mergeNodes
								.filter((node) => node.sources > 1)
								.map((node) => (
									<circle
										key={`merge-node-${node.id}`}
										cx={node.x}
										cy={node.y}
										r={MERGE_NODE_R}
										fill="#ffffff"
										stroke={node.color}
										strokeWidth={1.5}
										vectorEffect="non-scaling-stroke"
										filter="url(#mergeGlowFig3)"
									/>
								))}
						</svg>

						<section className={laneClass} aria-labelledby="lane-sensores" data-export="lane">
							<div className={laneHeadClass} id="lane-sensores" data-export="lane-header">
								CAMADA FÍSICA (ESTAÇÃO IoT)
							</div>
							<div className={laneBodyClass}>
								{sensorCards.map(({ id, title, unit, description, Icon, ref }) => (
									<article
										key={id}
										ref={ref}
										className={variableCardClass}
										data-export-card="variable"
										data-export-card-id={id}
									>
										<div className="flex items-center gap-4">
											<div className={`${iconWrapperClass} shrink-0`} aria-hidden="true" data-export="icon-wrapper">
												<Icon className="h-4 w-4" data-export="icon" />
											</div>
											<div className="flex w-full flex-col gap-y-1.5">
												<div className="relative flex items-start">
													<h2 className={`${cardTitleClass} flex-1 min-w-0 pr-16`} data-export="card-title">
														{title}
													</h2>
													{unit ? (
														<span className={`${pillTextClass} shrink-0 absolute top-0 right-0`} data-export="unit-pill">
															{unit}
														</span>
													) : null}
												</div>
												<p className={cardBodyTextClass} data-export="card-description">
													{description}
												</p>
											</div>
										</div>
									</article>
								))}
							</div>
						</section>

						<section className={laneClass} aria-labelledby="lane-gateway" data-export="lane">
							<div className={laneHeadClass} id="lane-gateway" data-export="lane-header">
								GATEWAY &amp; PLATAFORMA IoT
							</div>
							<div className={laneBodyClass} style={{ gap: '48px' }}>
								{gatewayCards.map(({ id, title, unit, description, Icon, ref }) => (
									<article
										key={id}
										ref={ref}
										className={platformCardClass}
										data-export-card="indicator"
										data-export-card-id={id}
									>
										<div className="flex items-center gap-4">
											<div className={`${iconWrapperClass} shrink-0`} aria-hidden="true" data-export="icon-wrapper">
												<Icon className="h-4 w-4" data-export="icon" />
											</div>
											<div className="flex w-full flex-col gap-y-1.5">
												<div className="relative flex items-start">
													<h2 className={`${cardTitleClass} flex-1 min-w-0 pr-16`} data-export="card-title">
														{title}
													</h2>
													{unit ? (
														<span className={`${pillTextClass} shrink-0 absolute top-0 right-0`} data-export="unit-pill">
															{unit}
														</span>
													) : null}
												</div>
												<p className={cardBodyTextClass} data-export="card-description">
													{description}
												</p>
											</div>
										</div>
									</article>
								))}
							</div>
						</section>

						<section className={laneClass} aria-labelledby="lane-servicos" data-export="lane">
							<div className={laneHeadClass} id="lane-servicos" data-export="lane-header">
								SERVIÇOS E CONSUMIDORES
							</div>
							<div className={laneBodyClass}>
								{consumerCards.map(({ id, title, Icon, details, hint, ref }) => (
									<article
										key={id}
										ref={ref}
										className={cardContainerClass}
										data-export-card="decision"
										data-export-card-id={id}
									>
										<div className="flex w-full flex-col">
											<div className="flex items-center gap-4 mb-3">
												<div className={iconWrapperClass} aria-hidden="true" data-export="icon-wrapper">
													<Icon className="h-4 w-4" data-export="icon" />
												</div>
												<h2 className={`${cardTitleClass} uppercase tracking-wide`} data-export="card-title">
													{title}
												</h2>
											</div>
											<div className="border-t border-[#d1d9e0] pt-2.5 pb-1.5" data-export="card-divider">
												<ul className="space-y-1 text-xs leading-snug text-[#37474f]">
													{details.map(({ icon, text }) => (
														<li key={text} className="flex items-start gap-2">
															{icon && (
																<span
																	className="inline-flex w-6 justify-center text-base shrink-0 mt-0.5 text-[#1565c0] font-bold"
																	aria-hidden="true"
																	data-export="detail-icon"
																>
																	{icon}
																</span>
															)}
															<span className="flex-1" data-export="detail-text">
																{text}
															</span>
														</li>
													))}
												</ul>
											</div>
											<p className={hintClass} data-export="card-hint">
												{hint}
											</p>
										</div>
									</article>
								))}
							</div>
						</section>

						<footer
							className="col-span-full border-t-2 border-[#d1d9e0] pt-5 space-y-3 bg-white/50 rounded-lg pl-6 py-4"
							style={{ marginRight: -120, paddingRight: 0 }}
							data-export="legend"
						>
							<div className="mb-2">
								<h3 className="text-sm font-bold text-[#1a2332] mb-2" data-export="legend-text">
									Cores dos conectores (por estágio)
								</h3>
								<ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-2 text-xs text-[#37474f]">
									<li className="flex items-center gap-3">
										<span
											className="inline-flex h-1.5 w-12 rounded-[5px]"
											style={{ backgroundColor: getStrokeByTarget('field') }}
											data-export="legend-swatch"
										/>
										<span className="inline-flex items-center gap-1.5">
											<strong className="text-[#1a2332]" data-export="legend-text">
												Camada física
											</strong>
											<span data-export="legend-text">Sensores → Gateway</span>
										</span>
									</li>
									<li className="flex items-center gap-3">
										<span
											className="inline-flex h-1.5 w-12 rounded-[5px]"
											style={{ backgroundColor: getStrokeByTarget('network') }}
											data-export="legend-swatch"
										/>
										<span className="inline-flex items-center gap-1.5">
											<strong className="text-[#1a2332]" data-export="legend-text">
												Transporte &amp; API
											</strong>
											<span data-export="legend-text">Gateway → SensorThings</span>
										</span>
									</li>
									<li className="flex items-center gap-3">
										<span
											className="inline-flex h-1.5 w-12 rounded-[5px]"
											style={{ backgroundColor: getStrokeByTarget('platform') }}
											data-export="legend-swatch"
										/>
										<span className="inline-flex items-center gap-1.5">
											<strong className="text-[#1a2332]" data-export="legend-text">
												Plataforma analítica
											</strong>
											<span data-export="legend-text">SensorThings/TS → Serviços</span>
										</span>
									</li>
									<li className="flex items-center gap-3">
										<span
											className="inline-flex h-1.5 w-12 rounded-[5px]"
											style={{ backgroundColor: getStrokeByTarget('consumer') }}
											data-export="legend-swatch"
										/>
										<span className="inline-flex items-center gap-1.5">
											<strong className="text-[#1a2332]" data-export="legend-text">
												Aplicações finais
											</strong>
											<span data-export="legend-text">Automação → Portal DSS</span>
										</span>
									</li>
								</ul>
							</div>
							<p id="fig3-caption" className="text-sm text-[#1a2332] leading-6" data-export="legend-paragraph">
								<strong className="text-[#1565c0]" data-export="legend-text">Legenda:</strong>{' '}
								<span data-export="legend-text">
									sensores convergem num gateway com normalização MQTT, seguem para a API OGC SensorThings e alimentam um lake temporal. Os serviços analíticos e de automação conectam-se ao portal DSS e expõem dados interoperáveis para ecossistemas.
								</span>
							</p>
						</footer>
					</div>
				</div>
			</div>
		</section>
	);
}