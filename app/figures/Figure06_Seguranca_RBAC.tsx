"use client";

import React, { useEffect, useRef, useState } from "react";
import { User, UserCheck, Shield, DoorOpen, ServerCog, Database } from "lucide-react";

const COLORS = {
  bg: "#f7fbff",
  laneHead: "#cfe6ff",
  headText: "#0f2747",
  cardBG: "#e9f5ff",
  border: "#dde8f3",
  text: "#0e223d",
  accent: "#2a7de1",
  accent2: "#0ea5e9",
} as const;

type RefEl = React.RefObject<Element | null>;

let _containerEl: HTMLElement | null = null;

function useRerouteOnResize(refs: Array<React.RefObject<Element | null>> = []) {
  useEffect(() => {
    const raf = (fn: () => void) => requestAnimationFrame(fn);
    const handle = () => raf(() => {});
    const ro = new ResizeObserver(() => handle());
    refs.forEach((r) => r.current && ro.observe(r.current));
    window.addEventListener("resize", handle);
    window.addEventListener("scroll", handle, true);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", handle);
      window.removeEventListener("scroll", handle, true);
    };
  }, [refs]);
}

function useConnector(
  fromRef: RefEl,
  toRef: RefEl,
  { curv = 0.3, offset = 0 }: { curv?: number; offset?: number } = {}
) {
  const [d, setD] = useState("");
  useEffect(() => {
    let frame: number | null = null;
    const recalc = () => {
      if (!fromRef.current || !toRef.current || !_containerEl) {
        setD("");
        return;
      }
      const c = _containerEl.getBoundingClientRect();
      const a = fromRef.current.getBoundingClientRect();
      const b = toRef.current.getBoundingClientRect();
      const x1 = a.left + a.width - c.left;
      const y1 = a.top + a.height / 2 - c.top + offset;
      const x2 = b.left - c.left;
      const y2 = b.top + b.height / 2 - c.top + offset;
      const dx = x2 - x1;
      const k = Math.max(24, curv * Math.abs(dx));
      const path = `M ${x1} ${y1} C ${x1 + k} ${y1}, ${x2 - k} ${y2}, ${x2} ${y2}`;
      setD(path);
    };
    const rafRecalc = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(recalc);
    };
    recalc();
    const ro = new ResizeObserver(rafRecalc);
    if (fromRef.current) ro.observe(fromRef.current);
    if (toRef.current) ro.observe(toRef.current);
    if (_containerEl) ro.observe(_containerEl);
    window.addEventListener("resize", rafRecalc);
    window.addEventListener("scroll", rafRecalc, true);
    return () => {
      ro.disconnect();
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("resize", rafRecalc);
      window.removeEventListener("scroll", rafRecalc, true);
    };
  }, [fromRef, toRef, curv, offset]);
  return d;
}

function exportAsSVG(svgRef: React.RefObject<SVGSVGElement | null>, fileName: string) {
  const svg = svgRef.current;
  if (!svg) return;
  const rect = svg.getBoundingClientRect();
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(rect.width));
  clone.setAttribute("height", String(rect.height));
  if (!clone.getAttribute("viewBox")) {
    clone.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
  }
  const ser = new XMLSerializer();
  const data = `<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n${ser.serializeToString(
    clone
  )}`;
  const blob = new Blob([data], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName}.svg`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function exportAsPDF(svgRef: React.RefObject<SVGSVGElement | null>, fileName: string) {
  const svg = svgRef.current;
  if (!svg) return;
  const rect = svg.getBoundingClientRect();
  const { default: jsPDF } = await import("jspdf");
  const mod: any = await import("svg2pdf.js");
  const svg2pdf = mod.default || mod.svg2pdf;
  const doc = new jsPDF({
    orientation: rect.width >= rect.height ? "l" : "p",
    unit: "pt",
    format: [rect.width, rect.height],
  });
  const clone = svg.cloneNode(true) as SVGSVGElement;
  await svg2pdf(clone, doc, { x: 0, y: 0, width: rect.width, height: rect.height });
  doc.save(`${fileName}.pdf`);
}

export default function Figure06_Seguranca_RBAC(): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const leitorRef = useRef<HTMLElement | null>(null);
  const gestorRef = useRef<HTMLElement | null>(null);
  const adminRef = useRef<HTMLElement | null>(null);
  const gwRef = useRef<HTMLElement | null>(null);
  const etlRef = useRef<HTMLElement | null>(null);
  const et0bhRef = useRef<HTMLElement | null>(null);
  const dssRef = useRef<HTMLElement | null>(null);
  const dbRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    _containerEl = containerRef.current;
    return () => {
      _containerEl = null;
    };
  }, []);

  useRerouteOnResize([
    containerRef,
    leitorRef,
    gestorRef,
    adminRef,
    gwRef,
    etlRef,
    et0bhRef,
    dssRef,
    dbRef,
  ]);

  // Conectores
  const d_leitor_gw = useConnector(leitorRef, gwRef, { offset: -12 });
  const d_gestor_gw = useConnector(gestorRef, gwRef, { offset: 0 });
  const d_admin_gw = useConnector(adminRef, gwRef, { offset: 12 });

  const d_gw_etl = useConnector(gwRef, etlRef, { offset: -12 });
  const d_gw_et0bh = useConnector(gwRef, et0bhRef, { offset: 0 });
  const d_gw_dss = useConnector(gwRef, dssRef, { offset: 12 });

  const d_etl_db = useConnector(etlRef, dbRef, { offset: -8 });
  const d_et0bh_db = useConnector(et0bhRef, dbRef, { offset: 0 });
  const d_dss_db = useConnector(dssRef, dbRef, { offset: 8 });

  return (
    <section aria-label="Figura 6 – Camadas de segurança e RBAC" className="relative">
      <div className="flex items-start justify-between mb-4">
        <h2 className="text-xl font-bold text-[#0f2747]">Figura 6 — Segurança: RBAC, API Gateway e RLS</h2>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg border border-[#dde8f3] bg-white px-3 py-2 text-sm font-medium shadow-sm hover:shadow transition" onClick={() => exportAsSVG(svgRef, "Figura06_Seguranca_RBAC")} aria-label="Exportar diagrama SVG">Exportar SVG</button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-[#dde8f3] bg-white px-3 py-2 text-sm font-medium shadow-sm hover:shadow transition" onClick={() => exportAsPDF(svgRef, "Figura06_Seguranca_RBAC")} aria-label="Exportar diagrama PDF">Exportar PDF</button>
        </div>
      </div>

      <div ref={containerRef} className="relative">
        <svg ref={svgRef} className="absolute inset-0 overflow-visible pointer-events-none" role="img" aria-label="Conexões de segurança">
          <defs>
            <marker id="arrowHead" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
              <polygon points="0 0, 10 4, 0 8" fill={COLORS.accent} />
            </marker>
          </defs>

          {[
            { d: d_leitor_gw, label: "Leitor → API Gateway" },
            { d: d_gestor_gw, label: "Gestor → API Gateway" },
            { d: d_admin_gw, label: "Admin → API Gateway" },
            { d: d_gw_etl, label: "Gateway → ETL/QA-QC" },
            { d: d_gw_et0bh, label: "Gateway → ET₀ & BH" },
            { d: d_gw_dss, label: "Gateway → DSS/Alertas" },
            { d: d_etl_db, label: "ETL/QA-QC → Banco" },
            { d: d_et0bh_db, label: "ET₀ & BH → Banco" },
            { d: d_dss_db, label: "DSS/Alertas → Banco" },
          ].map((p, i) =>
            p.d ? (
              <path key={i} d={p.d} stroke={COLORS.accent} strokeWidth={2.5} fill="none" markerEnd="url(#arrowHead)">
                <title>{p.label}</title>
              </path>
            ) : null
          )}

          {/* Escudos próximos ao Gateway (decorativo) */}
          {(() => {
            if (!gwRef.current || !_containerEl) return null;
            const c = _containerEl.getBoundingClientRect();
            const g = gwRef.current.getBoundingClientRect();
            const baseX = g.left - c.left - 18;
            const midY = g.top - c.top + g.height / 2;
            const shields = [midY - 18, midY, midY + 18];
            return (
              <g fill={COLORS.accent} opacity={0.8}>
                {shields.map((y, i) => (
                  <path
                    key={i}
                    d={`M ${baseX} ${y} l 8 0 l 0 8 l -4 6 l -4 -6 z`}
                  />
                ))}
              </g>
            );
          })()}
        </svg>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-7">
          {/* Papéis */}
          <div className="space-y-4">
            <div className="bg-[#cfe6ff] text-[#0f2747] font-bold rounded-2xl px-4 py-2" aria-hidden>Usuários / Papéis</div>
            <article ref={leitorRef} className="bg-white rounded-2xl border border-[#dde8f3] shadow-md p-5" role="group" aria-label="Leitor">
              <header className="flex items-center gap-2 mb-2"><User className="w-5 h-5 text-[#2a7de1]" aria-hidden /><h3 className="text-[17px] font-semibold text-[#0e223d]">Leitor</h3></header>
            </article>
            <article ref={gestorRef} className="bg-white rounded-2xl border border-[#dde8f3] shadow-md p-5" role="group" aria-label="Gestor">
              <header className="flex items-center gap-2 mb-2"><UserCheck className="w-5 h-5 text-[#2a7de1]" aria-hidden /><h3 className="text-[17px] font-semibold text-[#0e223d]">Gestor</h3></header>
            </article>
            <article ref={adminRef} className="bg-white rounded-2xl border border-[#dde8f3] shadow-md p-5" role="group" aria-label="Admin">
              <header className="flex items-center gap-2 mb-2"><Shield className="w-5 h-5 text-[#2a7de1]" aria-hidden /><h3 className="text-[17px] font-semibold text-[#0e223d]">Admin</h3></header>
            </article>
          </div>

          {/* API Gateway */}
          <div className="space-y-4">
            <div className="bg-[#cfe6ff] text-[#0f2747] font-bold rounded-2xl px-4 py-2" aria-hidden>API Gateway</div>
            <article ref={gwRef} className="bg-white rounded-2xl border border-[#dde8f3] shadow-md p-5" role="group" aria-label="API Gateway">
              <header className="flex items-center gap-2 mb-2">
                <DoorOpen className="w-5 h-5 text-[#2a7de1]" aria-hidden />
                <h3 className="text-[17px] font-semibold text-[#0e223d]">Gateway</h3>
              </header>
              <p className="text-sm opacity-80">Auth; Rate limit; Versionamento</p>
            </article>
          </div>

          {/* Serviços */}
          <div className="space-y-4">
            <div className="bg-[#cfe6ff] text-[#0f2747] font-bold rounded-2xl px-4 py-2" aria-hidden>Serviços</div>
            <article ref={etlRef} className="bg-white rounded-2xl border border-[#dde8f3] shadow-md p-5" role="group" aria-label="ETL/QA-QC">
              <header className="flex items-center gap-2 mb-2"><ServerCog className="w-5 h-5 text-[#2a7de1]" aria-hidden /><h3 className="text-[17px] font-semibold text-[#0e223d]">ETL / QA‑QC</h3></header>
            </article>
            <article ref={et0bhRef} className="bg-white rounded-2xl border border-[#dde8f3] shadow-md p-5" role="group" aria-label="ET₀ & BH">
              <header className="flex items-center gap-2 mb-2"><ServerCog className="w-5 h-5 text-[#2a7de1]" aria-hidden /><h3 className="text-[17px] font-semibold text-[#0e223d]">ET₀ &amp; BH</h3></header>
            </article>
            <article ref={dssRef} className="bg-white rounded-2xl border border-[#dde8f3] shadow-md p-5" role="group" aria-label="DSS/Alertas">
              <header className="flex items-center gap-2 mb-2"><ServerCog className="w-5 h-5 text-[#2a7de1]" aria-hidden /><h3 className="text-[17px] font-semibold text-[#0e223d]">DSS / Alertas</h3></header>
            </article>
          </div>

          {/* Banco de dados */}
          <div className="space-y-4">
            <div className="bg-[#cfe6ff] text-[#0f2747] font-bold rounded-2xl px-4 py-2" aria-hidden>Banco de dados</div>
            <article ref={dbRef} className="bg-white rounded-2xl border border-[#dde8f3] shadow-md p-5" role="group" aria-label="Timeseries + RLS (Row-Level Security)">
              <header className="flex items-center gap-2 mb-2">
                <Database className="w-5 h-5 text-[#2a7de1]" aria-hidden />
                <h3 className="text-[17px] font-semibold text-[#0e223d]">Timeseries + RLS</h3>
              </header>
              <p className="text-sm opacity-80">Row‑Level Security (RLS)</p>
            </article>
          </div>
        </div>

        <div className="mt-3 text-xs opacity-70 space-y-1">
          <div>LGPD: minimização e transparência</div>
          <div>Logs auditáveis</div>
        </div>
      </div>
    </section>
  );
}





