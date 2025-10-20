'use client';

import React, { useRef, useState, useEffect, RefObject } from 'react';
import {
  Sun,
  Thermometer,
  Droplets,
  Wind,
  CloudRain,
  Database,
  Network,
  Settings2,
  LayoutDashboard,
  Download,
  FileDown,
  Wifi,
  Radio,
  Satellite,
  Activity,
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
};

// ==================== TIPOS ====================
interface ConnectorConfig {
  curv?: number;
  offset?: number;
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
export default function Figure03_IoT_Arquitetura(): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Refs coluna Campo
  const sensorsRef = useRef<HTMLDivElement>(null);
  const loggerRef = useRef<HTMLDivElement>(null);

  // Refs coluna Conectividade
  const wifiRef = useRef<HTMLDivElement>(null);
  const cellularRef = useRef<HTMLDivElement>(null);
  const loraRef = useRef<HTMLDivElement>(null);
  const satRef = useRef<HTMLDivElement>(null);

  // Refs coluna Plataforma
  const apiRef = useRef<HTMLDivElement>(null);
  const etlRef = useRef<HTMLDivElement>(null);
  const dbRef = useRef<HTMLDivElement>(null);
  const dashRef = useRef<HTMLDivElement>(null);

  const tick = useRerouteOnResize(containerRef, []);

  // Conectores: Campo → Conectividade
  const pathLoggerToWifi = useConnector(loggerRef, wifiRef, containerRef, { offset: -24 });
  const pathLoggerToCellular = useConnector(loggerRef, cellularRef, containerRef, { offset: -8 });
  const pathLoggerToLora = useConnector(loggerRef, loraRef, containerRef, { offset: 8 });
  const pathLoggerToSat = useConnector(loggerRef, satRef, containerRef, { offset: 24 });

  // Conectores: Conectividade → API
  const pathWifiToAPI = useConnector(wifiRef, apiRef, containerRef, { offset: -12 });
  const pathCellularToAPI = useConnector(cellularRef, apiRef, containerRef, { offset: -4 });
  const pathLoraToAPI = useConnector(loraRef, apiRef, containerRef, { offset: 4 });
  const pathSatToAPI = useConnector(satRef, apiRef, containerRef, { offset: 12 });

  // Conectores: API → ETL → DB → Dashboard
  const pathAPIToETL = useConnector(apiRef, etlRef, containerRef, { offset: 0 });
  const pathETLToDB = useConnector(etlRef, dbRef, containerRef, { offset: 0 });
  const pathDBToDash = useConnector(dbRef, dashRef, containerRef, { offset: 0 });

  return (
    <section
      aria-label="Figura 3 – Arquitetura IoT para Agrometeorologia"
      className="w-full min-h-screen p-6 md:p-10"
      style={{ backgroundColor: COLORS.bg }}
    >
      {/* Cabeçalho */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold" style={{ color: COLORS.headText }}>
              Figura 3 – Arquitetura IoT para Agrometeorologia
            </h2>
            <p className="text-sm mt-2 opacity-80" style={{ color: COLORS.text }}>
              Estação de campo → Conectividade → Plataforma de dados
            </p>
          </div>

          {/* Toolbar de Exportação */}
          <div className="flex gap-3">
            <button
              onClick={() => exportAsSVG(svgRef, 'figura03_iot_arquitetura.svg')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-all hover:opacity-90 shadow-md"
              style={{ backgroundColor: COLORS.accent }}
              aria-label="Exportar diagrama como SVG"
            >
              <Download size={18} />
              <span className="hidden sm:inline">SVG</span>
            </button>
            <button
              onClick={() => exportAsPDF(svgRef, 'figura03_iot_arquitetura.pdf')}
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-7 relative z-10">
          {/* ========== COLUNA 1: CAMPO ========== */}
          <div className="space-y-5">
            <h3
              className="text-lg font-bold px-4 py-2 rounded-xl"
              style={{ backgroundColor: COLORS.laneHead, color: COLORS.headText }}
            >
              Campo (Dispositivos)
            </h3>

            {/* Sensores */}
            <article
              ref={sensorsRef}
              className="bg-white rounded-2xl border shadow-md p-4 md:p-5 relative"
              style={{ borderColor: COLORS.border }}
            >
              <h4 className="font-semibold text-base mb-3" style={{ color: COLORS.text }}>
                Sensores Agrometeorológicos
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm" style={{ color: COLORS.text }}>
                  <Sun size={18} style={{ color: COLORS.accent }} />
                  <span>Radiação</span>
                </div>
                <div className="flex items-center gap-2 text-sm" style={{ color: COLORS.text }}>
                  <Thermometer size={18} style={{ color: COLORS.accent }} />
                  <span>Temperatura</span>
                </div>
                <div className="flex items-center gap-2 text-sm" style={{ color: COLORS.text }}>
                  <Droplets size={18} style={{ color: COLORS.accent }} />
                  <span>Umidade</span>
                </div>
                <div className="flex items-center gap-2 text-sm" style={{ color: COLORS.text }}>
                  <Wind size={18} style={{ color: COLORS.accent }} />
                  <span>Vento</span>
                </div>
                <div className="flex items-center gap-2 text-sm" style={{ color: COLORS.text }}>
                  <CloudRain size={18} style={{ color: COLORS.accent }} />
                  <span>Chuva</span>
                </div>
              </div>
            </article>

            {/* Logger/Edge */}
            <article
              ref={loggerRef}
              className="bg-white rounded-2xl border shadow-md p-4 md:p-5 relative"
              style={{ borderColor: COLORS.border }}
            >
              <div className="flex items-start gap-3">
                <Activity size={22} style={{ color: COLORS.accent, flexShrink: 0 }} />
                <div>
                  <h4 className="font-semibold text-base" style={{ color: COLORS.text }}>
                    Nó/Logger (Edge)
                  </h4>
                  <ul className="text-sm mt-2 space-y-1" style={{ color: COLORS.text, opacity: 0.8 }}>
                    <li>• Aquisição de dados</li>
                    <li>• Buffering (store & forward)</li>
                    <li>• Watchdog (reinício automático)</li>
                  </ul>
                </div>
              </div>
            </article>

            {/* Imagem opcional da estação */}
            <div className="bg-white rounded-2xl border shadow-md p-3 relative" style={{ borderColor: COLORS.border }}>
              <div className="aspect-video bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center">
                <p className="text-xs text-center px-4" style={{ color: COLORS.text, opacity: 0.6 }}>
                  [Imagem ilustrativa da estação]<br />
                  <code className="text-xs">/images/estacao_iot.png</code>
                </p>
              </div>
              <p className="text-xs mt-2 text-center" style={{ color: COLORS.text, opacity: 0.7 }}>
                Estação agrometeorológica automática
              </p>
            </div>
          </div>

          {/* ========== COLUNA 2: CONECTIVIDADE ========== */}
          <div className="space-y-5">
            <h3
              className="text-lg font-bold px-4 py-2 rounded-xl"
              style={{ backgroundColor: COLORS.laneHead, color: COLORS.headText }}
            >
              Conectividade
            </h3>

            {/* Wi-Fi */}
            <article
              ref={wifiRef}
              className="bg-white rounded-2xl border shadow-md p-4 md:p-5 relative"
              style={{ borderColor: COLORS.border }}
            >
              <div className="flex items-start gap-3">
                <Wifi size={22} style={{ color: COLORS.accent, flexShrink: 0 }} />
                <div>
                  <h4 className="font-semibold text-base" style={{ color: COLORS.text }}>
                    Wi-Fi
                  </h4>
                  <p className="text-sm mt-1" style={{ color: COLORS.text, opacity: 0.8 }}>
                    Curto alcance, custo baixo
                  </p>
                </div>
              </div>
            </article>

            {/* 3G/4G/LTE-M */}
            <article
              ref={cellularRef}
              className="bg-white rounded-2xl border shadow-md p-4 md:p-5 relative"
              style={{ borderColor: COLORS.border }}
            >
              <div className="flex items-start gap-3">
                <Radio size={22} style={{ color: COLORS.accent, flexShrink: 0 }} />
                <div>
                  <h4 className="font-semibold text-base" style={{ color: COLORS.text }}>
                    3G/4G/LTE-M
                  </h4>
                  <p className="text-sm mt-1" style={{ color: COLORS.text, opacity: 0.8 }}>
                    Cobertura ampla, latência moderada
                  </p>
                </div>
              </div>
            </article>

            {/* LoRaWAN */}
            <article
              ref={loraRef}
              className="bg-white rounded-2xl border shadow-md p-4 md:p-5 relative"
              style={{ borderColor: COLORS.border }}
            >
              <div className="flex items-start gap-3">
                <Network size={22} style={{ color: COLORS.accent, flexShrink: 0 }} />
                <div>
                  <h4 className="font-semibold text-base" style={{ color: COLORS.text }}>
                    LoRaWAN
                  </h4>
                  <p className="text-sm mt-1" style={{ color: COLORS.text, opacity: 0.8 }}>
                    2–15 km, baixo consumo, gateways
                  </p>
                </div>
              </div>
            </article>

            {/* Satélite */}
            <article
              ref={satRef}
              className="bg-white rounded-2xl border shadow-md p-4 md:p-5 relative"
              style={{ borderColor: COLORS.border }}
            >
              <div className="flex items-start gap-3">
                <Satellite size={22} style={{ color: COLORS.accent, flexShrink: 0 }} />
                <div>
                  <h4 className="font-semibold text-base" style={{ color: COLORS.text }}>
                    Satélite
                  </h4>
                  <p className="text-sm mt-1" style={{ color: COLORS.text, opacity: 0.8 }}>
                    Contingência, custo elevado
                  </p>
                </div>
              </div>
            </article>
          </div>

          {/* ========== COLUNA 3: PLATAFORMA ========== */}
          <div className="space-y-5">
            <h3
              className="text-lg font-bold px-4 py-2 rounded-xl"
              style={{ backgroundColor: COLORS.laneHead, color: COLORS.headText }}
            >
              Plataforma/Aplicação
            </h3>

            {/* API */}
            <article
              ref={apiRef}
              className="bg-white rounded-2xl border shadow-md p-4 md:p-5 relative"
              style={{ borderColor: COLORS.border }}
            >
              <div className="flex items-start gap-3">
                <Network size={22} style={{ color: COLORS.accent, flexShrink: 0 }} />
                <div>
                  <h4 className="font-semibold text-base" style={{ color: COLORS.text }}>
                    API pública: OGC SensorThings
                  </h4>
                  <p className="text-sm mt-2" style={{ color: COLORS.text, opacity: 0.8 }}>
                    Entidades: Thing, Datastream, Observation, ObservedProperty, FeatureOfInterest
                  </p>
                </div>
              </div>
            </article>

            {/* ETL & QA/QC */}
            <article
              ref={etlRef}
              className="bg-white rounded-2xl border shadow-md p-4 md:p-5 relative"
              style={{ borderColor: COLORS.border }}
            >
              <div className="flex items-start gap-3">
                <Settings2 size={22} style={{ color: COLORS.accent, flexShrink: 0 }} />
                <div>
                  <h4 className="font-semibold text-base" style={{ color: COLORS.text }}>
                    ETL & QA/QC
                  </h4>
                  <p className="text-sm mt-2" style={{ color: COLORS.text, opacity: 0.8 }}>
                    Limites, consistência, flags, envelopes de R<sub>so</sub>
                  </p>
                </div>
              </div>
            </article>

            {/* Banco de dados */}
            <article
              ref={dbRef}
              className="bg-white rounded-2xl border shadow-md p-4 md:p-5 relative"
              style={{ borderColor: COLORS.border }}
            >
              <div className="flex items-start gap-3">
                <Database size={22} style={{ color: COLORS.accent, flexShrink: 0 }} />
                <div>
                  <h4 className="font-semibold text-base" style={{ color: COLORS.text }}>
                    Banco de dados
                  </h4>
                  <p className="text-sm mt-2" style={{ color: COLORS.text, opacity: 0.8 }}>
                    Timeseries + catálogo de metadados
                  </p>
                </div>
              </div>
            </article>

            {/* Painel/Aplicativo */}
            <article
              ref={dashRef}
              className="bg-white rounded-2xl border shadow-md p-4 md:p-5 relative"
              style={{ borderColor: COLORS.border }}
            >
              <div className="flex items-start gap-3">
                <LayoutDashboard size={22} style={{ color: COLORS.accent, flexShrink: 0 }} />
                <div>
                  <h4 className="font-semibold text-base" style={{ color: COLORS.text }}>
                    Painel/Aplicativo
                  </h4>
                  <p className="text-sm mt-2" style={{ color: COLORS.text, opacity: 0.8 }}>
                    Mapas, séries temporais, recomendações
                  </p>
                </div>
              </div>
            </article>
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
          </defs>

          {/* Campo → Conectividade */}
          {pathLoggerToWifi && (
            <path
              d={pathLoggerToWifi}
              stroke={COLORS.accent}
              strokeWidth={2.5}
              fill="none"
              markerEnd="url(#arrowHead)"
            >
              <title>Logger → Wi-Fi</title>
            </path>
          )}
          {pathLoggerToCellular && (
            <path
              d={pathLoggerToCellular}
              stroke={COLORS.accent}
              strokeWidth={2.5}
              fill="none"
              markerEnd="url(#arrowHead)"
            >
              <title>Logger → 3G/4G/LTE-M</title>
            </path>
          )}
          {pathLoggerToLora && (
            <path
              d={pathLoggerToLora}
              stroke={COLORS.accent}
              strokeWidth={2.5}
              fill="none"
              markerEnd="url(#arrowHead)"
            >
              <title>Logger → LoRaWAN</title>
            </path>
          )}
          {pathLoggerToSat && (
            <path
              d={pathLoggerToSat}
              stroke={COLORS.accent}
              strokeWidth={2.5}
              fill="none"
              markerEnd="url(#arrowHead)"
            >
              <title>Logger → Satélite</title>
            </path>
          )}

          {/* Conectividade → API */}
          {pathWifiToAPI && (
            <path
              d={pathWifiToAPI}
              stroke={COLORS.accent}
              strokeWidth={2.5}
              fill="none"
              markerEnd="url(#arrowHead)"
            >
              <title>Wi-Fi → API</title>
            </path>
          )}
          {pathCellularToAPI && (
            <path
              d={pathCellularToAPI}
              stroke={COLORS.accent}
              strokeWidth={2.5}
              fill="none"
              markerEnd="url(#arrowHead)"
            >
              <title>3G/4G → API</title>
            </path>
          )}
          {pathLoraToAPI && (
            <path
              d={pathLoraToAPI}
              stroke={COLORS.accent}
              strokeWidth={2.5}
              fill="none"
              markerEnd="url(#arrowHead)"
            >
              <title>LoRaWAN → API</title>
            </path>
          )}
          {pathSatToAPI && (
            <path
              d={pathSatToAPI}
              stroke={COLORS.accent}
              strokeWidth={2.5}
              fill="none"
              markerEnd="url(#arrowHead)"
            >
              <title>Satélite → API</title>
            </path>
          )}

          {/* Plataforma pipeline */}
          {pathAPIToETL && (
            <path
              d={pathAPIToETL}
              stroke={COLORS.accent}
              strokeWidth={2.5}
              fill="none"
              markerEnd="url(#arrowHead)"
            >
              <title>API → ETL</title>
            </path>
          )}
          {pathETLToDB && (
            <path
              d={pathETLToDB}
              stroke={COLORS.accent}
              strokeWidth={2.5}
              fill="none"
              markerEnd="url(#arrowHead)"
            >
              <title>ETL → Banco</title>
            </path>
          )}
          {pathDBToDash && (
            <path
              d={pathDBToDash}
              stroke={COLORS.accent}
              strokeWidth={2.5}
              fill="none"
              markerEnd="url(#arrowHead)"
            >
              <title>Banco → Painel</title>
            </path>
          )}
        </svg>
      </div>

      {/* Rodapé */}
      <div className="max-w-7xl mx-auto mt-8">
        <p className="text-xs text-center" style={{ color: COLORS.text, opacity: 0.6 }}>
          Instalação conforme WMO-No. 8 | Interoperabilidade OGC SensorThings API
        </p>
      </div>
    </section>
  );
}
