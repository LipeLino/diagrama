"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Sun,
  Thermometer,
  Droplets,
  Wind,
  CloudRain,
  Database,
  BarChart3,
} from "lucide-react";

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
  const data = `<?xml version="1.0" encoding="UTF-8"?>\n${ser.serializeToString(
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

export default function Figure02_Encadeamento(): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const rsRef = useRef<HTMLElement | null>(null);
  const tRef = useRef<HTMLElement | null>(null);
  const urRef = useRef<HTMLElement | null>(null);
  const u2Ref = useRef<HTMLElement | null>(null);
  const pRef = useRef<HTMLElement | null>(null);
  const pcpRef = useRef<HTMLElement | null>(null);
  const sRef = useRef<HTMLElement | null>(null);

  const et0Ref = useRef<HTMLElement | null>(null);
  const gddRef = useRef<HTMLElement | null>(null);
  const bhRef = useRef<HTMLElement | null>(null);

  const d1Ref = useRef<HTMLElement | null>(null);
  const d2Ref = useRef<HTMLElement | null>(null);
  const d3Ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    _containerEl = containerRef.current;
    return () => {
      _containerEl = null;
    };
  }, []);

  useRerouteOnResize([
    containerRef,
    rsRef,
    tRef,
    urRef,
    u2Ref,
    pRef,
    pcpRef,
    sRef,
    et0Ref,
    gddRef,
    bhRef,
    d1Ref,
    d2Ref,
    d3Ref,
  ]);

  // Connections (paths)
  const d_rs_et0 = useConnector(rsRef, et0Ref, { offset: 0 });
  const d_t_et0 = useConnector(tRef, et0Ref, { offset: 8 });
  const d_ur_et0 = useConnector(urRef, et0Ref, { offset: 16 });
  const d_u2_et0 = useConnector(u2Ref, et0Ref, { offset: 24 });
  const d_p_et0 = useConnector(pRef, et0Ref, { offset: 32 });

  const d_t_gdd = useConnector(tRef, gddRef, { offset: 0 });

  const d_pcp_bh = useConnector(pcpRef, bhRef, { offset: -8 });
  const d_et0_bh = useConnector(et0Ref, bhRef, { offset: 0 });
  const d_s_bh = useConnector(sRef, bhRef, { offset: 8 });

  const d_et0_d1 = useConnector(et0Ref, d1Ref, { offset: -6 });
  const d_bh_d1 = useConnector(bhRef, d1Ref, { offset: 6 });

  const d_gdd_d2 = useConnector(gddRef, d2Ref, { offset: 0 });
  const d_gdd_d3 = useConnector(gddRef, d3Ref, { offset: -6 });
  const d_bh_d3 = useConnector(bhRef, d3Ref, { offset: 6 });

  return (
    <section
      aria-label="Figura 2 – Variáveis → Indicadores → Decisão"
      className="relative"
    >
      <div className="flex items-start justify-between mb-4">
        <h2 className="text-xl font-bold text-[#0f2747]">Figura 2 — Encadeamento: Variáveis → Indicadores → Decisão</h2>
        <div className="flex gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-[#dde8f3] bg-white px-3 py-2 text-sm font-medium shadow-sm hover:shadow transition"
            onClick={() => exportAsSVG(svgRef, "Figura02_Encadeamento")}
            aria-label="Exportar diagrama SVG"
          >
            Exportar SVG
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-[#dde8f3] bg-white px-3 py-2 text-sm font-medium shadow-sm hover:shadow transition"
            onClick={() => exportAsPDF(svgRef, "Figura02_Encadeamento")}
            aria-label="Exportar diagrama PDF"
          >
            Exportar PDF
          </button>
        </div>
      </div>

      <div ref={containerRef} className="relative">
        {/* SVG overlay for connectors */}
        <svg
          ref={svgRef}
          className="absolute inset-0 overflow-visible pointer-events-none"
          role="img"
          aria-label="Conexões do diagrama"
        >
          <defs>
            <marker id="arrowHead" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
              <polygon points="0 0, 10 4, 0 8" fill={COLORS.accent} />
            </marker>
          </defs>

          {[
            { d: d_rs_et0, label: "Rs → ET₀" },
            { d: d_t_et0, label: "T/Tmax/Tmin → ET₀" },
            { d: d_ur_et0, label: "UR → ET₀" },
            { d: d_u2_et0, label: "u₂ → ET₀" },
            { d: d_p_et0, label: "P/z → ET₀" },
            { d: d_t_gdd, label: "T/Tmax/Tmin → GDD" },
            { d: d_pcp_bh, label: "Pcp → BH" },
            { d: d_et0_bh, label: "ET₀ → BH" },
            { d: d_s_bh, label: "S(ΔS) → BH" },
            { d: d_et0_d1, label: "ET₀ → D1" },
            { d: d_bh_d1, label: "BH → D1" },
            { d: d_gdd_d2, label: "GDD → D2" },
            { d: d_gdd_d3, label: "GDD → D3" },
            { d: d_bh_d3, label: "BH → D3" },
          ].map((p, i) => (
            p.d ? (
              <path
                key={i}
                d={p.d}
                stroke={COLORS.accent}
                strokeWidth={2.5}
                fill="none"
                markerEnd="url(#arrowHead)"
              >
                <title>{p.label}</title>
              </path>
            ) : null
          ))}
        </svg>

        {/* Grid columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
          {/* Coluna: Variáveis */}
          <div className="space-y-4">
            <div className="bg-[#cfe6ff] text-[#0f2747] font-bold rounded-2xl px-4 py-2" aria-hidden>
              Variáveis
            </div>

            <article ref={rsRef} className="bg-white rounded-2xl border border-[#dde8f3] shadow-md p-4 md:p-5 relative" role="group" aria-label="Radiação solar global — Rs (MJ m⁻² d⁻¹)">
              <header className="flex items-center gap-2 mb-2">
                <Sun className="w-5 h-5 text-[#2a7de1]" aria-hidden />
                <h3 className="text-[16px] font-semibold text-[#0e223d]">Radiação solar global — Rs (MJ m⁻² d⁻¹)</h3>
              </header>
              <p className="text-sm opacity-80">Entrada para balanço de energia e ET₀.</p>
            </article>

            <article ref={tRef} className="bg-white rounded-2xl border border-[#dde8f3] shadow-md p-4 md:p-5 relative" role="group" aria-label="Temperatura média/máx./mín. — T, Tmax, Tmin (°C)">
              <header className="flex items-center gap-2 mb-2">
                <Thermometer className="w-5 h-5 text-[#2a7de1]" aria-hidden />
                <h3 className="text-[16px] font-semibold text-[#0e223d]">Temperatura (média/máx./mín.) — T, Tmax, Tmin (°C)</h3>
              </header>
              <p className="text-sm opacity-80">Afeta ET₀ e o acúmulo térmico (GDD).</p>
            </article>

            <article ref={urRef} className="bg-white rounded-2xl border border-[#dde8f3] shadow-md p-4 md:p-5 relative" role="group" aria-label="Umidade relativa — UR (%)">
              <header className="flex items-center gap-2 mb-2">
                <Droplets className="w-5 h-5 text-[#2a7de1]" aria-hidden />
                <h3 className="text-[16px] font-semibold text-[#0e223d]">Umidade relativa — UR (%)</h3>
              </header>
              <p className="text-sm opacity-80">Usada no termo aerodinâmico/psicométrico de ET₀.</p>
            </article>

            <article ref={u2Ref} className="bg-white rounded-2xl border border-[#dde8f3] shadow-md p-4 md:p-5 relative" role="group" aria-label="Vento a 2 m — u₂ (m s⁻¹)">
              <header className="flex items-center gap-2 mb-2">
                <Wind className="w-5 h-5 text-[#2a7de1]" aria-hidden />
                <h3 className="text-[16px] font-semibold text-[#0e223d]">Vento a 2 m — u₂ (m s⁻¹)</h3>
              </header>
              <p className="text-sm opacity-80">Influencia a transferência de massa em ET₀.</p>
            </article>

            <article ref={pRef} className="bg-white rounded-2xl border border-[#dde8f3] shadow-md p-4 md:p-5 relative" role="group" aria-label="Pressão atmosférica / altitude — P (kPa) / z (m)">
              <header className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-5 h-5 text-[#2a7de1]" aria-hidden />
                <h3 className="text-[16px] font-semibold text-[#0e223d]">Pressão atmosférica (ou altitude) — P (kPa) / z (m)</h3>
              </header>
              <p className="text-sm opacity-80">Define γ (psicrométrica) para ET₀.</p>
            </article>

            <article ref={pcpRef} className="bg-white rounded-2xl border border-[#dde8f3] shadow-md p-4 md:p-5 relative" role="group" aria-label="Precipitação observada — Pcp (mm)">
              <header className="flex items-center gap-2 mb-2">
                <CloudRain className="w-5 h-5 text-[#2a7de1]" aria-hidden />
                <h3 className="text-[16px] font-semibold text-[#0e223d]">Precipitação observada — Pcp (mm)</h3>
              </header>
              <p className="text-sm opacity-80">Componente de entrada do balanço hídrico.</p>
            </article>

            <article ref={sRef} className="bg-white rounded-2xl border border-[#dde8f3] shadow-md p-4 md:p-5 relative" role="group" aria-label="Armazenamento de água no solo — S (mm)">
              <header className="flex items-center gap-2 mb-2">
                <Database className="w-5 h-5 text-[#2a7de1]" aria-hidden />
                <h3 className="text-[16px] font-semibold text-[#0e223d]">Armazenamento de água no solo — S (mm)</h3>
              </header>
              <p className="text-sm opacity-80">Contribui como ΔS no balanço hídrico.</p>
            </article>
          </div>

          {/* Coluna: Indicadores */}
          <div className="space-y-4">
            <div className="bg-[#cfe6ff] text-[#0f2747] font-bold rounded-2xl px-4 py-2" aria-hidden>
              Indicadores
            </div>

            <article ref={et0Ref} className="bg-white rounded-2xl border border-[#dde8f3] shadow-md p-4 md:p-5 relative" aria-label="ET₀ (mm d⁻¹) — Penman–Monteith FAO-56" role="group">
              <header className="mb-2">
                <h3 className="text-[17px] font-semibold text-[#0e223d]">ET₀ (mm d⁻¹)</h3>
                <p className="text-sm opacity-80">Penman–Monteith FAO-56</p>
              </header>
              <p className="text-sm">Uso em irrigação e balanço hídrico.</p>
            </article>

            <article ref={gddRef} className="bg-white rounded-2xl border border-[#dde8f3] shadow-md p-4 md:p-5 relative" aria-label="GDD (°C·d) — Σ[(Tmax + Tmin)/2 − Tbase]" role="group">
              <header className="mb-2">
                <h3 className="text-[17px] font-semibold text-[#0e223d]">GDD (°C·d)</h3>
                <p className="text-sm opacity-80">Σ[(Tmax + Tmin)/2 − Tbase]</p>
              </header>
              <p className="text-sm">Indicador fenológico (acúmulo térmico).</p>
            </article>

            <article ref={bhRef} className="bg-white rounded-2xl border border-[#dde8f3] shadow-md p-4 md:p-5 relative" aria-label="Balanço hídrico — BH (mm) = Pcp − ET₀ ± ΔS" role="group">
              <header className="mb-2">
                <h3 className="text-[17px] font-semibold text-[#0e223d]">Balanço hídrico — BH (mm)</h3>
                <p className="text-sm opacity-80">BH = Pcp − ET₀ ± ΔS</p>
              </header>
              <p className="text-sm">Estado hídrico do sistema solo-planta.</p>
            </article>
          </div>

          {/* Coluna: Decisões */}
          <div className="space-y-4">
            <div className="bg-[#cfe6ff] text-[#0f2747] font-bold rounded-2xl px-4 py-2" aria-hidden>
              Decisões
            </div>

            <article ref={d1Ref} className="bg-white rounded-2xl border border-[#dde8f3] shadow-md p-4 md:p-5 relative" aria-label="D1 — Decisão de irrigação" role="group">
              <header className="mb-2">
                <h3 className="text-[17px] font-semibold text-[#0e223d]">D1 — Decisão de irrigação</h3>
                <p className="text-sm opacity-80">Lâmina; Momento; Déficit</p>
              </header>
            </article>

            <article ref={d2Ref} className="bg-white rounded-2xl border border-[#dde8f3] shadow-md p-4 md:p-5 relative" aria-label="D2 — Manejo fitossanitário" role="group">
              <header className="mb-2">
                <h3 className="text-[17px] font-semibold text-[#0e223d]">D2 — Manejo fitossanitário</h3>
                <p className="text-sm opacity-80">Risco; Janela térmica; Vento</p>
              </header>
            </article>

            <article ref={d3Ref} className="bg-white rounded-2xl border border-[#dde8f3] shadow-md p-4 md:p-5 relative" aria-label="D3 — Planejamento operacional" role="group">
              <header className="mb-2">
                <h3 className="text-[17px] font-semibold text-[#0e223d]">D3 — Planejamento operacional</h3>
                <p className="text-sm opacity-80">Colheita; Risco de chuva; GDD</p>
              </header>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}





