'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Database,
  DoorOpen,
  ServerCog,
  Shield,
  User,
  UserCheck,
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

export default function Figure06SegurancaRBAC() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1, height: 1 });
  const [shieldMarkers, setShieldMarkers] = useState<Array<{ x: number; y: number }>>([]);

  const leitorRef = useRef<HTMLDivElement | null>(null);
  const gestorRef = useRef<HTMLDivElement | null>(null);
  const adminRef = useRef<HTMLDivElement | null>(null);
  const gatewayRef = useRef<HTMLDivElement | null>(null);
  const serviceEtlRef = useRef<HTMLDivElement | null>(null);
  const serviceEt0Ref = useRef<HTMLDivElement | null>(null);
  const serviceDssRef = useRef<HTMLDivElement | null>(null);
  const bancoRef = useRef<HTMLDivElement | null>(null);

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

  const pathLeitorToGateway = useConnector(leitorRef, gatewayRef, { offset: -18, curv: 0.28 });
  const pathGestorToGateway = useConnector(gestorRef, gatewayRef, { offset: 0, curv: 0.28 });
  const pathAdminToGateway = useConnector(adminRef, gatewayRef, { offset: 18, curv: 0.28 });

  const pathGatewayToEtl = useConnector(gatewayRef, serviceEtlRef, { offset: -16, curv: 0.3 });
  const pathGatewayToEt0 = useConnector(gatewayRef, serviceEt0Ref, { offset: 0, curv: 0.3 });
  const pathGatewayToDss = useConnector(gatewayRef, serviceDssRef, { offset: 16, curv: 0.3 });

  const pathEtlToBanco = useConnector(serviceEtlRef, bancoRef, { offset: -20, curv: 0.32 });
  const pathEt0ToBanco = useConnector(serviceEt0Ref, bancoRef, { offset: 0, curv: 0.3 });
  const pathDssToBanco = useConnector(serviceDssRef, bancoRef, { offset: 20, curv: 0.32 });

  useEffect(() => {
    const container = containerRef.current;
    const gateway = gatewayRef.current;
    if (!container || !gateway) {
      return;
    }
    const containerRect = container.getBoundingClientRect();
    const gatewayRect = gateway.getBoundingClientRect();

    const entries: Array<{ ref: React.RefObject<HTMLDivElement | null>; offset: number }> = [
      { ref: leitorRef, offset: -18 },
      { ref: gestorRef, offset: 0 },
      { ref: adminRef, offset: 18 },
    ];

    const markers = entries
      .map(({ ref, offset }) => {
        const el = ref.current;
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        const x = gatewayRect.left - containerRect.left - 28;
        const y = rect.top + rect.height / 2 - containerRect.top + offset;
        return { x, y };
      })
      .filter((marker): marker is { x: number; y: number } => Boolean(marker));

    setShieldMarkers(markers);
  }, [canvasSize, pathLeitorToGateway, pathGestorToGateway, pathAdminToGateway]);

  const connectors = useMemo(
    () =>
      [
        { d: pathLeitorToGateway, color: COLORS.accent, title: 'Leitor → API Gateway', dash: undefined },
        { d: pathGestorToGateway, color: COLORS.accent, title: 'Gestor → API Gateway', dash: undefined },
        { d: pathAdminToGateway, color: COLORS.accent2, title: 'Admin → API Gateway', dash: undefined },
        { d: pathGatewayToEtl, color: COLORS.accent, title: 'API Gateway → ETL / QA-QC', dash: undefined },
        { d: pathGatewayToEt0, color: COLORS.accent, title: 'API Gateway → ET₀ & BH', dash: undefined },
        { d: pathGatewayToDss, color: COLORS.accent, title: 'API Gateway → DSS / Alertas', dash: undefined },
        { d: pathEtlToBanco, color: COLORS.accent2, title: 'Serviço ETL / QA-QC → Banco de dados', dash: undefined },
        { d: pathEt0ToBanco, color: COLORS.accent, title: 'Serviço ET₀ & BH → Banco de dados', dash: undefined },
        { d: pathDssToBanco, color: COLORS.accent, title: 'Serviço DSS / Alertas → Banco de dados', dash: undefined },
      ].filter((connector) => connector.d),
    [
      pathLeitorToGateway,
      pathGestorToGateway,
      pathAdminToGateway,
      pathGatewayToEtl,
      pathGatewayToEt0,
      pathGatewayToDss,
      pathEtlToBanco,
      pathEt0ToBanco,
      pathDssToBanco,
    ],
  );

  const svgWidth = canvasSize.width || 1;
  const svgHeight = canvasSize.height || 1;

  const cardClass =
    'group relative rounded-2xl border border-[#d6e3f2] bg-white/95 p-5 shadow-md transition hover:-translate-y-1 hover:shadow-lg';
  const bodyTextClass = 'text-[15px]/[24px] md:text-[16px]/[26px] text-[#0e223d]';
  const iconWrapperClass =
    'grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-[#e9f5ff] to-white text-[#2a7de1] shadow-inner';
  const shieldIconClass =
    'grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-[#e8f3ff] to-white text-[#0f2747] shadow-inner';

  const toolbarButtonClass =
    'inline-flex items-center gap-2 rounded-xl border border-[#d6e3f2] bg-white/95 px-3.5 py-1.75 text-sm font-semibold text-[#0f2747] shadow-md transition hover:-translate-y-0.5 hover:bg-[#eff6ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0ea5e9]';

  return (
    <section
      ref={containerRef}
      aria-label="Figura 6 – Camadas de segurança e papéis (RBAC)"
      data-figure="6"
      className="relative grid grid-cols-1 gap-8 rounded-3xl border border-[#d6e3f2] bg-white p-6 shadow-xl lg:grid-cols-4"
    >
      <div className="absolute right-6 top-6 z-20 flex gap-3">
        <button
          type="button"
          className={toolbarButtonClass}
          onClick={() => exportAsSVG(svgRef, 'Figura06.svg')}
        >
          Exportar SVG
        </button>
        <button
          type="button"
          className={toolbarButtonClass}
          onClick={() => void exportAsPDF(svgRef, 'Figura06.pdf')}
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
            id="arrowHeadFig6"
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
            id="arrowHeadFig6Alt"
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
              connector.color === COLORS.accent ? 'url(#arrowHeadFig6)' : 'url(#arrowHeadFig6Alt)'
            }
          >
            <title>{connector.title}</title>
          </path>
        ))}
        {shieldMarkers.map((marker, index) => (
          <path
            key={`shield-${index}`}
            d={`M ${marker.x} ${marker.y - 10} L ${marker.x + 7} ${marker.y - 4} L ${marker.x + 7} ${marker.y + 5} L ${marker.x} ${marker.y + 10} L ${marker.x - 7} ${marker.y + 5} L ${marker.x - 7} ${marker.y - 4} Z`}
            fill={COLORS.accent}
            opacity={0.85}
            stroke={COLORS.accent}
            strokeWidth={0.75}
          >
            <title>Camada de proteção</title>
          </path>
        ))}
      </svg>

      <div className="space-y-5">
        <div className="rounded-2xl border border-[#d6e3f2] bg-gradient-to-r from-[#cfe6ff] to-[#e8f3ff] px-5 py-3 text-sm font-semibold text-[#0f2747] shadow-sm">
          Usuários e papéis
        </div>
        <article ref={leitorRef} className={cardClass}>
          <div className="flex items-start gap-3">
            <div className={iconWrapperClass} aria-hidden="true">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className={`${bodyTextClass} font-semibold`}>Leitor</p>
              <p className="mt-2 text-[14px]/[20px] text-[#0f2747]/80">
                Consulta dashboards e relatórios; acesso somente leitura.
              </p>
            </div>
          </div>
        </article>
        <article ref={gestorRef} className={cardClass}>
          <div className="flex items-start gap-3">
            <div className={iconWrapperClass} aria-hidden="true">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <p className={`${bodyTextClass} font-semibold`}>Gestor</p>
              <p className="mt-2 text-[14px]/[20px] text-[#0f2747]/80">
                Aprova recomendações, ajusta thresholds e calendários operacionais.
              </p>
            </div>
          </div>
        </article>
        <article ref={adminRef} className={cardClass}>
          <div className="flex items-start gap-3">
            <div className={shieldIconClass} aria-hidden="true">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className={`${bodyTextClass} font-semibold`}>Admin</p>
              <p className="mt-2 text-[14px]/[20px] text-[#0f2747]/80">
                Gestão de credenciais, políticas e governança de dados.
              </p>
            </div>
          </div>
        </article>
      </div>

      <div className="space-y-5">
        <div className="rounded-2xl border border-[#d6e3f2] bg-gradient-to-r from-[#cfe6ff] to-[#e8f3ff] px-5 py-3 text-sm font-semibold text-[#0f2747] shadow-sm">
          API Gateway
        </div>
        <article ref={gatewayRef} className={cardClass}>
          <div className="flex items-start gap-3">
            <div className={iconWrapperClass} aria-hidden="true">
              <DoorOpen className="h-5 w-5" />
            </div>
            <div>
              <p className={`${bodyTextClass} font-semibold`}>Auth · Rate limit · Versionamento</p>
              <ul className="mt-3 space-y-1 text-[14px]/[20px] text-[#0f2747]/80">
                <li>• OAuth2/OIDC com MFA e escopos granulares.</li>
                <li>• Rate limiting adaptativo por papel e origem.</li>
                <li>• Versionamento de APIs e contratos OGC.</li>
              </ul>
            </div>
          </div>
        </article>
      </div>

      <div className="space-y-5">
        <div className="rounded-2xl border border-[#d6e3f2] bg-gradient-to-r from-[#cfe6ff] to-[#e8f3ff] px-5 py-3 text-sm font-semibold text-[#0f2747] shadow-sm">
          Serviços
        </div>
        <article ref={serviceEtlRef} className={cardClass}>
          <div className="flex items-start gap-3">
            <div className={iconWrapperClass} aria-hidden="true">
              <ServerCog className="h-5 w-5" />
            </div>
            <div>
              <p className={`${bodyTextClass} font-semibold`}>ETL / QA-QC</p>
              <p className="mt-2 text-[14px]/[20px] text-[#0f2747]/80">
                Pipelines de consistência, normalização e enriquecimento.
              </p>
            </div>
          </div>
        </article>
        <article ref={serviceEt0Ref} className={cardClass}>
          <div className="flex items-start gap-3">
            <div className={iconWrapperClass} aria-hidden="true">
              <ServerCog className="h-5 w-5" />
            </div>
            <div>
              <p className={`${bodyTextClass} font-semibold`}>ET₀ &amp; BH</p>
              <p className="mt-2 text-[14px]/[20px] text-[#0f2747]/80">
                Cálculo FAO-56, balanço hídrico e indicadores climáticos.
              </p>
            </div>
          </div>
        </article>
        <article ref={serviceDssRef} className={cardClass}>
          <div className="flex items-start gap-3">
            <div className={iconWrapperClass} aria-hidden="true">
              <ServerCog className="h-5 w-5" />
            </div>
            <div>
              <p className={`${bodyTextClass} font-semibold`}>DSS / Alertas</p>
              <p className="mt-2 text-[14px]/[20px] text-[#0f2747]/80">
                Regras de negócio, notificações proativas e auditoria.
              </p>
            </div>
          </div>
        </article>
      </div>

      <div className="space-y-5">
        <div className="rounded-2xl border border-[#d6e3f2] bg-gradient-to-r from-[#cfe6ff] to-[#e8f3ff] px-5 py-3 text-sm font-semibold text-[#0f2747] shadow-sm">
          Banco de dados
        </div>
        <article ref={bancoRef} className={cardClass}>
          <div className="flex items-start gap-3">
            <div className={iconWrapperClass} aria-hidden="true">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <p className={`${bodyTextClass} font-semibold`}>Timeseries + RLS</p>
              <p className="mt-2 text-[14px]/[20px] text-[#0f2747]/80">
                Particionamento temporal, Row-Level Security e criptografia em repouso.
              </p>
            </div>
          </div>
        </article>
        <div className="rounded-xl border border-[#d6e3f2] bg-white p-4 text-[13px]/[18px] text-[#0f2747]/75 shadow-sm">
          <p>LGPD: minimização e transparência.</p>
          <p className="mt-1">Logs auditáveis e trilhas de acesso preservadas.</p>
        </div>
      </div>
    </section>
  );
}
