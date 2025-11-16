"use client";

import React, { useRef, useState, useEffect } from "react";
import { Sun, CloudRain, Thermometer, Wind, Droplets, Zap, TrendingUp, TrendingDown, Database } from "lucide-react";
// Reuse the same export helpers and hooks from Figura 2
import { exportAsSVG, exportDiagramPDF } from "../figura-02/Figure02_Encadeamento";
import { useCurvedConnector, useVerticalConnector, useMergePoint, useMergeConnector, ARROW_LENGTH, MERGE_NODE_R } from "../_components/diagramHooks";

// Copy the exact same class tokens used in Figura 2 (no new styles created)
const toolbarButtonClass =
	'inline-flex items-center gap-2 rounded-lg border-2 border-[#1565c0] bg-white px-5 py-2.5 text-sm font-semibold text-[#1565c0] shadow-sm hover:bg-[#f5f5f5] transition-colors';
const laneClass =
	'relative z-0 overflow-visible rounded-xl border-2 border-[#d1d9e0] bg-white w-full shadow-sm';
const laneHeadClass =
	'flex items-center justify-center rounded-t-xl bg-[#1565c0] px-4 py-4 text-base font-bold text-white tracking-wide uppercase shadow-sm antialiased';
const laneBodyClass = 'relative flex flex-col gap-6 px-5 py-6 bg-gradient-to-b from-white to-[#fafbfc]';
const cardContainerClass =
	'relative mx-auto w-full rounded-lg border border-[#e0e7ef] bg-white px-6 py-4 max-w-[420px] shadow-sm hover:shadow-md transition-shadow';
const variableCardClass =
	'relative mx-auto w-full rounded-lg border border-[#e0e7ef] bg-white px-6 py-4 max-w-[480px] shadow-sm hover:shadow-md transition-shadow';
const cardTitleClass = 'text-[15px] font-bold text-[#1a2332] leading-snug antialiased';
const cardBodyTextClass = 'text-[13px] leading-relaxed text-[#2d3748] antialiased';
const pillTextClass =
	'whitespace-nowrap rounded-md bg-linear-to-r from-[#e3f2fd] to-[#bbdefb] px-3 py-1 text-[13px] font-bold text-[#0d47a1] border border-[#90caf9] antialiased';
const iconWrapperClass =
	'flex h-7 w-7 items-center justify-center rounded-lg bg-[#e3f2fd] text-[#1565C0] border border-[#90caf9] shadow-sm';

// Bring the same color scheme used in Figura 2
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

// Connector stroke colors by target (same palette as Figure 2)
const STROKE_BY_TARGET = {
	rn: '#5B8DBB',    // Rn (radiação líquida)
	h: '#7C9674',     // H (calor sensível)
	le: '#9B8BBE',    // LE (calor latente)
	g: '#E8A87C',     // G (fluxo solo)
} as const;

const arrowGlyphStyle = { fontFamily: "'Segoe UI Symbol','Arial Unicode MS',sans-serif" } as const;

function ArrowGlyph({ symbol }: { symbol: '↑' | '↓' }) {
	return (
		<span className="mx-0.5 inline-block align-middle text-[15px] leading-none" style={arrowGlyphStyle}>
			{symbol}
		</span>
	);
}

interface CardDefinition {
	id: string;
	title: React.ReactNode;
	unit?: string;
	description: string;
	Icon: React.ComponentType<{ className?: string }>;
	ref: React.RefObject<HTMLDivElement | null>;
}


export default function Figure04_BalancoEnergia() {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const svgRef = useRef<SVGSVGElement | null>(null);
	const [canvasSize, setCanvasSize] = useState({ width: 1, height: 1 });

	// Refs for input variables (solar radiation, temperature, albedo)
	const rsRef = useRef<HTMLDivElement | null>(null);
	const tempRef = useRef<HTMLDivElement | null>(null);
	const albedoRef = useRef<HTMLDivElement | null>(null);

	// Refs for radiative components
	const rsDownRef = useRef<HTMLDivElement | null>(null);
	const rsUpRef = useRef<HTMLDivElement | null>(null);
	const rlDownRef = useRef<HTMLDivElement | null>(null);
	const rlUpRef = useRef<HTMLDivElement | null>(null);

	// Ref for Rn (net radiation)
	const rnRef = useRef<HTMLDivElement | null>(null);

	// Refs for partition components
	const hRef = useRef<HTMLDivElement | null>(null);
	const leRef = useRef<HTMLDivElement | null>(null);
	const gRef = useRef<HTMLDivElement | null>(null);

	// Input variables
	const inputCards: CardDefinition[] = [
		{
			id: 'rs',
			title: 'Radiação solar global - Rs',
			unit: 'W m⁻²',
			description: 'Entrada de energia (onda curta).',
			Icon: Sun,
			ref: rsRef,
		},
		{
			id: 'temp',
			title: 'Temperatura da superfície - Ts',
			unit: '°C',
			description: 'Controla emissão de onda longa.',
			Icon: Thermometer,
			ref: tempRef,
		},
		{
			id: 'albedo',
			title: 'Albedo da superfície - α',
			unit: 'adimensional',
			description: 'Fração de Rs refletida.',
			Icon: TrendingUp,
			ref: albedoRef,
		},
	];

	// Radiative components
	const radiativeCards: CardDefinition[] = [
		{
			id: 'rs_down',
			title: (
				<>
					Rₛ<ArrowGlyph symbol="↓" /> — Radiação de onda curta incidente
				</>
			),
			unit: 'W m⁻²',
			description: 'Radiação solar direta + difusa.',
			Icon: TrendingDown,
			ref: rsDownRef,
		},
		{
			id: 'rs_up',
			title: (
				<>
					Rₛ<ArrowGlyph symbol="↑" /> — Radiação de onda curta refletida
				</>
			),
			unit: 'W m⁻²',
			description: 'Rₛ↑ = α · Rₛ↓',
			Icon: TrendingUp,
			ref: rsUpRef,
		},
		{
			id: 'rl_down',
			title: (
				<>
					Rᴸ<ArrowGlyph symbol="↓" /> — Radiação de onda longa atmosférica
				</>
			),
			unit: 'W m⁻²',
			description: 'Emitida pela atmosfera.',
			Icon: CloudRain,
			ref: rlDownRef,
		},
		{
			id: 'rl_up',
			title: (
				<>
					Rᴸ<ArrowGlyph symbol="↑" /> — Radiação de onda longa da superfície
				</>
			),
			unit: 'W m⁻²',
			description: 'Emitida pela superfície (σTₛ⁴).',
			Icon: Zap,
			ref: rlUpRef,
		},
	];

	// Net radiation
	const rnCard: CardDefinition = {
		id: 'rn',
		title: 'Rₙ — Radiação líquida',
		unit: 'W m⁻²',
		description: 'Rₙ = (Rₛ↓ − Rₛ↑) + (Rᴸ↓ − Rᴸ↑)',
		Icon: Sun,
		ref: rnRef,
	};

	// Energy partition
	const partitionCards: CardDefinition[] = [
		{
			id: 'h',
			title: 'H — Calor sensível',
			unit: 'W m⁻²',
			description: 'Fluxo de calor para atmosfera.',
			Icon: Wind,
			ref: hRef,
		},
		{
			id: 'le',
			title: 'LE — Calor latente',
			unit: 'W m⁻²',
			description: 'Energia da evapotranspiração.',
			Icon: Droplets,
			ref: leRef,
		},
		{
			id: 'g',
			title: 'G — Fluxo de calor no solo',
			unit: 'W m⁻²',
			description: 'Energia armazenada no solo.',
			Icon: Database,
			ref: gRef,
		},
	];

	const legendRows = [
		[
			{
				id: 'rn',
				label: 'Rₙ',
				description: 'Radiação líquida (W m⁻²) — balanço entre radiação de onda curta e longa.',
				color: STROKE_BY_TARGET.rn,
			},
			{
				id: 'h',
				label: 'H',
				description: 'Fluxo de calor sensível (W m⁻²) — aquecimento do ar.',
				color: STROKE_BY_TARGET.h,
			},
		],
		[
			{
				id: 'le',
				label: 'LE',
				description: 'Fluxo de calor latente (W m⁻²) — energia usada na evapotranspiração.',
				color: STROKE_BY_TARGET.le,
			},
			{
				id: 'g',
				label: 'G',
				description: 'Fluxo de calor no solo (W m⁻²) — armazenamento térmico no solo.',
				color: STROKE_BY_TARGET.g,
			},
		],
	];

	// Connectors: inputs → radiative components (all use fromOffset: 0, toOffset: 0 for centered connections)
	const pathRsToRsDown = useCurvedConnector(containerRef, rsRef, rsDownRef, { fromOffset: 0, toOffset: 0 });
	const pathRsToRsUp = useCurvedConnector(containerRef, rsRef, rsUpRef, { fromOffset: 0, toOffset: 0 });
	const pathAlbedoToRsUp = useCurvedConnector(containerRef, albedoRef, rsUpRef, { fromOffset: 0, toOffset: 0 });
	const pathTempToRlUp = useCurvedConnector(containerRef, tempRef, rlUpRef, { fromOffset: 0, toOffset: 0 });

	// Merge point for radiative components → Rn (4 sources converging to the RIGHT side of Rn)
	const rnMerge = useMergePoint(containerRef, [rsDownRef, rsUpRef, rlDownRef, rlUpRef], rnRef, 40, 'right', -30);

	// Connectors: radiative components → merge point → Rn (sources start from RIGHT edge, curving to merge at RIGHT of Rn)
	const pathRsDownToMerge = useMergeConnector(containerRef, rsDownRef, rnRef, rnMerge.x, rnMerge.y, -20, false, 'right', 'right');
	const pathRsUpToMerge = useMergeConnector(containerRef, rsUpRef, rnRef, rnMerge.x, rnMerge.y, -10, false, 'right', 'right');
	const pathRlDownToMerge = useMergeConnector(containerRef, rlDownRef, rnRef, rnMerge.x, rnMerge.y, 10, false, 'right', 'right');
	const pathRlUpToMerge = useMergeConnector(containerRef, rlUpRef, rnRef, rnMerge.x, rnMerge.y, 20, false, 'right', 'right');
	const pathMergeToRn = useMergeConnector(containerRef, rnRef, rnRef, rnMerge.x, rnMerge.y, 0, true, 'right', 'right', -30);

	// Connectors: Rn → partition (horizontal connectors from Rn to H/LE/G - start from bottom portion of Rn)
	const pathRnToH = useCurvedConnector(containerRef, rnRef, hRef, {
		fromOffset: 0,
		toOffset: 0,
		fromAnchorY: 'bottom',
		fromInset: 26,
		straightExit: 28,
	});
	const pathRnToLE = useCurvedConnector(containerRef, rnRef, leRef, {
		fromOffset: 0,
		toOffset: 0,
		fromAnchorY: 'bottom',
		fromInset: 18,
		straightExit: 28,
	});
	const pathRnToG = useCurvedConnector(containerRef, rnRef, gRef, {
		fromOffset: 0,
		toOffset: 0,
		fromAnchorY: 'bottom',
		fromInset: 10,
		straightExit: 28,
	});

	useEffect(() => {
		const updateSize = () => {
			if (containerRef.current) {
				const rect = containerRef.current.getBoundingClientRect();
				setCanvasSize({ width: Math.max(1, rect.width), height: Math.max(1, rect.height) });
			}
		};
		updateSize();
		const observer = new ResizeObserver(updateSize);
		if (containerRef.current) observer.observe(containerRef.current);
		return () => observer.disconnect();
	}, [containerRef]);

	return (
		<section aria-label="Figura 4 – Diagrama conceitual do balanço de energia na superfície" className="w-full bg-linear-to-br from-[#fafbfc] to-[#f5f7fa] py-12">
			<div className="mx-auto flex w-full flex-col gap-8 px-4 sm:px-6 lg:px-8">
				{/* Header (same structure as Figura 2) */}
				<div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between border-b-2 border-[#d1d9e0] pb-6">
					<header className="max-w-3xl space-y-3">
						<h1 className="text-3xl font-bold text-[#1a2332] tracking-tight">Figura 4 – Diagrama conceitual do balanço de energia na superfície</h1>
						<p className="text-base text-[#37474f] leading-relaxed">
							O saldo radiativo Rₙ resulta de ondas curta (Rₛ↓, Rₛ↑) e longa (Rᴸ↓, Rᴸ↑), sendo particionado em calor
							sensível (H), latente (LE) e fluxo de calor no solo (G).
						</p>
					</header>
					<div className="flex shrink-0 items-center gap-3">
						<button type="button" className={toolbarButtonClass} onClick={() => exportAsSVG(svgRef, 'Figura04.svg')}>
							Exportar SVG
						</button>
						<button
							type="button"
							className={toolbarButtonClass}
							onClick={() => void exportDiagramPDF(svgRef, containerRef, 'Figura04.pdf')}
						>
							Exportar PDF
						</button>
					</div>
				</div>

				{/* Figure container (same wrapper hierarchy) */}
				<div className="relative" aria-describedby="fig4-caption">
					<div ref={containerRef} className="relative grid grid-cols-1 gap-y-12 gap-x-6 lg:grid-cols-3 lg:gap-x-12 lg:gap-y-16">
						{/* SVG overlay for connectors */}
						<svg
							ref={svgRef}
							className="pointer-events-none absolute left-0 top-0 z-10 h-full w-full overflow-visible"
							style={{ width: canvasSize.width, height: canvasSize.height }}
						>
							<defs>
								{/* Per-target markers (16×9 px) — refX=16 refY=4.5 so the arrow TIP is at the path endpoint (card edge) */}
								<marker id="arrowRn" markerWidth="16" markerHeight="9" refX="16" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
									<path d="M0,0 L0,9 L16,4.5 z" fill={STROKE_BY_TARGET.rn} />
								</marker>
								<marker id="arrowH" markerWidth="16" markerHeight="9" refX="16" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
									<path d="M0,0 L0,9 L16,4.5 z" fill={STROKE_BY_TARGET.h} />
								</marker>
								<marker id="arrowLE" markerWidth="16" markerHeight="9" refX="16" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
									<path d="M0,0 L0,9 L16,4.5 z" fill={STROKE_BY_TARGET.le} />
								</marker>
								<marker id="arrowG" markerWidth="16" markerHeight="9" refX="16" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
									<path d="M0,0 L0,9 L16,4.5 z" fill={STROKE_BY_TARGET.g} />
								</marker>
							</defs>

							{/* Inputs → Radiative */}
							<path d={pathRsToRsDown} fill="none" stroke={STROKE_BY_TARGET.rn} strokeWidth={2} markerEnd="url(#arrowRn)" />
							<path d={pathRsToRsUp} fill="none" stroke={STROKE_BY_TARGET.rn} strokeWidth={2} markerEnd="url(#arrowRn)" />
							<path d={pathAlbedoToRsUp} fill="none" stroke={STROKE_BY_TARGET.rn} strokeWidth={1.5} strokeDasharray="4 2" markerEnd="url(#arrowRn)" />
							<path d={pathTempToRlUp} fill="none" stroke={STROKE_BY_TARGET.rn} strokeWidth={2} markerEnd="url(#arrowRn)" />

							{/* Radiative → Merge Point → Rn */}
							<path d={pathRsDownToMerge} fill="none" stroke={STROKE_BY_TARGET.rn} strokeWidth={2} />
							<path d={pathRsUpToMerge} fill="none" stroke={STROKE_BY_TARGET.rn} strokeWidth={2} />
							<path d={pathRlDownToMerge} fill="none" stroke={STROKE_BY_TARGET.rn} strokeWidth={2} />
							<path d={pathRlUpToMerge} fill="none" stroke={STROKE_BY_TARGET.rn} strokeWidth={2} />
							<circle cx={rnMerge.x} cy={rnMerge.y} r={MERGE_NODE_R} fill={STROKE_BY_TARGET.rn} />
							<path d={pathMergeToRn} fill="none" stroke={STROKE_BY_TARGET.rn} strokeWidth={2.5} markerEnd="url(#arrowRn)" />

							{/* Rn → Partition */}
							<path d={pathRnToH} fill="none" stroke={STROKE_BY_TARGET.h} strokeWidth={2.5} markerEnd="url(#arrowH)" />
							<path d={pathRnToLE} fill="none" stroke={STROKE_BY_TARGET.le} strokeWidth={3} markerEnd="url(#arrowLE)" />
							<path d={pathRnToG} fill="none" stroke={STROKE_BY_TARGET.g} strokeWidth={2} markerEnd="url(#arrowG)" />
						</svg>

						{/* Lane 1: Input Variables */}
						<section className={laneClass} data-export="lane" aria-labelledby="lane-inputs">
							<div id="lane-inputs" className={laneHeadClass} data-export="lane-header">
								Variáveis de entrada
							</div>
							<div className={laneBodyClass}>
								{inputCards.map((card) => (
									<article key={card.id} ref={card.ref} className={variableCardClass} data-export-card="variable" data-export-card-id={card.id}>
										<div className="flex items-start gap-3">
											<div className={iconWrapperClass} aria-hidden="true" data-export="icon-wrapper">
												<card.Icon className="h-4 w-4" data-export="icon" />
											</div>
											<div className="flex-1 space-y-2">
												<div className="flex flex-wrap items-center gap-3">
													<h3 className={`${cardTitleClass} flex-1`} data-export="card-title">{card.title}</h3>
													{card.unit && <span className={`${pillTextClass} shrink-0`} data-export="unit-pill">{card.unit}</span>}
												</div>
												<p className={`${cardBodyTextClass} mt-2`} data-export="card-description">{card.description}</p>
											</div>
										</div>
									</article>
								))}
							</div>
						</section>

						{/* Lane 2: Radiative Components → Rn */}
						<section className={laneClass} data-export="lane" aria-labelledby="lane-radiative">
							<div id="lane-radiative" className={laneHeadClass} data-export="lane-header">
								Componentes radiativas
							</div>
							<div className={laneBodyClass}>
								{radiativeCards.map((card) => (
									<article key={card.id} ref={card.ref} className={cardContainerClass} data-export-card="radiative" data-export-card-id={card.id}>
										<div className="flex items-start gap-3">
											<div className={iconWrapperClass} aria-hidden="true" data-export="icon-wrapper">
												<card.Icon className="h-4 w-4" data-export="icon" />
											</div>
											<div className="flex-1 space-y-2">
												<div className="flex flex-wrap items-center gap-3">
													<h3 className={`${cardTitleClass} flex-1`} data-export="card-title">{card.title}</h3>
													{card.unit && <span className={`${pillTextClass} shrink-0`} data-export="unit-pill">{card.unit}</span>}
												</div>
												<p className={`${cardBodyTextClass} mt-2`} data-export="card-description">{card.description}</p>
											</div>
										</div>
									</article>
								))}
								{/* Rn card */}
								<article ref={rnRef} className={cardContainerClass} data-export-card="rn" data-export-card-id="rn" style={{ marginTop: '2rem', borderColor: COLORS.accent, borderWidth: 2 }}>
									<div className="flex items-start gap-3">
										<div className={iconWrapperClass} aria-hidden="true" data-export="icon-wrapper">
											<rnCard.Icon className="h-4 w-4" data-export="icon" />
										</div>
										<div className="flex-1 space-y-2">
											<div className="flex flex-wrap items-center gap-3">
												<h3 className={`${cardTitleClass} flex-1`} data-export="card-title">{rnCard.title}</h3>
												{rnCard.unit && <span className={`${pillTextClass} shrink-0`} data-export="unit-pill">{rnCard.unit}</span>}
											</div>
											<p className={`${cardBodyTextClass} mt-2`} data-export="card-description">{rnCard.description}</p>
										</div>
									</div>
								</article>
							</div>
						</section>

						{/* Lane 3: Energy Partition */}
						<section className={laneClass} data-export="lane" aria-labelledby="lane-partition">
							<div id="lane-partition" className={laneHeadClass} data-export="lane-header">
								Partição de energia
							</div>
							<div className={laneBodyClass}>
								{partitionCards.map((card) => (
									<article key={card.id} ref={card.ref} className={cardContainerClass} data-export-card="partition" data-export-card-id={card.id}>
										<div className="flex items-start gap-3">
											<div className={iconWrapperClass} aria-hidden="true" data-export="icon-wrapper">
												<card.Icon className="h-4 w-4" data-export="icon" />
											</div>
											<div className="flex-1 space-y-2">
												<div className="flex flex-wrap items-center gap-3">
													<h3 className={`${cardTitleClass} flex-1`} data-export="card-title">{card.title}</h3>
													{card.unit && <span className={`${pillTextClass} shrink-0`} data-export="unit-pill">{card.unit}</span>}
												</div>
												<p className={`${cardBodyTextClass} mt-2`} data-export="card-description">{card.description}</p>
											</div>
										</div>
									</article>
								))}
							</div>
						</section>

						{/* Caption block (same pattern as Figura 2) */}
						<footer id="fig4-caption" className="col-span-full mt-8 rounded-xl border border-[#d1d9e0] bg-white/90 px-5 py-5" data-export="legend">
							<h4 className="text-sm font-bold text-[#1a2332] mb-3" data-export="legend-text">Legenda</h4>
							<div className="space-y-4 text-sm text-[#1a2332]">
								{legendRows.map((row, rowIndex) => (
									<div key={`legend-row-${rowIndex}`} className="flex flex-col gap-3 sm:flex-row">
										{row.map((item) => (
											<div
												key={item.id}
												className="flex flex-1 items-start gap-3 rounded-lg border border-[#dbe3eb] bg-white/80 px-3 py-2 shadow-sm"
												data-export="legend-pill"
											>
												<span
													className="mt-1 h-3 w-3 rounded-full"
													style={{ backgroundColor: item.color }}
													data-export="legend-swatch"
												/>
												<div className="flex-1 space-y-0.5">
													<strong className="text-[#1a2332]" data-export="legend-text">{item.label}</strong>
													<p className="text-[#37474f]" data-export="legend-text">{item.description}</p>
												</div>
											</div>
										))}
									</div>
								))}
								<p className="text-[#37474f] italic" data-export="legend-paragraph">
									Convenção: fluxos ascendentes (H, LE) são considerados positivos; fluxo descendente (G) é positivo quando entra no solo.
								</p>
							</div>
						</footer>
					</div>
				</div>
			</div>
		</section>
	);
}

