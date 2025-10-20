'use client';

import React, { useRef, useState, useEffect, RefObject } from 'react';
import {
  User,
  UserCheck,
  Shield,
  DoorOpen,
  ServerCog,
  Database,
  Download,
  FileDown,
  Lock,
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
export default function Figure06_Seguranca_RBAC(): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Refs papéis
  const leitorRef = useRef<HTMLDivElement>(null);
  const gestorRef = useRef<HTMLDivElement>(null);
  const adminRef = useRef<HTMLDivElement>(null);

  // Ref API Gateway
  const gatewayRef = useRef<HTMLDivElement>(null);

  // Refs serviços
  const etlRef = useRef<HTMLDivElement>(null);
  const et0Ref = useRef<HTMLDivElement>(null);
  const dssRef = useRef<HTMLDivElement>(null);

  // Ref banco
  const dbRef = useRef<HTMLDivElement>(null);

  const tick = useRerouteOnResize(containerRef, []);

  // Conectores: Usuários → Gateway
  const pathLeitorToGW = useConnector(leitorRef, gatewayRef, containerRef, { offset: -8 });
  const pathGestorToGW = useConnector(gestorRef, gatewayRef, containerRef, { offset: 0 });
  const pathAdminToGW = useConnector(adminRef, gatewayRef, containerRef, { offset: 8 });

  // Conectores: Gateway → Serviços
  const pathGWToETL = useConnector(gatewayRef, etlRef, containerRef, { offset: -8 });
  const pathGWToET0 = useConnector(gatewayRef, et0Ref, containerRef, { offset: 0 });
  const pathGWToDSS = useConnector(gatewayRef, dssRef, containerRef, { offset: 8 });

  // Conectores: Serviços → Banco
  const pathETLToDB = useConnector(etlRef, dbRef, containerRef, { offset: -8 });
  const pathET0ToDB = useConnector(et0Ref, dbRef, containerRef, { offset: 0 });
  const pathDSSToDB = useConnector(dssRef, dbRef, containerRef, { offset: 8 });

  return (
    <section
      aria-label="Figura 6 – Segurança e RBAC"
      className="w-full min-h-screen p-6 md:p-10"
      style={{ backgroundColor: COLORS.bg }}
    >
      {/* Cabeçalho */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold" style={{ color: COLORS.headText }}>
              Figura 6 – Segurança e RBAC
            </h2>
            <p className="text-sm mt-2 opacity-80" style={{ color: COLORS.text }}>
              Controle de acesso baseado em papéis (RBAC) e segurança em camadas
            </p>
          </div>

          {/* Toolbar de Exportação */}
          <div className="flex gap-3">
            <button
              onClick={() => exportAsSVG(svgRef, 'figura06_seguranca_rbac.svg')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-all hover:opacity-90 shadow-md"
              style={{ backgroundColor: COLORS.accent }}
              aria-label="Exportar diagrama como SVG"
            >
              <Download size={18} />
              <span className="hidden sm:inline">SVG</span>
            </button>
            <button
              onClick={() => exportAsPDF(svgRef, 'figura06_seguranca_rbac.pdf')}
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-7 relative z-10">
          {/* ========== COLUNA 1: USUÁRIOS/PAPÉIS ========== */}
          <div className="space-y-5">
            <h3
              className="text-lg font-bold px-4 py-2 rounded-xl"
              style={{ backgroundColor: COLORS.laneHead, color: COLORS.headText }}
            >
              Usuários / Papéis
            </h3>

            {/* Leitor */}
            <article
              ref={leitorRef}
              className="bg-white rounded-2xl border shadow-md p-4 md:p-5 relative"
              style={{ borderColor: COLORS.border }}
            >
              <div className="flex items-start gap-3">
                <User size={22} style={{ color: COLORS.accent, flexShrink: 0 }} />
                <div className="flex-1">
                  <h4 className="font-semibold text-base" style={{ color: COLORS.text }}>
                    Leitor
                  </h4>
                  <p className="text-sm mt-2" style={{ color: COLORS.text, opacity: 0.8 }}>
                    Acesso somente leitura a dados públicos e dashboards
                  </p>
                </div>
              </div>
            </article>

            {/* Gestor */}
            <article
              ref={gestorRef}
              className="bg-white rounded-2xl border shadow-md p-4 md:p-5 relative"
              style={{ borderColor: COLORS.border }}
            >
              <div className="flex items-start gap-3">
                <UserCheck size={22} style={{ color: COLORS.accent, flexShrink: 0 }} />
                <div className="flex-1">
                  <h4 className="font-semibold text-base" style={{ color: COLORS.text }}>
                    Gestor
                  </h4>
                  <p className="text-sm mt-2" style={{ color: COLORS.text, opacity: 0.8 }}>
                    Leitura + edição de configurações, recomendações e alertas
                  </p>
                </div>
              </div>
            </article>

            {/* Admin */}
            <article
              ref={adminRef}
              className="bg-white rounded-2xl border shadow-md p-4 md:p-5 relative"
              style={{ borderColor: COLORS.border }}
            >
              <div className="flex items-start gap-3">
                <Shield size={22} style={{ color: COLORS.accent, flexShrink: 0 }} />
                <div className="flex-1">
                  <h4 className="font-semibold text-base" style={{ color: COLORS.text }}>
                    Admin
                  </h4>
                  <p className="text-sm mt-2" style={{ color: COLORS.text, opacity: 0.8 }}>
                    Controle total: usuários, metadados, pipelines, logs
                  </p>
                </div>
              </div>
            </article>
          </div>

          {/* ========== COLUNA 2: API GATEWAY ========== */}
          <div className="space-y-5">
            <h3
              className="text-lg font-bold px-4 py-2 rounded-xl"
              style={{ backgroundColor: COLORS.laneHead, color: COLORS.headText }}
            >
              API Gateway
            </h3>

            {/* Gateway */}
            <article
              ref={gatewayRef}
              className="bg-white rounded-2xl border shadow-md p-4 md:p-5 relative"
              style={{ borderColor: COLORS.border }}
            >
              <div className="flex items-start gap-3">
                <DoorOpen size={22} style={{ color: COLORS.accent, flexShrink: 0 }} />
                <div className="flex-1">
                  <h4 className="font-semibold text-base mb-3" style={{ color: COLORS.text }}>
                    Gateway de Segurança
                  </h4>
                  <ul className="text-sm space-y-2" style={{ color: COLORS.text, opacity: 0.8 }}>
                    <li className="flex items-start gap-2">
                      <Lock size={16} className="mt-0.5" style={{ color: COLORS.accent }} />
                      <span>
                        <strong>Autenticação:</strong> OAuth 2.0, JWT
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Lock size={16} className="mt-0.5" style={{ color: COLORS.accent }} />
                      <span>
                        <strong>Rate limiting:</strong> 100 req/min (leitor), 500 req/min (gestor)
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Lock size={16} className="mt-0.5" style={{ color: COLORS.accent }} />
                      <span>
                        <strong>Versionamento:</strong> v1, v2 (beta)
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </article>

            {/* Nota de conformidade */}
            <div
              className="bg-white rounded-2xl border shadow-md p-4"
              style={{ borderColor: COLORS.border }}
            >
              <h4 className="font-semibold text-sm mb-2" style={{ color: COLORS.text }}>
                Conformidade LGPD
              </h4>
              <p className="text-xs" style={{ color: COLORS.text, opacity: 0.75 }}>
                • Minimização de dados<br />
                • Transparência e consentimento<br />
                • Logs auditáveis
              </p>
            </div>
          </div>

          {/* ========== COLUNA 3: SERVIÇOS ========== */}
          <div className="space-y-5">
            <h3
              className="text-lg font-bold px-4 py-2 rounded-xl"
              style={{ backgroundColor: COLORS.laneHead, color: COLORS.headText }}
            >
              Serviços
            </h3>

            {/* ETL/QA-QC */}
            <article
              ref={etlRef}
              className="bg-white rounded-2xl border shadow-md p-4 md:p-5 relative"
              style={{ borderColor: COLORS.border }}
            >
              <div className="flex items-start gap-3">
                <ServerCog size={22} style={{ color: COLORS.accent, flexShrink: 0 }} />
                <div className="flex-1">
                  <h4 className="font-semibold text-base" style={{ color: COLORS.text }}>
                    ETL/QA-QC
                  </h4>
                  <p className="text-sm mt-2" style={{ color: COLORS.text, opacity: 0.8 }}>
                    Ingestão, validação, transformação
                  </p>
                </div>
              </div>
            </article>

            {/* ET₀ & BH */}
            <article
              ref={et0Ref}
              className="bg-white rounded-2xl border shadow-md p-4 md:p-5 relative"
              style={{ borderColor: COLORS.border }}
            >
              <div className="flex items-start gap-3">
                <ServerCog size={22} style={{ color: COLORS.accent, flexShrink: 0 }} />
                <div className="flex-1">
                  <h4 className="font-semibold text-base" style={{ color: COLORS.text }}>
                    ET₀ & BH
                  </h4>
                  <p className="text-sm mt-2" style={{ color: COLORS.text, opacity: 0.8 }}>
                    Cálculo de indicadores agrometeorológicos
                  </p>
                </div>
              </div>
            </article>

            {/* DSS/Alertas */}
            <article
              ref={dssRef}
              className="bg-white rounded-2xl border shadow-md p-4 md:p-5 relative"
              style={{ borderColor: COLORS.border }}
            >
              <div className="flex items-start gap-3">
                <ServerCog size={22} style={{ color: COLORS.accent, flexShrink: 0 }} />
                <div className="flex-1">
                  <h4 className="font-semibold text-base" style={{ color: COLORS.text }}>
                    DSS/Alertas
                  </h4>
                  <p className="text-sm mt-2" style={{ color: COLORS.text, opacity: 0.8 }}>
                    Decisões de irrigação, notificações
                  </p>
                </div>
              </div>
            </article>
          </div>

          {/* ========== COLUNA 4: BANCO DE DADOS ========== */}
          <div className="space-y-5">
            <h3
              className="text-lg font-bold px-4 py-2 rounded-xl"
              style={{ backgroundColor: COLORS.laneHead, color: COLORS.headText }}
            >
              Banco de Dados
            </h3>

            {/* Banco com RLS */}
            <article
              ref={dbRef}
              className="bg-white rounded-2xl border shadow-md p-4 md:p-5 relative"
              style={{ borderColor: COLORS.border }}
            >
              <div className="flex items-start gap-3">
                <Database size={22} style={{ color: COLORS.accent, flexShrink: 0 }} />
                <div className="flex-1">
                  <h4 className="font-semibold text-base mb-3" style={{ color: COLORS.text }}>
                    Timeseries + RLS
                  </h4>
                  <p className="text-sm mb-3" style={{ color: COLORS.text, opacity: 0.8 }}>
                    Row-Level Security (RLS) garante acesso granular por papel
                  </p>
                  <div className="space-y-2 text-xs" style={{ color: COLORS.text, opacity: 0.75 }}>
                    <div className="flex items-center gap-2">
                      <Shield size={14} style={{ color: COLORS.accent }} />
                      <span>Políticas por schema</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield size={14} style={{ color: COLORS.accent }} />
                      <span>Criptografia em repouso (AES-256)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield size={14} style={{ color: COLORS.accent }} />
                      <span>Backup incremental diário</span>
                    </div>
                  </div>
                </div>
              </div>
            </article>

            {/* Auditoria */}
            <div
              className="bg-white rounded-2xl border shadow-md p-4"
              style={{ borderColor: COLORS.border }}
            >
              <h4 className="font-semibold text-sm mb-2" style={{ color: COLORS.text }}>
                Auditoria
              </h4>
              <p className="text-xs" style={{ color: COLORS.text, opacity: 0.75 }}>
                • Logs de acesso (quem, quando, o quê)<br />
                • Trilha de alterações (audit trail)<br />
                • Retenção: 1 ano (operacional), 7 anos (compliance)
              </p>
            </div>
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

          {/* Usuários → Gateway */}
          {pathLeitorToGW && (
            <path
              d={pathLeitorToGW}
              stroke={COLORS.accent}
              strokeWidth={2.5}
              fill="none"
              markerEnd="url(#arrowHead)"
            >
              <title>Leitor → Gateway</title>
            </path>
          )}
          {pathGestorToGW && (
            <path
              d={pathGestorToGW}
              stroke={COLORS.accent}
              strokeWidth={2.5}
              fill="none"
              markerEnd="url(#arrowHead)"
            >
              <title>Gestor → Gateway</title>
            </path>
          )}
          {pathAdminToGW && (
            <path
              d={pathAdminToGW}
              stroke={COLORS.accent}
              strokeWidth={2.5}
              fill="none"
              markerEnd="url(#arrowHead)"
            >
              <title>Admin → Gateway</title>
            </path>
          )}

          {/* Gateway → Serviços */}
          {pathGWToETL && (
            <path
              d={pathGWToETL}
              stroke={COLORS.accent}
              strokeWidth={2.5}
              fill="none"
              markerEnd="url(#arrowHead)"
            >
              <title>Gateway → ETL</title>
            </path>
          )}
          {pathGWToET0 && (
            <path
              d={pathGWToET0}
              stroke={COLORS.accent}
              strokeWidth={2.5}
              fill="none"
              markerEnd="url(#arrowHead)"
            >
              <title>Gateway → ET₀ & BH</title>
            </path>
          )}
          {pathGWToDSS && (
            <path
              d={pathGWToDSS}
              stroke={COLORS.accent}
              strokeWidth={2.5}
              fill="none"
              markerEnd="url(#arrowHead)"
            >
              <title>Gateway → DSS</title>
            </path>
          )}

          {/* Serviços → Banco */}
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
          {pathET0ToDB && (
            <path
              d={pathET0ToDB}
              stroke={COLORS.accent}
              strokeWidth={2.5}
              fill="none"
              markerEnd="url(#arrowHead)"
            >
              <title>ET₀ & BH → Banco</title>
            </path>
          )}
          {pathDSSToDB && (
            <path
              d={pathDSSToDB}
              stroke={COLORS.accent}
              strokeWidth={2.5}
              fill="none"
              markerEnd="url(#arrowHead)"
            >
              <title>DSS → Banco</title>
            </path>
          )}
        </svg>
      </div>

      {/* Rodapé */}
      <div className="max-w-7xl mx-auto mt-8">
        <p className="text-xs text-center" style={{ color: COLORS.text, opacity: 0.6 }}>
          LGPD: minimização e transparência | Logs auditáveis | RLS para acesso granular
        </p>
      </div>
    </section>
  );
}
