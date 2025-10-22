'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  CloudRain,
  Database,
  Droplets,
  LayoutDashboard,
  Network,
  Settings2,
  Sun,
  Thermometer,
  Wind,
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

const laneClass =
  'relative overflow-visible rounded-[18px] border border-[#dde8f3] bg-white shadow-[0_8px_24px_rgba(16,38,68,0.08)]';
const laneHeadClass =
  'rounded-t-[18px] bg-[#cfe6ff] px-5 py-3 text-[15px] font-semibold text-[#0f2747] tracking-[0.2px]';
const laneBodyClass = 'relative flex flex-col gap-4 p-5';
const cardClass =
  'rounded-[14px] border border-[#dde8f3] bg-white px-4 py-4 text-[#0e223d] shadow-[0_2px_8px_rgba(10,62,120,0.06)]';
const accentCardClass =
  'rounded-[14px] border border-[#d6ebff] bg-[#e9f5ff] px-4 py-4 text-[#0e223d] shadow-[0_2px_8px_rgba(10,62,120,0.06)]';
const cardTitleClass = 'text-[15px] font-semibold text-[#0e223d]';
const cardBodyTextClass = 'mt-1 text-[14px]/[20px] text-[#0f2747]/85';
const hintClass = 'mt-2 text-[12px] text-[#39577a]/80';
const iconWrapperClass =
  'grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-[#e9f5ff] to-white text-[#2a7de1] shadow-inner';
const pillClass =
  'inline-flex min-w-[150px] items-center justify-center gap-2 rounded-full border border-[#d6e3f2] bg-white px-4 py-2 text-sm font-semibold text-[#0f2747] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#eff6ff]';
const toolbarButtonClass =
  'inline-flex items-center gap-2 rounded-xl border border-[#d6e3f2] bg-white/95 px-3.5 py-1.75 text-sm font-semibold text-[#0f2747] shadow-md transition hover:-translate-y-0.5 hover:bg-[#eff6ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0ea5e9]';

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

export default function Figure03IoTArquitetura() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1, height: 1 });

  const sensoresRef = useRef<HTMLDivElement | null>(null);
  const loggerRef = useRef<HTMLDivElement | null>(null);
  const wifiRef = useRef<HTMLDivElement | null>(null);
  const celularRef = useRef<HTMLDivElement | null>(null);
  const loraRef = useRef<HTMLDivElement | null>(null);
  const sateliteRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<HTMLDivElement | null>(null);
  const etlRef = useRef<HTMLDivElement | null>(null);
  const bancoRef = useRef<HTMLDivElement | null>(null);
  const painelRef = useRef<HTMLDivElement | null>(null);

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

    const resizeRefs = useMemo(() => {
      return [
        containerRef as React.RefObject<Element | null>,
        fromRef,
        toRef,
      ];
    }, [fromRef, toRef]);

    useRerouteOnResize(resizeRefs, updatePath);

    return path;
  };

  const pathSensoresToLogger = useConnector(sensoresRef, loggerRef, { offset: 0 });
  const pathLoggerToWifi = useConnector(loggerRef, wifiRef, { offset: -18 });
  const pathLoggerToCelular = useConnector(loggerRef, celularRef, { offset: -6 });
  const pathLoggerToLora = useConnector(loggerRef, loraRef, { offset: 6 });
  const pathLoggerToSat = useConnector(loggerRef, sateliteRef, { offset: 18 });

  const pathWifiToApi = useConnector(wifiRef, apiRef, { offset: -18, curv: 0.32 });
  const pathCelularToApi = useConnector(celularRef, apiRef, { offset: -6, curv: 0.32 });
  const pathLoraToApi = useConnector(loraRef, apiRef, { offset: 6, curv: 0.32 });
  const pathSatToApi = useConnector(sateliteRef, apiRef, { offset: 18, curv: 0.32 });

  const pathApiToEtl = useConnector(apiRef, etlRef, { offset: 0 });
  const pathEtlToBanco = useConnector(etlRef, bancoRef, { offset: -8 });
  const pathEtlToPainel = useConnector(etlRef, painelRef, { offset: -20, curv: 0.34 });
  const pathBancoToPainel = useConnector(bancoRef, painelRef, { offset: 12, curv: 0.28 });

  const connectors = useMemo(
    () =>
      [
        { d: pathSensoresToLogger, color: COLORS.accent, title: 'Sensores → Nó/Logger' },
        { d: pathLoggerToWifi, color: COLORS.accent, title: 'Nó/Logger → Wi-Fi' },
        { d: pathLoggerToCelular, color: COLORS.accent, title: 'Nó/Logger → 3G/4G/LTE-M' },
        { d: pathLoggerToLora, color: COLORS.accent, title: 'Nó/Logger → LoRaWAN' },
        { d: pathLoggerToSat, color: COLORS.accent2, title: 'Nó/Logger → Satélite' },
        { d: pathWifiToApi, color: COLORS.accent, title: 'Wi-Fi → API OGC SensorThings' },
        { d: pathCelularToApi, color: COLORS.accent, title: '3G/4G/LTE-M → API OGC SensorThings' },
        { d: pathLoraToApi, color: COLORS.accent, title: 'LoRaWAN → API OGC SensorThings' },
        { d: pathSatToApi, color: COLORS.accent2, title: 'Satélite → API OGC SensorThings' },
        { d: pathApiToEtl, color: COLORS.accent, title: 'API OGC SensorThings → ETL & QA/QC' },
        { d: pathEtlToBanco, color: COLORS.accent2, title: 'ETL & QA/QC → Banco de dados' },
        { d: pathEtlToPainel, color: COLORS.accent, title: 'ETL & QA/QC → Painel/Aplicativo' },
        { d: pathBancoToPainel, color: COLORS.accent2, title: 'Banco de dados → Painel/Aplicativo' },
      ].filter((connector) => connector.d),
    [
      pathSensoresToLogger,
      pathLoggerToWifi,
      pathLoggerToCelular,
      pathLoggerToLora,
      pathLoggerToSat,
      pathWifiToApi,
      pathCelularToApi,
      pathLoraToApi,
      pathSatToApi,
      pathApiToEtl,
      pathEtlToBanco,
      pathEtlToPainel,
      pathBancoToPainel,
    ],
  );

  const svgWidth = canvasSize.width || 1;
  const svgHeight = canvasSize.height || 1;

  return (
    <section
      aria-label="Figura 3 – Estação IoT → Plataforma"
      data-figure="3"
      className="relative flex justify-center bg-white"
    >
      <div
        ref={containerRef}
        className="relative mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-7 px-4 py-6 sm:px-6 lg:grid-cols-3"
      >
        <div className="absolute right-6 top-6 z-20 flex gap-3">
          <button
            type="button"
            className={toolbarButtonClass}
            onClick={() => exportAsSVG(svgRef, 'Figura03.svg')}
          >
            Exportar SVG
          </button>
          <button
            type="button"
            className={toolbarButtonClass}
            onClick={() => void exportAsPDF(svgRef, 'Figura03.pdf')}
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
              id="arrowHeadFig3"
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
              id="arrowHeadFig3Alt"
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
              strokeWidth={2.6}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              markerEnd={
                connector.color === COLORS.accent ? 'url(#arrowHeadFig3)' : 'url(#arrowHeadFig3Alt)'
              }
            >
              <title>{connector.title}</title>
            </path>
          ))}
        </svg>

        <div className={laneClass}>
          <div className={laneHeadClass}>Campo · Dispositivo</div>
          <div className={laneBodyClass}>
            <article ref={sensoresRef} className={accentCardClass}>
              <div className="flex items-start gap-3">
                <div className={iconWrapperClass} aria-hidden="true">
                  <Sun className="h-5 w-5" />
                </div>
                <div>
                  <h3 className={cardTitleClass}>Sensores ambientais (WMO-No. 8)</h3>
                  <p className={cardBodyTextClass}>Radiação, temperatura, umidade, vento e chuva.</p>
                  <div className="mt-2 flex items-center gap-2 text-[#2a7de1]" aria-hidden="true">
                    <Sun className="h-4 w-4" />
                    <Thermometer className="h-4 w-4" />
                    <Droplets className="h-4 w-4" />
                    <Wind className="h-4 w-4" />
                    <CloudRain className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </article>
            <article ref={loggerRef} className={cardClass}>
              <h3 className={cardTitleClass}>Nó/Logger (edge)</h3>
              <ul className="mt-2 space-y-1 text-[14px]/[20px] text-[#0f2747]/85">
                <li>• Aquisição síncrona/assíncrona</li>
                <li>• Buffering (store &amp; forward)</li>
                <li>• Watchdog e telemetria</li>
              </ul>
            </article>
          </div>
        </div>

        <div className={laneClass}>
          <div className={laneHeadClass}>Conectividade</div>
          <div className={laneBodyClass}>
            <article ref={wifiRef} className={`${cardClass} flex items-center justify-between gap-3`}>
              <span className={pillClass}>Wi-Fi</span>
              <p className="text-[13px]/[18px] text-[#0f2747]/75">Curto alcance · baixo custo</p>
            </article>
            <article ref={celularRef} className={`${cardClass} flex items-center justify-between gap-3`}>
              <span className={pillClass}>3G/4G/LTE-M</span>
              <p className="text-[13px]/[18px] text-[#0f2747]/75">Cobertura ampla · latência moderada</p>
            </article>
            <article ref={loraRef} className={`${cardClass} flex items-center justify-between gap-3`}>
              <span className={pillClass}>LoRaWAN</span>
              <p className="text-[13px]/[18px] text-[#0f2747]/75">2–15 km · baixo consumo · gateways</p>
            </article>
            <article ref={sateliteRef} className={`${cardClass} flex items-center justify-between gap-3`}>
              <span className={pillClass}>Satélite</span>
              <p className="text-[13px]/[18px] text-[#0f2747]/75">Contingência · custo elevado</p>
            </article>
          </div>
        </div>

        <div className={laneClass}>
          <div className={laneHeadClass}>Plataforma · Aplicação</div>
          <div className={laneBodyClass}>
            <article ref={apiRef} className={cardClass}>
              <div className="flex items-start gap-3">
                <div className={iconWrapperClass} aria-hidden="true">
                  <Network className="h-5 w-5" />
                </div>
                <div>
                  <h3 className={cardTitleClass}>API pública · OGC SensorThings (Sensing)</h3>
                  <p className={cardBodyTextClass}>
                    Things · Datastreams · Observations · ObservedProperty · FeatureOfInterest.
                  </p>
                </div>
              </div>
            </article>
            <article ref={etlRef} className={cardClass}>
              <div className="flex items-start gap-3">
                <div className={iconWrapperClass} aria-hidden="true">
                  <Settings2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className={cardTitleClass}>ETL &amp; QA/QC</h3>
                  <p className={cardBodyTextClass}>Limites, consistência, flags e envelopes de Rₛₒ.</p>
                </div>
              </div>
            </article>
            <article ref={bancoRef} className={cardClass}>
              <div className="flex items-start gap-3">
                <div className={iconWrapperClass} aria-hidden="true">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <h3 className={cardTitleClass}>Banco de dados</h3>
                  <p className={cardBodyTextClass}>Séries temporais + catálogo de metadados.</p>
                </div>
              </div>
            </article>
            <article ref={painelRef} className={cardClass}>
              <div className="flex items-start gap-3">
                <div className={iconWrapperClass} aria-hidden="true">
                  <LayoutDashboard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className={cardTitleClass}>Painel / Aplicativo</h3>
                  <p className={cardBodyTextClass}>Mapas, séries, indicadores e recomendações.</p>
                </div>
              </div>
            </article>
            <p className={hintClass}>Instalação conforme WMO-No. 8; interoperabilidade OGC SensorThings.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
