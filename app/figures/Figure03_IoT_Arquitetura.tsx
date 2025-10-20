"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Sun,
  Thermometer,
  Droplets,
  Wind,
  CloudRain,
  Network,
  Settings2,
  Database,
  LayoutDashboard,
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

export default function Figure03_IoT_Arquitetura(): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Campo
  const sensoresRef = useRef<HTMLElement | null>(null);
  const nodeRef = useRef<HTMLElement | null>(null);

  // Conectividade
  const wifiRef = useRef<HTMLDivElement | null>(null);
  const lteRef = useRef<HTMLDivElement | null>(null);
  const loraRef = useRef<HTMLDivElement | null>(null);
  const satRef = useRef<HTMLDivElement | null>(null);

  // Plataforma
  const apiRef = useRef<HTMLElement | null>(null);
  const etlRef = useRef<HTMLElement | null>(null);
  const dbRef = useRef<HTMLElement | null>(null);
  const dashRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    _containerEl = containerRef.current;
    return () => {
      _containerEl = null;
    };
  }, []);

  useRerouteOnResize([
    containerRef,
    sensoresRef,
    nodeRef,
    wifiRef,
    lteRef,
    loraRef,
    satRef,
    apiRef,
    etlRef,
    dbRef,
    dashRef,
  ]);

  // Conexões
  const d_sens_node = useConnector(sensoresRef, nodeRef, { offset: 0 });
  const d_node_wifi = useConnector(nodeRef, wifiRef, { offset: -16 });
  const d_node_lte = useConnector(nodeRef, lteRef, { offset: 0 });
  const d_node_lora = useConnector(nodeRef, loraRef, { offset: 16 });
  const d_node_sat = useConnector(nodeRef, satRef, { offset: 32 });

  const d_wifi_api = useConnector(wifiRef, apiRef, { offset: -12 });
  const d_lte_api = useConnector(lteRef, apiRef, { offset: -4 });
  const d_lora_api = useConnector(loraRef, apiRef, { offset: 4 });
  const d_sat_api = useConnector(satRef, apiRef, { offset: 12 });

  const d_api_etl = useConnector(apiRef, etlRef, { offset: -10 });
  const d_api_db = useConnector(apiRef, dbRef, { offset: 0 });
  const d_api_dash = useConnector(apiRef, dashRef, { offset: 10 });

  return (
    <section aria-label="Figura 3 – Estação IoT → Plataforma" className="relative">
      <div className="flex items-start justify-between mb-4">
        <h2 className="text-xl font-bold text-[#0f2747]">Figura 3 — Arquitetura IoT: Campo → Conectividade → Plataforma</h2>
        <div className="flex gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-[#dde8f3] bg-white px-3 py-2 text-sm font-medium shadow-sm hover:shadow transition"
            onClick={() => exportAsSVG(svgRef, "Figura03_IoT_Arquitetura")}
            aria-label="Exportar diagrama SVG"
          >
            Exportar SVG
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-[#dde8f3] bg-white px-3 py-2 text-sm font-medium shadow-sm hover:shadow transition"
            onClick={() => exportAsPDF(svgRef, "Figura03_IoT_Arquitetura")}
            aria-label="Exportar diagrama PDF"
          >
            Exportar PDF
          </button>
        </div>
      </div>

      <div ref={containerRef} className="relative">
        {/* SVG connectors */}
        <svg ref={svgRef} className="absolute inset-0 overflow-visible pointer-events-none" role="img" aria-label="Conexões IoT">
          <defs>
            <marker id="arrowHead" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
              <polygon points="0 0, 10 4, 0 8" fill={COLORS.accent} />
            </marker>
          </defs>

          {[
            { d: d_sens_node, label: "Sensores → Nó/Logger" },
            { d: d_node_wifi, label: "Logger → Wi-Fi" },
            { d: d_node_lte, label: "Logger → 3G/4G/LTE-M" },
            { d: d_node_lora, label: "Logger → LoRaWAN" },
            { d: d_node_sat, label: "Logger → Satélite" },
            { d: d_wifi_api, label: "Wi-Fi → API" },
            { d: d_lte_api, label: "LTE → API" },
            { d: d_lora_api, label: "LoRaWAN → API" },
            { d: d_sat_api, label: "Satélite → API" },
            { d: d_api_etl, label: "API → ETL & QA/QC" },
            { d: d_api_db, label: "API → Banco" },
            { d: d_api_dash, label: "API → Painel" },
          ].map((p, i) =>
            p.d ? (
              <path key={i} d={p.d} stroke={COLORS.accent} strokeWidth={2.5} fill="none" markerEnd="url(#arrowHead)">
                <title>{p.label}</title>
              </path>
            ) : null
          )}
        </svg>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
          {/* Coluna Campo */}
          <div className="space-y-4">
            <div className="bg-[#cfe6ff] text-[#0f2747] font-bold rounded-2xl px-4 py-2" aria-hidden>
              Campo (Dispositivo)
            </div>

            <article ref={sensoresRef} className="bg-white rounded-2xl border border-[#dde8f3] shadow-md p-5" role="group" aria-label="Sensores">
              <header className="mb-2">
                <h3 className="text-[17px] font-semibold text-[#0e223d]">Sensores</h3>
                <p className="text-sm opacity-80">Radiação, Temperatura, Umidade, Vento, Chuva</p>
              </header>
              <div className="flex flex-wrap gap-3 text-[#0e223d]">
                <Sun className="w-5 h-5 text-[#2a7de1]" aria-hidden />
                <Thermometer className="w-5 h-5 text-[#2a7de1]" aria-hidden />
                <Droplets className="w-5 h-5 text-[#2a7de1]" aria-hidden />
                <Wind className="w-5 h-5 text-[#2a7de1]" aria-hidden />
                <CloudRain className="w-5 h-5 text-[#2a7de1]" aria-hidden />
              </div>
            </article>

            <article ref={nodeRef} className="bg-white rounded-2xl border border-[#dde8f3] shadow-md p-5" role="group" aria-label="Nó/Logger (edge)">
              <header className="mb-2">
                <h3 className="text-[17px] font-semibold text-[#0e223d]">Nó/Logger (edge)</h3>
                <p className="text-sm opacity-80">Aquisição; buffering (store &amp; forward); watchdog</p>
              </header>
              {/* Imagem opcional da estação (adicione em /public/images/estacao_iot.png) */}
              {/* <figure className="mt-2">
                <img src="/images/estacao_iot.png" alt="Estação IoT em campo" className="rounded-lg border border-[#dde8f3]" />
                <figcaption className="text-xs opacity-70 mt-1">Estação de campo (opcional)</figcaption>
              </figure> */}
            </article>
          </div>

          {/* Coluna Conectividade */}
          <div className="space-y-4">
            <div className="bg-[#cfe6ff] text-[#0f2747] font-bold rounded-2xl px-4 py-2" aria-hidden>
              Conectividade
            </div>

            <div className="bg-white rounded-2xl border border-[#dde8f3] shadow-md p-5" aria-label="Tecnologias de conectividade" role="group">
              <div className="flex flex-col gap-3">
                <div ref={wifiRef} className="inline-flex items-center rounded-full border border-[#dde8f3] bg-[#e9f5ff] px-3 py-2 text-sm text-[#0e223d] w-max">Wi‑Fi</div>
                <div ref={lteRef} className="inline-flex items-center rounded-full border border-[#dde8f3] bg-[#e9f5ff] px-3 py-2 text-sm text-[#0e223d] w-max">3G/4G/LTE‑M</div>
                <div ref={loraRef} className="inline-flex items-center rounded-full border border-[#dde8f3] bg-[#e9f5ff] px-3 py-2 text-sm text-[#0e223d] w-max">LoRaWAN</div>
                <div ref={satRef} className="inline-flex items-center rounded-full border border-[#dde8f3] bg-[#e9f5ff] px-3 py-2 text-sm text-[#0e223d] w-max">Satélite</div>
              </div>
            </div>
          </div>

          {/* Coluna Plataforma */}
          <div className="space-y-4">
            <div className="bg-[#cfe6ff] text-[#0f2747] font-bold rounded-2xl px-4 py-2" aria-hidden>
              Plataforma / Aplicação
            </div>

            <article ref={apiRef} className="bg-white rounded-2xl border border-[#dde8f3] shadow-md p-5" role="group" aria-label="API pública: OGC SensorThings (Sensing)">
              <header className="flex items-center gap-2 mb-2">
                <Network className="w-5 h-5 text-[#2a7de1]" aria-hidden />
                <h3 className="text-[17px] font-semibold text-[#0e223d]">API pública — OGC SensorThings (Sensing)</h3>
              </header>
              <p className="text-sm opacity-80">Entidades: Thing, Datastream, Observation, ObservedProperty, FeatureOfInterest</p>
            </article>

            <article ref={etlRef} className="bg-white rounded-2xl border border-[#dde8f3] shadow-md p-5" role="group" aria-label="ETL & QA/QC">
              <header className="flex items-center gap-2 mb-2">
                <Settings2 className="w-5 h-5 text-[#2a7de1]" aria-hidden />
                <h3 className="text-[17px] font-semibold text-[#0e223d]">ETL &amp; QA/QC</h3>
              </header>
              <p className="text-sm opacity-80">Limites; consistência; flags; envelopes de Rso</p>
            </article>

            <article ref={dbRef} className="bg-white rounded-2xl border border-[#dde8f3] shadow-md p-5" role="group" aria-label="Banco de dados">
              <header className="flex items-center gap-2 mb-2">
                <Database className="w-5 h-5 text-[#2a7de1]" aria-hidden />
                <h3 className="text-[17px] font-semibold text-[#0e223d]">Banco de dados</h3>
              </header>
              <p className="text-sm opacity-80">Timeseries + catálogo de metadados</p>
            </article>

            <article ref={dashRef} className="bg-white rounded-2xl border border-[#dde8f3] shadow-md p-5" role="group" aria-label="Painel/Aplicativo">
              <header className="flex items-center gap-2 mb-2">
                <LayoutDashboard className="w-5 h-5 text-[#2a7de1]" aria-hidden />
                <h3 className="text-[17px] font-semibold text-[#0e223d]">Painel / Aplicativo</h3>
              </header>
              <p className="text-sm opacity-80">Mapas, séries, recomendações</p>
            </article>
          </div>
        </div>

        <p className="mt-3 text-xs opacity-70">Instalação conforme WMO-No. 8; interoperabilidade OGC SensorThings.</p>
      </div>
    </section>
  );
}





