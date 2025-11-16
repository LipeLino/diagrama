"use client";

import "leaflet/dist/leaflet.css";

import React, { useMemo, useRef, useState, useEffect } from "react";
import type { LatLngBoundsExpression, LatLngTuple } from "leaflet";

import { TRIANGULO_STATES, TRIANGULO_HULL, TRIANGULO_BOUNDS, type LatLon } from "../../data/geo/trianguloMapData";
import { exportAsSVG, exportDiagramPDF } from "../figura-02/Figure02_Encadeamento";
import type { StationMetadata } from "../../types/figureModels";

const COLORS = {
  background: "#f7faff",
  border: "#d1d9e0",
  text: "#0f2747",
  grid: "#c7d7eb",
  mgFill: "#eff3fb",
  trianguloFill: "#dbeafe",
  trianguloStroke: "#8ab6e6",
  river: "#136fd0",
  plugfield: "#1565c0",
  ativa: "#0d9488",
  sigma: "#7c3aed",
};

const providerLegend = [
  { label: "Plugfield", color: COLORS.plugfield },
  { label: "Ativa", color: COLORS.ativa },
  { label: "Sigma", color: COLORS.sigma },
];

const stations: StationMetadata[] = [
  { id: "sfs", estacao: "São Francisco de Sales", municipio: "São Francisco de Sales/MG", provider: "Plugfield", latitude: -19.8612, longitude: -49.7689, altitudeM: 437 },
  { id: "prata", estacao: "Prata", municipio: "Prata/MG", provider: "Plugfield", latitude: -19.3088, longitude: -48.9276, altitudeM: 630 },
  { id: "aparecida", estacao: "Aparecida de Minas", municipio: "Frutal/MG", provider: "Ativa", latitude: -20.1119, longitude: -49.232, altitudeM: 463 },
  { id: "frutal", estacao: "Frutal (Ativa)", municipio: "Frutal/MG", provider: "Ativa", latitude: -20.0303, longitude: -48.9356, altitudeM: 525 },
  { id: "pirajuba", estacao: "Pirajuba e Campo Florido", municipio: "Pirajuba/MG", provider: "Plugfield", latitude: -19.8710175519, longitude: -48.6554272745, altitudeM: 584 },
  { id: "planura", estacao: "Planura", municipio: "Planura/MG", provider: "Plugfield", latitude: -20.1417355955, longitude: -48.7038773682, altitudeM: 475 },
  { id: "frutalSigma", estacao: "Frutal (Sigma)", municipio: "Frutal/MG", provider: "Sigma", latitude: -20.0183, longitude: -48.9517, altitudeM: 519 },
];

type TooltipDirection = "top" | "bottom" | "left" | "right";

const DEFAULT_TOOLTIP_OFFSET: [number, number] = [0, -10];
const STATION_TOOLTIP_OVERRIDES: Record<string, { direction: TooltipDirection; offset?: [number, number] }> = {
  frutal: { direction: "left", offset: [-18, -12] },
  frutalSigma: { direction: "right", offset: [18, 10] },
  aparecida: { direction: "bottom", offset: [0, 14] },
  planura: { direction: "bottom", offset: [0, 16] },
};

const getStationTooltipDirection = (stationId: string): TooltipDirection => STATION_TOOLTIP_OVERRIDES[stationId]?.direction ?? "top";
const getStationTooltipOffset = (stationId: string): [number, number] => STATION_TOOLTIP_OVERRIDES[stationId]?.offset ?? DEFAULT_TOOLTIP_OFFSET;

const formatCoordinate = (value: number, axis: "lat" | "lon") => `${Math.abs(value).toFixed(4)}°${axis === "lat" ? "S" : "W"}`;
const VIEWBOX = { width: 940, height: 600 };
const MAP_PADDING = 70;
const BOUNDS_MARGIN = 0.05;

const MAP_BOUNDS = {
  latMin: TRIANGULO_BOUNDS.latMin - BOUNDS_MARGIN,
  latMax: TRIANGULO_BOUNDS.latMax + BOUNDS_MARGIN,
  lonMin: TRIANGULO_BOUNDS.lonMin - BOUNDS_MARGIN,
  lonMax: TRIANGULO_BOUNDS.lonMax + BOUNDS_MARGIN,
};

const LEAFLET_BOUNDS: LatLngBoundsExpression = [
  [TRIANGULO_BOUNDS.latMin - 0.45, TRIANGULO_BOUNDS.lonMin - 0.45],
  [TRIANGULO_BOUNDS.latMax + 0.45, TRIANGULO_BOUNDS.lonMax + 0.45],
];

const INITIAL_ZOOM = 10.4;
const MIN_ZOOM = 7;
const MAX_ZOOM = 12;

const trianguloPolygonLatLngs: LatLngTuple[] = TRIANGULO_HULL.map(([lat, lon]) => [lat, lon]) as LatLngTuple[];

const KM_PER_DEG_LAT = 111.32;
const referenceLat = (MAP_BOUNDS.latMin + MAP_BOUNDS.latMax) / 2;
const kmPerDegreeLon = KM_PER_DEG_LAT * Math.cos((referenceLat * Math.PI) / 180);

const projectLatLon = (lat: number, lon: number) => {
  const width = VIEWBOX.width - MAP_PADDING * 2;
  const height = VIEWBOX.height - MAP_PADDING * 2;
  const x = MAP_PADDING + ((lon - MAP_BOUNDS.lonMin) / (MAP_BOUNDS.lonMax - MAP_BOUNDS.lonMin)) * width;
  const y = MAP_PADDING + ((MAP_BOUNDS.latMax - lat) / (MAP_BOUNDS.latMax - MAP_BOUNDS.latMin)) * height;
  return { x, y };
};

type ProjectedStation = StationMetadata & ReturnType<typeof projectLatLon>;
type StationCardLayout = ProjectedStation & {
  direction: TooltipDirection;
  card: { x: number; y: number; width: number; height: number };
  anchor: { x: number; y: number };
};

const CARD_SIZE = { width: 236, height: 126 };
const CARD_GAP = 28;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const buildPath = (coords: LatLon[], close = true) => {
  if (!coords.length) return "";
  const segments = coords
    .map(([lat, lon], index) => {
      const { x, y } = projectLatLon(lat, lon);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
  return close ? `${segments} Z` : segments;
};

const providerColor = (provider: string) => {
  if (provider === "Plugfield") return COLORS.plugfield;
  if (provider === "Ativa") return COLORS.ativa;
  if (provider === "Sigma") return COLORS.sigma;
  return COLORS.text;
};

const basemapAttribution = "Fonte do mosaico: Esri, Maxar, Earthstar Geographics";
const basemapUrl = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

const LeafletStationsMap = ({ stationsList }: { stationsList: StationMetadata[] }) => {
  const [LeafletComponents, setLeafletComponents] = useState<typeof import("react-leaflet") | null>(null);

  useEffect(() => {
    import("react-leaflet").then((mod) => setLeafletComponents(mod));
  }, []);

  const statesPolygons = useMemo(
    () =>
      TRIANGULO_STATES.map((state) => ({
        id: state.id,
        polygons: state.polygons.map((polygon) => polygon.map(([lat, lon]) => [lat, lon]) as LatLngTuple[]),
      })),
    [],
  );

  const mapCenter = useMemo(() => {
    const { latSum, lonSum } = trianguloPolygonLatLngs.reduce(
      (acc, [lat, lon]) => ({ latSum: acc.latSum + lat, lonSum: acc.lonSum + lon }),
      { latSum: 0, lonSum: 0 },
    );
    return [latSum / trianguloPolygonLatLngs.length, lonSum / trianguloPolygonLatLngs.length] as LatLngTuple;
  }, []);

  if (!LeafletComponents) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#0b1a2b]">
        <div className="text-white">Carregando mapa...</div>
      </div>
    );
  }

  const { MapContainer, TileLayer, ZoomControl, ScaleControl, Polygon, CircleMarker, Tooltip } = LeafletComponents;

  return (
    <MapContainer
      center={mapCenter}
      zoom={INITIAL_ZOOM}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      maxBounds={LEAFLET_BOUNDS}
      zoomControl={false}
      attributionControl={false}
      scrollWheelZoom={false}
      className="h-full w-full rounded-[28px]"
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer url={basemapUrl} attribution={basemapAttribution} detectRetina />
      <ZoomControl position="topright" />
      <ScaleControl position="bottomleft" />

      {statesPolygons.map((state) =>
        state.polygons.map((polygon, index) => (
          <Polygon
            key={`${state.id}-${index}`}
            positions={polygon}
            pathOptions={{
              color: state.id === "MG" ? COLORS.trianguloStroke : COLORS.border,
              weight: state.id === "MG" ? 1.6 : 0.8,
              fillOpacity: state.id === "MG" ? 0.08 : 0,
              dashArray: state.id === "MG" ? undefined : "6 10",
            }}
          />
        )),
      )}

      <Polygon
        positions={trianguloPolygonLatLngs}
        pathOptions={{ color: COLORS.trianguloStroke, weight: 2.8, fillColor: "#c7e2ff", fillOpacity: 0.35 }}
      />

      {stationsList.map((station) => {
        const direction = getStationTooltipDirection(station.id);
        const offset = getStationTooltipOffset(station.id);
        const tooltipClassName = `station-tooltip${station.id === "frutal" ? " station-tooltip--frutal" : ""}`;

        return (
          <CircleMarker
            key={station.id}
            center={[station.latitude, station.longitude]}
            radius={8}
            pathOptions={{ color: "#ffffff", fillColor: providerColor(station.provider), fillOpacity: 0.95, weight: 2.5 }}
          >
            <Tooltip direction={direction} offset={offset} permanent className={tooltipClassName}>
              <div className="station-tooltip__content flex flex-col gap-2 text-left">
                <div className="flex items-start gap-2">
                  <span
                    className="mt-1 h-3.5 w-3.5 rounded-full border border-white/70 shadow-sm"
                    style={{ backgroundColor: providerColor(station.provider) }}
                  />
                  <div>
                    <p className="text-[13px] font-black leading-tight text-[#0f2747]">{station.estacao}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#475569]">{station.municipio}</p>
                  </div>
                </div>
                <div
                  className="rounded-xl border border-[#e2e8f0] bg-white/90 px-3 py-2 text-[10px] font-semibold text-[#0f2747] shadow-inner"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  <div className="flex items-center justify-between gap-4 text-[#475569]">
                    <span>Coord.</span>
                    <span className="font-mono text-[#0f2747]">
                      {formatCoordinate(station.latitude, "lat")} · {formatCoordinate(station.longitude, "lon")}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-4 text-[#475569]">
                    <span>Alt.</span>
                    <span className="font-mono text-[#0f2747]">{station.altitudeM} m</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-4 text-[#475569]">
                    <span>Prov.</span>
                    <span className="text-[#0f2747]">{station.provider}</span>
                  </div>
                </div>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
};

const useSvgMapData = () => {
  const mapNodes = useMemo<ProjectedStation[]>(() => stations.map((station) => ({ ...station, ...projectLatLon(station.latitude, station.longitude) })), []);
  const stationCards = useMemo<StationCardLayout[]>(() => {
    const minX = MAP_PADDING - 10;
    const maxX = VIEWBOX.width - MAP_PADDING - CARD_SIZE.width + 10;
    const minY = MAP_PADDING - 10;
    const maxY = VIEWBOX.height - MAP_PADDING - CARD_SIZE.height + 10;

    return mapNodes.map((station) => {
      const direction = getStationTooltipDirection(station.id);
      const width = CARD_SIZE.width;
      const height = CARD_SIZE.height;
      let cardX = station.x - width / 2;
      let cardY = station.y - height - CARD_GAP;

      if (direction === "bottom") {
        cardY = station.y + CARD_GAP;
      } else if (direction === "left") {
        cardX = station.x - CARD_GAP - width;
        cardY = station.y - height / 2;
      } else if (direction === "right") {
        cardX = station.x + CARD_GAP;
        cardY = station.y - height / 2;
      }

      cardX = clamp(cardX, minX, maxX);
      cardY = clamp(cardY, minY, maxY);

      const anchor = (() => {
        if (direction === "top") return { x: cardX + width / 2, y: cardY + height };
        if (direction === "bottom") return { x: cardX + width / 2, y: cardY };
        if (direction === "left") return { x: cardX + width, y: cardY + height / 2 };
        return { x: cardX, y: cardY + height / 2 };
      })();

      return {
        ...station,
        direction,
        card: { x: cardX, y: cardY, width, height },
        anchor,
      };
    });
  }, [mapNodes]);
  const statesWithPaths = useMemo(
    () =>
      TRIANGULO_STATES.map((state) => ({
        id: state.id,
        name: state.name,
        paths: state.polygons.map((polygon, index) => ({ key: `${state.id}-${index}`, d: buildPath(polygon, true) })),
      })),
    [],
  );

  const trianguloHullPath = useMemo(() => buildPath(TRIANGULO_HULL, true), []);
  const trianguloLabel = useMemo(() => {
    const { lat, lon } = TRIANGULO_HULL.reduce(
      (acc, [latValue, lonValue]) => ({ lat: acc.lat + latValue / TRIANGULO_HULL.length, lon: acc.lon + lonValue / TRIANGULO_HULL.length }),
      { lat: 0, lon: 0 },
    );
    return projectLatLon(lat, lon);
  }, []);

  const gridLines = useMemo(() => {
    const lines: { type: "lat" | "lon"; value: number; x1: number; x2: number; y1: number; y2: number }[] = [];
    const latStep = 0.1;
    const lonStep = 0.1;
    for (let lat = Math.ceil(MAP_BOUNDS.latMin / latStep) * latStep; lat <= MAP_BOUNDS.latMax + 0.001; lat += latStep) {
      const { y } = projectLatLon(lat, MAP_BOUNDS.lonMin);
      lines.push({ type: "lat", value: lat, x1: MAP_PADDING, x2: VIEWBOX.width - MAP_PADDING, y1: y, y2: y });
    }
    for (let lon = Math.ceil(MAP_BOUNDS.lonMin / lonStep) * lonStep; lon <= MAP_BOUNDS.lonMax + 0.001; lon += lonStep) {
      const { x } = projectLatLon(MAP_BOUNDS.latMin, lon);
      lines.push({ type: "lon", value: lon, x1: x, x2: x, y1: MAP_PADDING, y2: VIEWBOX.height - MAP_PADDING });
    }
    return lines;
  }, []);

  const scaleBar = useMemo(() => {
    const km = 10;
    const degreesLon = km / kmPerDegreeLon;
    const widthPx = (degreesLon / (MAP_BOUNDS.lonMax - MAP_BOUNDS.lonMin)) * (VIEWBOX.width - MAP_PADDING * 2);
    return { widthPx, km };
  }, []);

  return { mapNodes, stationCards, statesWithPaths, trianguloHullPath, trianguloLabel, gridLines, scaleBar };
};

export default function Figure05_LocalizacaoEstacoes() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { mapNodes, stationCards, statesWithPaths, trianguloHullPath, trianguloLabel, gridLines, scaleBar } = useSvgMapData();

  return (
    <section ref={containerRef} className="relative rounded-3xl border border-[#d1d9e0] bg-white p-6 shadow-xl" aria-label="Figura 5 – Localização das estações Redeagromet" data-figure="5">
      <div className="absolute right-6 top-6 z-10 flex gap-3">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border-2 border-[#1565c0] bg-white px-4 py-2 text-sm font-semibold text-[#0f2747] shadow-sm transition hover:bg-[#f5f5f5]"
          onClick={() => exportAsSVG(svgRef, "Figura05_Mapa.svg")}
        >
          Exportar SVG
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border-2 border-[#1565c0] bg-white px-4 py-2 text-sm font-semibold text-[#0f2747] shadow-sm transition hover:bg-[#f5f5f5]"
          onClick={() => void exportDiagramPDF(svgRef, containerRef, "Figura05_Mapa.pdf")}
        >
          Exportar PDF
        </button>
      </div>

      <div className="mt-12 rounded-[36px] border border-[#c8d7ea] bg-linear-to-b from-[#dfe8ff] via-[#f5f8ff] to-white p-4 shadow-inner">
        <div className="relative h-[1020px] w-full overflow-hidden rounded-4xl border border-[#b8c8de] bg-[#0b1a2b]">
          <LeafletStationsMap stationsList={stations} />

          <div className="pointer-events-none absolute left-6 top-6 z-1000 rounded-2xl border border-white/80 bg-white/95 px-6 py-4 text-[#0f2747] shadow-2xl backdrop-blur-md">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#64748b]">Redeagromet</p>
            <p className="mt-1 text-xl font-bold leading-tight">Estações automáticas</p>
            <p className="mt-0.5 text-sm font-medium text-[#475569]">Triângulo Mineiro Sul • Imagem de satélite</p>
          </div>

          <div className="pointer-events-none absolute right-6 top-6 z-1000 flex flex-col items-center gap-2 text-white drop-shadow-lg">
            <div className="rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-sm">
              <span className="text-xs font-bold uppercase tracking-wider">N</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="h-16 w-0.5 bg-white drop-shadow-md" />
              <span className="-mt-1.5 text-2xl drop-shadow-md">▲</span>
            </div>
          </div>

          <div className="pointer-events-none absolute right-6 bottom-6 z-1000 flex w-[280px] flex-col gap-4 rounded-3xl border border-white/80 bg-white/95 px-6 py-5 text-[#0f2747] shadow-2xl backdrop-blur-md">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#64748b]">Legenda</p>
              <p className="mt-1 text-sm font-semibold text-[#1e293b]">Provedores de dados</p>
            </div>
            <div className="space-y-3.5">
              {providerLegend.map((legend) => (
                <div key={legend.label} className="flex items-center gap-3">
                  <span className="inline-flex h-5 w-5 rounded-full border-2 border-white shadow-lg" style={{ backgroundColor: legend.color }} />
                  <span className="text-sm font-semibold text-[#0f2747]">{legend.label}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2 border-t border-[#d1d9e0] pt-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#64748b]">Escala</p>
              <div className="flex items-center gap-2">
                <div className="h-1 flex-1 rounded-full bg-linear-to-r from-[#0f2747] to-[#475569]" />
                <span className="text-xs font-bold text-[#0f2747]">{scaleBar.km} km</span>
              </div>
            </div>
            <div className="border-t border-[#d1d9e0] pt-3">
              <p className="text-[10px] font-medium leading-relaxed text-[#64748b]">{basemapAttribution}</p>
            </div>
          </div>
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
        width={VIEWBOX.width}
        height={VIEWBOX.height}
        role="img"
        aria-labelledby="fig5-title fig5-desc"
        style={{ position: "fixed", top: 0, left: 0, opacity: 0, pointerEvents: "none", zIndex: -1 }}
      >
        <title id="fig5-title">Redeagromet – Triângulo Mineiro Sul (localização vetorial para exportação)</title>
        <desc id="fig5-desc">Mapa vetorial para PDF/SVG exportando o enquadramento em alta aproximação e as estações Redeagromet.</desc>

        <defs>
          <linearGradient id="trianguloGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#e3f2fd" />
            <stop offset="100%" stopColor="#d2ebff" />
          </linearGradient>
          <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="130%" colorInterpolationFilters="sRGB">
            <feDropShadow dx="0" dy="14" stdDeviation="12" floodColor="rgba(15,39,71,0.35)" />
          </filter>
          <filter id="panelShadow" x="-10%" y="-10%" width="130%" height="140%" colorInterpolationFilters="sRGB">
            <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="rgba(15,39,71,0.25)" />
          </filter>
        </defs>

        <rect x="0" y="0" width={VIEWBOX.width} height={VIEWBOX.height} fill={COLORS.background} rx="32" />
        <rect
          x={MAP_PADDING - 20}
          y={MAP_PADDING - 20}
          width={VIEWBOX.width - (MAP_PADDING - 20) * 2}
          height={VIEWBOX.height - (MAP_PADDING - 20) * 2}
          fill="#ffffff"
          stroke={COLORS.border}
          strokeWidth={2}
          rx="28"
        />

        {gridLines.map((line) => (
          <g key={`${line.type}-${line.value.toFixed(2)}`}>
            <line x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke={COLORS.grid} strokeWidth={0.65} strokeDasharray="4 12" />
            <text x={line.type === "lat" ? line.x1 - 10 : line.x1 + 6} y={line.type === "lat" ? line.y1 - 6 : line.y2 + 18} fontSize={10} fill={COLORS.text} textAnchor={line.type === "lat" ? "end" : "start"}>
              {line.type === "lat" ? `${Math.abs(line.value).toFixed(2)}°S` : `${Math.abs(line.value).toFixed(2)}°W`}
            </text>
          </g>
        ))}

        {statesWithPaths.map((state) => (
          <g key={state.id} aria-label={state.name}>
            {state.paths.map((path) => (
              <path key={path.key} d={path.d} fill={state.id === "MG" ? COLORS.mgFill : "#fff"} stroke={COLORS.border} strokeWidth={1} />
            ))}
          </g>
        ))}

        <path d={trianguloHullPath} fill="url(#trianguloGrad)" stroke={COLORS.trianguloStroke} strokeWidth={2.4} strokeLinejoin="round" />

        <text x={trianguloLabel.x} y={trianguloLabel.y} fontSize={15} fontWeight={700} fill={COLORS.text} textAnchor="middle">
          Triângulo Mineiro Sul (zoom)
        </text>

        {stationCards.map((station) => (
          <g key={`connector-${station.id}`}>
            <path
              d={`M ${station.x.toFixed(2)} ${station.y.toFixed(2)} L ${station.anchor.x.toFixed(2)} ${station.anchor.y.toFixed(2)}`}
              stroke="rgba(15, 39, 71, 0.35)"
              strokeWidth={1.6}
              fill="none"
            />
            <circle cx={station.anchor.x} cy={station.anchor.y} r={3.2} fill="#ffffff" stroke="rgba(15, 39, 71, 0.4)" strokeWidth={1} />
          </g>
        ))}

        {mapNodes.map((station) => (
          <g key={`marker-${station.id}`}>
            <circle cx={station.x} cy={station.y} r={10.5} fill="#fff" stroke={providerColor(station.provider)} strokeWidth={3} />
            <circle cx={station.x} cy={station.y} r={4.2} fill={providerColor(station.provider)} />
          </g>
        ))}

        {stationCards.map((station) => (
          <g key={`card-${station.id}`} filter="url(#cardShadow)">
            <rect
              x={station.card.x}
              y={station.card.y}
              width={station.card.width}
              height={station.card.height}
              fill="#ffffff"
              stroke="rgba(15, 39, 71, 0.18)"
              strokeWidth={1.2}
              rx={18}
            />
            <g transform={`translate(${station.card.x + 18}, ${station.card.y + 20})`}>
              <circle cx={4} cy={6} r={6} fill={providerColor(station.provider)} stroke="#ffffff" strokeWidth={1.6} />
              <text x={18} y={-2} fontSize={13} fontWeight={700} fill={COLORS.text} dominantBaseline="hanging">
                {station.estacao}
              </text>
              <text x={18} y={14} fontSize={10} fontWeight={600} fill="#475569" letterSpacing="0.2em" dominantBaseline="hanging">
                {station.municipio.toUpperCase()}
              </text>
            </g>
            <rect
              x={station.card.x + 16}
              y={station.card.y + 60}
              width={station.card.width - 32}
              height={station.card.height - 82}
              fill="#ffffff"
              stroke="#e2e8f0"
              strokeWidth={1.2}
              rx={16}
            />
            <g fontSize={10} fontWeight={600} fill="#475569">
              <text x={station.card.x + 32} y={station.card.y + 82}>
                Coord.
              </text>
              <text x={station.card.x + station.card.width - 32} y={station.card.y + 82} textAnchor="end" fill={COLORS.text} fontFamily="monospace">
                {formatCoordinate(station.latitude, "lat")} · {formatCoordinate(station.longitude, "lon")}
              </text>
              <text x={station.card.x + 32} y={station.card.y + 102}>
                Alt.
              </text>
              <text x={station.card.x + station.card.width - 32} y={station.card.y + 102} textAnchor="end" fontFamily="monospace" fill={COLORS.text}>
                {station.altitudeM} m
              </text>
              <text x={station.card.x + 32} y={station.card.y + 122}>
                Prov.
              </text>
              <text x={station.card.x + station.card.width - 32} y={station.card.y + 122} textAnchor="end" fill={COLORS.text}>
                {station.provider}
              </text>
            </g>
          </g>
        ))}

        <g filter="url(#panelShadow)" transform={`translate(${MAP_PADDING}, ${MAP_PADDING - 52})`}>
          <rect width={260} height={126} fill="#ffffff" stroke="rgba(255,255,255,0.7)" strokeWidth={1.2} rx={24} />
          <g transform="translate(24, 26)" fill={COLORS.text}>
            <text fontSize={10} fontWeight={700} letterSpacing="0.25em" fill="#64748b">
              REDEAGROMET
            </text>
            <text y={28} fontSize={22} fontWeight={700}>
              Estações automáticas
            </text>
            <text y={50} fontSize={13} fontWeight={600} fill="#475569">
              Triângulo Mineiro Sul • Imagem de satélite
            </text>
          </g>
        </g>

        <g filter="url(#panelShadow)" transform={`translate(${VIEWBOX.width - MAP_PADDING - 300}, ${VIEWBOX.height - MAP_PADDING - 240})`}>
          <rect width={300} height={220} fill="#ffffff" stroke="rgba(255,255,255,0.8)" strokeWidth={1.2} rx={30} />
          <g transform="translate(26, 32)">
            <text fontSize={10} fontWeight={700} letterSpacing="0.3em" fill="#64748b">
              LEGENDA
            </text>
            <text y={18} fontSize={14} fontWeight={600} fill={COLORS.text}>
              Provedores de dados
            </text>
            {providerLegend.map((legend, index) => (
              <g key={legend.label} transform={`translate(0, ${44 + index * 32})`}>
                <circle cx={12} cy={0} r={9} fill={legend.color} stroke="#ffffff" strokeWidth={2} />
                <text x={34} y={4} fontSize={12} fontWeight={600} fill={COLORS.text}>
                  {legend.label}
                </text>
              </g>
            ))}
            <g transform="translate(0, 144)">
              <text fontSize={10} fontWeight={700} letterSpacing="0.3em" fill="#64748b">
                ESCALA
              </text>
              <g transform="translate(0, 16)">
                <rect x={0} y={0} width={scaleBar.widthPx} height={6} fill="url(#trianguloGrad)" rx={3} />
                <rect
                  x={scaleBar.widthPx / 2}
                  y={0}
                  width={scaleBar.widthPx / 2}
                  height={6}
                  fill="#ffffff"
                  stroke={COLORS.text}
                  strokeWidth={0.8}
                  rx={3}
                />
                <text x={scaleBar.widthPx / 2} y={20} textAnchor="middle" fontSize={12} fontWeight={700} fill={COLORS.text}>
                  {scaleBar.km} km
                </text>
              </g>
              <text y={54} fontSize={10} fontWeight={500} fill="#64748b">
                {basemapAttribution}
              </text>
            </g>
          </g>
        </g>

        <g transform={`translate(${VIEWBOX.width - MAP_PADDING - 60}, ${MAP_PADDING - 10})`}>
          <rect width={48} height={110} rx={24} fill="rgba(0,0,0,0.45)" />
          <text x={24} y={22} textAnchor="middle" fontSize={12} fontWeight={700} fill="#ffffff" letterSpacing="0.3em">
            N
          </text>
          <line x1={24} y1={32} x2={24} y2={90} stroke="#ffffff" strokeWidth={2} />
          <polygon points="24,16 18,28 30,28" fill="#ffffff" />
        </g>
      </svg>

      <style jsx global>{`
        .leaflet-tooltip.station-tooltip {
          position: relative;
          background: rgba(255, 255, 255, 0.86);
          border: 1.5px solid rgba(15, 39, 71, 0.2);
          border-radius: 14px;
          box-shadow: 0 8px 24px rgba(15, 39, 71, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.8);
          padding: 12px 14px;
          backdrop-filter: blur(14px) saturate(140%);
          -webkit-backdrop-filter: blur(14px) saturate(140%);
          min-width: 200px;
          line-height: 1.35;
          letter-spacing: 0.01em;
          color: #0f2747;
          z-index: 1200;
        }
        .leaflet-tooltip.station-tooltip:before {
          border-color: transparent;
        }
        .leaflet-tooltip.station-tooltip .station-tooltip__content {
          transition: transform 0.25s ease;
        }
        .leaflet-tooltip.station-tooltip.station-tooltip--frutal {
          padding-bottom: 72px;
        }
        .leaflet-tooltip.station-tooltip.station-tooltip--frutal .station-tooltip__content {
          transform: translateY(-60px);
        }
        .leaflet-tooltip-top.station-tooltip:before {
          border-top-color: rgba(255, 255, 255, 0.97);
        }
        .leaflet-tooltip-bottom.station-tooltip:before {
          border-bottom-color: rgba(255, 255, 255, 0.97);
        }
        .leaflet-tooltip-left.station-tooltip:before {
          border-left-color: rgba(255, 255, 255, 0.97);
        }
        .leaflet-tooltip-right.station-tooltip:before {
          border-right-color: rgba(255, 255, 255, 0.97);
        }
      `}</style>
    </section>
  );
}
