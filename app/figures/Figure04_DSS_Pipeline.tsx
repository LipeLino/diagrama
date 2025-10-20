"use client";

import React, { useEffect, useRef, useState } from "react";

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

export default function Figure04_DSS_Pipeline(): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const ingestRef = useRef<HTMLElement | null>(null);
  const qaqcRef = useRef<HTMLElement | null>(null);
  const et0Ref = useRef<HTMLElement | null>(null);
  const bhRef = useRef<HTMLElement | null>(null);
  const recRef = useRef<HTMLElement | null>(null);
  const notifRef = useRef<HTMLElement | null>(null);
  const feedbackRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    _containerEl = containerRef.current;
    return () => {
      _containerEl = null;
    };
  }, []);

  useRerouteOnResize([
    containerRef,
    ingestRef,
    qaqcRef,
    et0Ref,
    bhRef,
    recRef,
    notifRef,
    feedbackRef,
  ]);

  const d_ing_qaqc = useConnector(ingestRef, qaqcRef, { offset: 0 });
  const d_qaqc_et0 = useConnector(qaqcRef, et0Ref, { offset: 0 });
  const d_et0_bh = useConnector(et0Ref, bhRef, { offset: 0 });
  const d_bh_rec = useConnector(bhRef, recRef, { offset: 0 });
  const d_rec_notif = useConnector(recRef, notifRef, { offset: 0 });
  const d_notif_feedback = useConnector(notifRef, feedbackRef, { offset: 0 });
  const d_feedback_ing = useConnector(feedbackRef, ingestRef, { offset: 8 });

  return (
    <section aria-label="Figura 4 – Pipeline DSS de Irrigação" className="relative">
      <div className="flex items-start justify-between mb-4">
        <h2 className="text-xl font-bold text-[#0f2747]">Figura 4 — Pipeline DSS de Irrigação</h2>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg border border-[#dde8f3] bg-white px-3 py-2 text-sm font-medium shadow-sm hover:shadow transition" onClick={() => exportAsSVG(svgRef, "Figura04_DSS_Pipeline")} aria-label="Exportar diagrama SVG">Exportar SVG</button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-[#dde8f3] bg-white px-3 py-2 text-sm font-medium shadow-sm hover:shadow transition" onClick={() => exportAsPDF(svgRef, "Figura04_DSS_Pipeline")} aria-label="Exportar diagrama PDF">Exportar PDF</button>
        </div>
      </div>

      <div ref={containerRef} className="relative">
        <svg ref={svgRef} className="absolute inset-0 overflow-visible pointer-events-none" role="img" aria-label="Conexões do pipeline">
          <defs>
            <marker id="arrowHead" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
              <polygon points="0 0, 10 4, 0 8" fill={COLORS.accent} />
            </marker>
            <marker id="arrowHead2" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
              <polygon points="0 0, 10 4, 0 8" fill={COLORS.accent2} />
            </marker>
          </defs>

          {[
            { d: d_ing_qaqc, label: "Ingestão → QA/QC", color: COLORS.accent, dash: "" },
            { d: d_qaqc_et0, label: "QA/QC → Cálculo ET₀", color: COLORS.accent, dash: "" },
            { d: d_et0_bh, label: "ET₀ → Balanço hídrico", color: COLORS.accent, dash: "" },
            { d: d_bh_rec, label: "BH → Recomendação", color: COLORS.accent, dash: "" },
            { d: d_rec_notif, label: "Recomendação → Notificação", color: COLORS.accent, dash: "" },
            { d: d_notif_feedback, label: "Notificação → Feedback", color: COLORS.accent, dash: "" },
            { d: d_feedback_ing, label: "Feedback → Ingestão", color: COLORS.accent2, dash: "6 4", marker: "url(#arrowHead2)" },
          ].map((p, i) =>
            p.d ? (
              <path
                key={i}
                d={p.d}
                stroke={p.color}
                strokeWidth={2.5}
                fill="none"
                markerEnd={p.marker || "url(#arrowHead)"}
                strokeDasharray={p.dash}
              >
                <title>{p.label}</title>
              </path>
            ) : null
          )}

          {/* Pequenos diamantes (gates) ao redor de QA/QC */}
          {(() => {
            if (!ingestRef.current || !qaqcRef.current || !_containerEl) return null;
            const c = _containerEl.getBoundingClientRect();
            const a = ingestRef.current.getBoundingClientRect();
            const b = qaqcRef.current.getBoundingClientRect();
            const x = (a.right + b.left) / 2 - c.left;
            const y = a.top + a.height / 2 - c.top;
            const size = 7;
            const points = `${x} ${y - size}, ${x + size} ${y}, ${x} ${y + size}, ${x - size} ${y}`;
            return <polygon points={points} fill={COLORS.accent2} opacity={0.6} />;
          })()}
        </svg>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
          {/* Linha 1: Ingestão, QA/QC, Cálculo ET0 */}
          <div className="space-y-4">
            <article ref={ingestRef} className="bg-white rounded-2xl border border-[#dde8f3] shadow-md p-5" role="group" aria-label="Ingestão (streams, APIs)">
              <h3 className="text-[17px] font-semibold text-[#0e223d] mb-1">Ingestão</h3>
              <p className="text-sm opacity-80">Streams, APIs</p>
              <div className="mt-3 text-xs flex gap-2 opacity-80"><span className="rounded-full bg-[#e9f5ff] px-2 py-1 border border-[#dde8f3]">latência (ms/s)</span><span className="rounded-full bg-[#e9f5ff] px-2 py-1 border border-[#dde8f3]">disponibilidade (%)</span></div>
            </article>

            <article ref={et0Ref} className="bg-white rounded-2xl border border-[#dde8f3] shadow-md p-5" role="group" aria-label="Cálculo ET₀ (FAO-56)">
              <h3 className="text-[17px] font-semibold text-[#0e223d] mb-1">Cálculo ET₀</h3>
              <p className="text-sm opacity-80">FAO-56</p>
              <div className="mt-3 text-xs flex gap-2 opacity-80"><span className="rounded-full bg-[#e9f5ff] px-2 py-1 border border-[#dde8f3]">latência (ms/s)</span><span className="rounded-full bg-[#e9f5ff] px-2 py-1 border border-[#dde8f3]">disponibilidade (%)</span></div>
            </article>
          </div>

          <div className="space-y-4">
            <article ref={qaqcRef} className="bg-white rounded-2xl border border-[#dde8f3] shadow-md p-5" role="group" aria-label="QA/QC (limites, consistência, flags)">
              <h3 className="text-[17px] font-semibold text-[#0e223d] mb-1">QA/QC</h3>
              <p className="text-sm opacity-80">Limites, consistência, flags</p>
              <div className="mt-3 text-xs flex gap-2 opacity-80"><span className="rounded-full bg-[#e9f5ff] px-2 py-1 border border-[#dde8f3]">latência (ms/s)</span><span className="rounded-full bg-[#e9f5ff] px-2 py-1 border border-[#dde8f3]">disponibilidade (%)</span></div>
            </article>

            <article ref={bhRef} className="bg-white rounded-2xl border border-[#dde8f3] shadow-md p-5" role="group" aria-label="Balanço hídrico (Pcp − ET₀ ± ΔS)">
              <h3 className="text-[17px] font-semibold text-[#0e223d] mb-1">Balanço hídrico</h3>
              <p className="text-sm opacity-80">Pcp − ET₀ ± ΔS</p>
              <div className="mt-3 text-xs flex gap-2 opacity-80"><span className="rounded-full bg-[#e9f5ff] px-2 py-1 border border-[#dde8f3]">latência (ms/s)</span><span className="rounded-full bg-[#e9f5ff] px-2 py-1 border border-[#dde8f3]">disponibilidade (%)</span></div>
            </article>
          </div>

          <div className="space-y-4">
            <article ref={recRef} className="bg-white rounded-2xl border border-[#dde8f3] shadow-md p-5" role="group" aria-label="Recomendação (lâmina, janela)">
              <h3 className="text-[17px] font-semibold text-[#0e223d] mb-1">Recomendação</h3>
              <p className="text-sm opacity-80">Lâmina, janela</p>
              <div className="mt-3 text-xs flex gap-2 opacity-80"><span className="rounded-full bg-[#e9f5ff] px-2 py-1 border border-[#dde8f3]">latência (ms/s)</span><span className="rounded-full bg-[#e9f5ff] px-2 py-1 border border-[#dde8f3]">disponibilidade (%)</span></div>
            </article>

            <article ref={notifRef} className="bg-white rounded-2xl border border-[#dde8f3] shadow-md p-5" role="group" aria-label="Notificação (app/SMS/e-mail)">
              <h3 className="text-[17px] font-semibold text-[#0e223d] mb-1">Notificação</h3>
              <p className="text-sm opacity-80">app / SMS / e‑mail</p>
              <div className="mt-3 text-xs flex gap-2 opacity-80"><span className="rounded-full bg-[#e9f5ff] px-2 py-1 border border-[#dde8f3]">latência (ms/s)</span><span className="rounded-full bg-[#e9f5ff] px-2 py-1 border border-[#dde8f3]">disponibilidade (%)</span></div>
            </article>

            <article ref={feedbackRef} className="bg-white rounded-2xl border border-[#dde8f3] shadow-md p-5" role="group" aria-label="Feedback de campo">
              <h3 className="text-[17px] font-semibold text-[#0e223d] mb-1">Feedback de campo</h3>
              <p className="text-sm opacity-80">Fechamento do ciclo</p>
              <div className="mt-3 text-xs flex gap-2 opacity-80"><span className="rounded-full bg-[#e9f5ff] px-2 py-1 border border-[#dde8f3]">latência (ms/s)</span><span className="rounded-full bg-[#e9f5ff] px-2 py-1 border border-[#dde8f3]">disponibilidade (%)</span></div>
            </article>
          </div>
        </div>

        <p className="mt-3 text-xs opacity-70">ET₀ conforme FAO-56; métricas de disponibilidade/tempestividade inspiradas no WDQMS.</p>
      </div>
    </section>
  );
}





