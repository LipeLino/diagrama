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

export default function Figure05_WalkForward_MLOps(): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const trainRef = useRef<HTMLElement | null>(null);
  const valRef = useRef<HTMLElement | null>(null);
  const testRef = useRef<HTMLElement | null>(null);
  const monitorRef = useRef<HTMLElement | null>(null);
  const retrainRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    _containerEl = containerRef.current;
    return () => {
      _containerEl = null;
    };
  }, []);

  useRerouteOnResize([containerRef, trainRef, valRef, testRef, monitorRef, retrainRef]);

  const d_train_val = useConnector(trainRef, valRef, { offset: 0 });
  const d_val_test = useConnector(valRef, testRef, { offset: 0 });
  const d_test_monitor = useConnector(testRef, monitorRef, { offset: 0 });
  const d_monitor_retrain = useConnector(monitorRef, retrainRef, { offset: 0 });
  const d_retrain_train = useConnector(retrainRef, trainRef, { offset: 10 });

  return (
    <section aria-label="Figura 5 – Walk-forward, monitoração e drift" className="relative">
      <div className="flex items-start justify-between mb-4">
        <h2 className="text-xl font-bold text-[#0f2747]">Figura 5 — Walk‑forward, monitoração e drift</h2>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg border border-[#dde8f3] bg-white px-3 py-2 text-sm font-medium shadow-sm hover:shadow transition" onClick={() => exportAsSVG(svgRef, "Figura05_WalkForward_MLOps")} aria-label="Exportar diagrama SVG">Exportar SVG</button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-[#dde8f3] bg-white px-3 py-2 text-sm font-medium shadow-sm hover:shadow transition" onClick={() => exportAsPDF(svgRef, "Figura05_WalkForward_MLOps")} aria-label="Exportar diagrama PDF">Exportar PDF</button>
        </div>
      </div>

      <div ref={containerRef} className="relative">
        <svg ref={svgRef} className="absolute inset-0 overflow-visible pointer-events-none" role="img" aria-label="Conexões walk-forward">
          <defs>
            <marker id="arrowHead" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
              <polygon points="0 0, 10 4, 0 8" fill={COLORS.accent} />
            </marker>
            <marker id="arrowHead2" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
              <polygon points="0 0, 10 4, 0 8" fill={COLORS.accent2} />
            </marker>
          </defs>

          {/* Eixo temporal */}
          {(() => {
            if (!_containerEl) return null;
            const c = _containerEl.getBoundingClientRect();
            const midY = (c.height || 200) * 0.8; // near bottom
            return (
              <line x1={16} y1={midY} x2={c.width - 16} y2={midY} stroke="#a3b8cc" strokeWidth={1.5} />
            );
          })()}

          {[
            { d: d_train_val, label: "Train → Validation", color: COLORS.accent, dash: "" },
            { d: d_val_test, label: "Validation → Test", color: COLORS.accent, dash: "" },
            { d: d_test_monitor, label: "Model vX (deploy) → Monitoração", color: COLORS.accent, dash: "" },
            { d: d_monitor_retrain, label: "Monitoração → Retreinamento", color: COLORS.accent2, dash: "" },
            { d: d_retrain_train, label: "Retreinamento → Train", color: COLORS.accent2, dash: "6 4" },
          ].map((p, i) =>
            p.d ? (
              <path
                key={i}
                d={p.d}
                stroke={p.color}
                strokeWidth={2.5}
                fill="none"
                markerEnd={p.color === COLORS.accent2 ? "url(#arrowHead2)" : "url(#arrowHead)"}
                strokeDasharray={p.dash}
              >
                <title>{p.label}</title>
              </path>
            ) : null
          )}

          {/* Alarmes de drift (diamantes) próximos à monitoração */}
          {(() => {
            if (!monitorRef.current || !_containerEl) return null;
            const c = _containerEl.getBoundingClientRect();
            const m = monitorRef.current.getBoundingClientRect();
            const x = m.left - c.left + m.width / 2 + 30;
            const y = m.top - c.top + m.height / 2;
            const size = 7;
            const points = `${x} ${y - size}, ${x + size} ${y}, ${x} ${y + size}, ${x - size} ${y}`;
            return <polygon points={points} fill="#ef4444" opacity={0.8} />;
          })()}
        </svg>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
          <div className="space-y-4">
            <article ref={trainRef} className="bg-white rounded-2xl border border-[#dde8f3] shadow-md p-5" role="group" aria-label="Bloco Train">
              <h3 className="text-[17px] font-semibold text-[#0e223d]">Train</h3>
              <p className="text-sm opacity-80">Janela deslizante (walk-forward)</p>
            </article>
            <article ref={monitorRef} className="bg-white rounded-2xl border border-[#dde8f3] shadow-md p-5" role="group" aria-label="Monitoração">
              <h3 className="text-[17px] font-semibold text-[#0e223d]">Monitoração</h3>
              <p className="text-sm opacity-80">RMSE/MAE; confiabilidade/Brier</p>
            </article>
          </div>

          <div className="space-y-4">
            <article ref={valRef} className="bg-white rounded-2xl border border-[#dde8f3] shadow-md p-5" role="group" aria-label="Validation">
              <h3 className="text-[17px] font-semibold text-[#0e223d]">Validation</h3>
            </article>
            <article ref={retrainRef} className="bg-white rounded-2xl border border-[#dde8f3] shadow-md p-5" role="group" aria-label="Retreinamento">
              <h3 className="text-[17px] font-semibold text-[#0e223d]">Retreinamento</h3>
              <p className="text-sm opacity-80">Ajuste/rollback seguro</p>
            </article>
          </div>

          <div className="space-y-4">
            <article ref={testRef} className="bg-white rounded-2xl border border-[#dde8f3] shadow-md p-5" role="group" aria-label="Test & Deploy">
              <h3 className="text-[17px] font-semibold text-[#0e223d]">Test</h3>
              <p className="text-sm opacity-80">Model vX (deploy)</p>
            </article>
            <div className="text-xs opacity-70">Legenda: walk‑forward; rollback seguro.</div>
          </div>
        </div>
      </div>
    </section>
  );
}





