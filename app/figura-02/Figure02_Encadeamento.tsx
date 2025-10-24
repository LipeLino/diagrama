/**
 * Scientific traceability:
 * - FAO-56 / ASCE Penman–Monteith for ET₀ (FAO Irrigation & Drainage Paper 56).
 * - WMO-No. 8 guidelines for agrometeorological station siting and instrumentation.
 * - OGC SensorThings API (Sensing profile) for interoperable indicator exposure.
 */
'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  BarChart3,
  CloudRain,
  Database,
  Droplets,
  LayoutDashboard,
  ArrowRight,
  Sprout,
  Cog,
  FlaskConical,
  Sun,
  Thermometer,
  Wind,
} from 'lucide-react';

const COLORS = {
  bg: '#fafbfc',
  laneHead: '#1565c0',
  headText: '#ffffff',
  border: '#d1d9e0',
  cardBorder: '#e0e7ef',
  text: '#1a2332',
  accent: '#1565c0',
  accent2: '#2196F3',
  iconBg: '#e3f2fd',
  iconBorder: '#1565C0',
  hint: '#37474f',
};

// Prefer the same font stack as the site; PDF will map via server fontCallback when available
const FONT_STACK = 'Inter, Segoe UI, system-ui, -apple-system, Helvetica, Arial, sans-serif';

// Unified 3-color scheme — same hues for Variables→Indicators and Indicators→Decisions
// ET₀ deep blue, BH steel blue, GDD sky blue. Decisions reuse one of these hues to keep palette minimal.
const STROKE_BY_TARGET = {
  et0: '#5B8DBB', // ET₀ / D1 group
  bh: '#7C9674',  // BH / D3 group
  gdd: '#9B8BBE', // GDD / D2 group
  d1: '#5B8DBB',  // Decisão de Irrigação shares ET₀ hue
  d2: '#9B8BBE',  // Manejo shares GDD hue
  d3: '#7C9674',  // Planejamento shares BH hue
} as const;

function getStrokeByTarget(targetId: keyof typeof STROKE_BY_TARGET): string {
  return STROKE_BY_TARGET[targetId];
}

const toolbarButtonClass =
  'inline-flex items-center gap-2 rounded-lg border-2 border-[#1565c0] bg-white px-5 py-2.5 text-sm font-semibold text-[#1565c0] shadow-sm hover:bg-[#f5f5f5] transition-colors';
const laneClass =
  'relative z-0 overflow-visible rounded-xl border-2 border-[#d1d9e0] bg-white w-full shadow-sm';
const laneHeadClass =
  'flex items-center justify-center rounded-t-xl bg-[#1565c0] px-4 py-4 text-base font-bold text-white tracking-wide uppercase shadow-sm antialiased';
const laneBodyClass = 'relative flex flex-col gap-6 px-5 py-6 bg-gradient-to-b from-white to-[#fafbfc]';
const hintClass = 'inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 text-sm font-semibold text-[#1565c0] bg-[#e3f2fd] border border-[#90caf9] rounded-md w-fit antialiased';
const cardContainerClass =
  'relative mx-auto w-full rounded-lg border border-[#e0e7ef] bg-white px-6 py-4 max-w-[380px] shadow-sm hover:shadow-md transition-shadow';
const variableCardClass =
  'relative mx-auto w-full rounded-lg border border-[#e0e7ef] bg-white px-6 py-4 max-w-[450px] shadow-sm hover:shadow-md transition-shadow';
const cardTitleClass = 'text-[15px] font-bold text-[#1a2332] leading-snug antialiased';
const cardBodyTextClass = 'text-[13px] leading-relaxed text-[#2d3748] antialiased';
const pillTextClass =
  'whitespace-nowrap rounded-md bg-gradient-to-r from-[#e3f2fd] to-[#bbdefb] px-3 py-1 text-[13px] font-bold text-[#0d47a1] border border-[#90caf9] antialiased';
const iconWrapperClass =
  'flex h-7 w-7 items-center justify-center rounded-lg bg-[#e3f2fd] text-[#1565C0] border border-[#90caf9] shadow-sm';

// Arrowhead geometry: 16×9 px, no padding - endpoints snap directly to card edge
const ARROW_LENGTH = 16;
const STRAIGHT_SEGMENT = 12; // Final straight perpendicular segment before arrow
// To avoid a 90° step when multiple connectors merge, ensure the merge node
// sits at least this extra distance before the start of the final straight stub.
const MIN_CURVE_DX = 24; // px of horizontal lead-in so the curve meets the stub tangentially
// Visual hint for merge points (drawn only when multiple sources merge)
const MERGE_NODE_R = 4; // px
// Minimum total horizontal gap from a target edge to its merge node for the
// final straight run (merge → target). Smaller values make that straight line
// shorter. Keep large enough so the incoming curves meet smoothly at the node.
const MERGE_MIN_GAP = 36; // px (was effectively 52 before)

type ConnectorOptions = {
  curv?: number;
  offset?: number;
  fromOffset?: number;
  toOffset?: number;
  minDx?: number;
};

interface CardDefinition {
  id: string;
  title: string;
  unit?: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
  ref: React.RefObject<HTMLDivElement | null>;
}

interface DecisionDetail {
  icon: string;
  text: string;
}

interface DecisionCardDefinition {
  id: string;
  title: string;
  Icon: React.ComponentType<{ className?: string }>;
  details: DecisionDetail[];
  hint: string;
  ref: React.RefObject<HTMLDivElement | null>;
}

type ExportableSVG = React.RefObject<SVGSVGElement | null>;
type ExportContainer = React.RefObject<HTMLDivElement | null>;

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

// Export a vector PDF containing only the diagram (SVG) and a vector caption (no title/header UI)
export const exportDiagramPDF = async (
  svgRef: ExportableSVG,
  containerRef: ExportContainer,
  name: string,
) => {
  const svgElement = svgRef.current;
  const containerEl = containerRef.current;
  if (!svgElement || !containerEl) return;

  // Helper: remove unsupported filters and replace marker-end arrowheads
  const stripUnsupportedAndReplaceMarkers = (svg: SVGSVGElement) => {
    // Remove filter attributes (e.g., feDropShadow) that svg2pdf can't render vectorially
    const filtered = svg.querySelectorAll('[filter]');
    filtered.forEach((el) => el.removeAttribute('filter'));

    // Remove <defs> that only contain non-marker content
    const defs = svg.querySelectorAll('defs');
    defs.forEach((d) => {
      const children = Array.from(d.children);
      const hasMarker = children.some((c) => c.nodeName.toLowerCase() === 'marker');
      const hasNonMarker = children.some((c) => c.nodeName.toLowerCase() !== 'marker');
      if (hasNonMarker && !hasMarker) {
        d.parentElement?.removeChild(d);
      }
    });

    // Replace marker-end arrows with explicit polygons so arrows remain vector in PDF
    const paths = svg.querySelectorAll('path');
    paths.forEach((p) => {
      const markerEnd = p.getAttribute('marker-end');
      if (!markerEnd) return;
      const d = p.getAttribute('d') || '';
      if (!d) return;

      // Find last line segment (assumes our connectors end with ... L x y)
      const nums = (d.match(/[-+]?(?:\d*\.\d+|\d+)(?:e[-+]?\d+)?/gi) || []).map(Number);
      if (nums.length < 4) return;
      const x2 = nums[nums.length - 2];
      const y2 = nums[nums.length - 1];
      const x1 = nums[nums.length - 4];
      const y1 = nums[nums.length - 3];

      // Orientation
      const dx = x2 - x1;
      const dy = y2 - y1;
      const horiz = Math.abs(dx) >= Math.abs(dy);

      // Arrow geometry (match on-screen markers): 16 x 9 px
      const L = ARROW_LENGTH; // tip-to-base length
      const H = 9; // total height
      const h2 = H / 2;

      const points: Array<[number, number]> = [];
      if (horiz) {
        // Assume arrow points toward increasing x (right) or decreasing x (left)
        const sign = dx >= 0 ? 1 : -1;
        const tip: [number, number] = [x2, y2];
        const baseX = x2 - sign * L;
        points.push(tip, [baseX, y2 - h2], [baseX, y2 + h2]);
      } else {
        // Vertical: arrow points toward increasing y (down) or decreasing y (up)
        const sign = dy >= 0 ? 1 : -1;
        const tip: [number, number] = [x2, y2];
        const baseY = y2 - sign * L;
        points.push(tip, [x2 - h2, baseY], [x2 + h2, baseY]);
      }

      const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      poly.setAttribute('points', points.map(([x, y]) => `${x},${y}`).join(' '));
      const stroke = p.getAttribute('stroke') || '#000';
      poly.setAttribute('fill', stroke);
      poly.setAttribute('stroke', 'none');

      // Insert polygon just after the path so it draws on top
      p.parentElement?.insertBefore(poly, p.nextSibling);
      // Remove marker attribute to avoid relying on markers in export
      p.removeAttribute('marker-end');
    });
  };

  const bounds = svgElement.getBoundingClientRect();
  const baseWidth = Math.max(1, bounds.width);
  const baseHeight = Math.max(1, bounds.height);

  const captionPaddingX = 24; // px left/right padding
  const captionPaddingY = 20; // px top/bottom padding
  const captionLine = 18; // px line height for paragraph
  const captionGap = 14; // gap between legend and paragraph
  const legendSwatchW = 36;
  const legendSwatchH = 8;
  const legendItemGap = 12;

  // Caption strings (keep in sync with HTML footer)
  const legendTitle = 'Cores dos conectores (por grupo)';
  type LegendItem = { color: string; left: string; right: string };
  const legendItems: LegendItem[] = [
    { color: STROKE_BY_TARGET.et0, left: 'Grupo ET₀', right: 'Decisão de irrigação (D1)' },
    { color: STROKE_BY_TARGET.bh, left: 'Grupo BH', right: 'Planejamento operacional (D3)' },
    { color: STROKE_BY_TARGET.gdd, left: 'Grupo GDD', right: 'Manejo fitossanitário (D2)' },
  ];
  const captionText = 'Legenda: Fluxo em duas etapas — (1) Variáveis → Indicadores; (2) Indicadores → Decisões. As setas usam três cores consistentes por grupo: ET₀/D1, BH/D3 e GDD/D2. Todas as conexões de um grupo compartilham a mesma cor ao longo de todo o percurso.';

  // Create export SVG (diagram + caption)
  const NS = 'http://www.w3.org/2000/svg';
  const exportSvg = document.createElementNS(NS, 'svg');
  exportSvg.setAttribute('xmlns', NS);
  exportSvg.setAttribute('width', `${baseWidth}`);
  // defs: simple gradients used for pills and lane backgrounds
  const defs = document.createElementNS(NS, 'defs');
  // Horizontal light blue pill gradient
  const pillGrad = document.createElementNS(NS, 'linearGradient');
  pillGrad.setAttribute('id', 'pillGrad');
  pillGrad.setAttribute('x1', '0');
  pillGrad.setAttribute('y1', '0');
  pillGrad.setAttribute('x2', '1');
  pillGrad.setAttribute('y2', '0');
  const stop1 = document.createElementNS(NS, 'stop');
  stop1.setAttribute('offset', '0%');
  stop1.setAttribute('stop-color', '#e3f2fd');
  const stop2 = document.createElementNS(NS, 'stop');
  stop2.setAttribute('offset', '100%');
  stop2.setAttribute('stop-color', '#bbdefb');
  pillGrad.appendChild(stop1);
  pillGrad.appendChild(stop2);
  defs.appendChild(pillGrad);

  // Vertical subtle panel gradient (white to bg)
  const panelGrad = document.createElementNS(NS, 'linearGradient');
  panelGrad.setAttribute('id', 'panelGrad');
  panelGrad.setAttribute('x1', '0');
  panelGrad.setAttribute('y1', '0');
  panelGrad.setAttribute('x2', '0');
  panelGrad.setAttribute('y2', '1');
  const pStop1 = document.createElementNS(NS, 'stop');
  pStop1.setAttribute('offset', '0%');
  pStop1.setAttribute('stop-color', '#ffffff');
  const pStop2 = document.createElementNS(NS, 'stop');
  pStop2.setAttribute('offset', '100%');
  pStop2.setAttribute('stop-color', COLORS.bg);
  panelGrad.appendChild(pStop1);
  panelGrad.appendChild(pStop2);
  defs.appendChild(panelGrad);

  exportSvg.appendChild(defs);
  // Estimate caption height based on lines: title + legend items (single row) + paragraph
  const wrap = (text: string, maxChars: number) => {
    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';
    for (const w of words) {
      const next = current ? `${current} ${w}` : w;
      if (next.length > maxChars) {
        if (current) lines.push(current);
        current = w;
      } else {
        current = next;
      }
    }
    if (current) lines.push(current);
    return lines;
  };

  const paragraphLines = wrap(
    captionText,
    Math.max(56, Math.floor((baseWidth - 2 * captionPaddingX) / 7)),
  ); // rough wrap tuned for ~12px text

  const legendRows = 1; // lay items horizontally with equal spacing
  const captionContentHeight =
    captionPaddingY +
    captionLine +
    16 + // space after title
    legendRows * (legendSwatchH + 14) +
    captionGap +
    paragraphLines.length * captionLine +
    captionPaddingY;

  const totalHeight = baseHeight + captionContentHeight;
  exportSvg.setAttribute('height', `${totalHeight}`);
  exportSvg.setAttribute('viewBox', `0 0 ${baseWidth} ${totalHeight}`);

  // 1) Rebuild the HTML cards and lane headers as vector shapes inside the SVG
  const domLayer = document.createElementNS(NS, 'g');
  const containerRect = containerEl.getBoundingClientRect();

  const roundedRect = (
    x: number,
    y: number,
    w: number,
    h: number,
    rx: number,
    fill: string,
    stroke?: string,
    strokeWidth: number = 1,
  ) => {
    const r = document.createElementNS(NS, 'rect');
    r.setAttribute('x', x.toFixed(2));
    r.setAttribute('y', y.toFixed(2));
    r.setAttribute('width', w.toFixed(2));
    r.setAttribute('height', h.toFixed(2));
    r.setAttribute('rx', rx.toFixed(2));
    r.setAttribute('fill', fill);
    if (stroke) {
      r.setAttribute('stroke', stroke);
      r.setAttribute('stroke-width', `${strokeWidth}`);
    }
    return r;
  };

  const addTextLines = (
    x: number,
    y: number,
    lines: string[],
    fontSize: number,
    color: string,
    weight: '400' | '700' = '400',
  ) => {
    const t = document.createElementNS(NS, 'text');
    t.setAttribute('x', `${x}`);
    t.setAttribute('y', `${y}`);
    t.setAttribute('fill', color);
    t.setAttribute('font-size', `${fontSize}`);
    t.setAttribute('font-family', FONT_STACK);
    if (weight === '700') t.setAttribute('font-weight', '700');
    lines.forEach((ln, idx) => {
      const sp = document.createElementNS(NS, 'tspan');
      sp.setAttribute('x', `${x}`);
      sp.setAttribute('dy', idx === 0 ? '0' : `${Math.round(fontSize * 1.35)}`);
      sp.textContent = ln;
      t.appendChild(sp);
    });
    return t;
  };

  const wrapText = (text: string, maxChars: number) => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      const nx = cur ? `${cur} ${w}` : w;
      if (nx.length > maxChars) {
        if (cur) lines.push(cur);
        cur = w;
      } else {
        cur = nx;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  };

  // Draw lane headers as solid bars with text
  const laneHeaders = [
    '#lane-variables',
    '#lane-indicadores',
    '#lane-decisoes',
  ];
  laneHeaders.forEach((sel) => {
    const el = containerEl.querySelector(sel) as HTMLElement | null;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = r.left - containerRect.left;
    const y = r.top - containerRect.top;
    const bar = roundedRect(x, y, r.width, r.height, 12, COLORS.laneHead);
    domLayer.appendChild(bar);
    const label = (el.textContent || '').trim();
    if (label) {
      const tx = x + r.width / 2;
      const ty = y + r.height / 2 + 4; // slight optical alignment
      const t = document.createElementNS(NS, 'text');
      t.setAttribute('x', `${tx}`);
      t.setAttribute('y', `${ty}`);
      t.setAttribute('fill', '#ffffff');
      t.setAttribute('font-size', '14');
      t.setAttribute('font-weight', '700');
      t.setAttribute('font-family', FONT_STACK);
      t.setAttribute('text-anchor', 'middle');
      t.textContent = label;
      domLayer.appendChild(t);
    }
  });

  // Draw card rectangles and key text content
  const articles = Array.from(containerEl.querySelectorAll('article')) as HTMLElement[];
  articles.forEach((art) => {
    const r = art.getBoundingClientRect();
    const x = r.left - containerRect.left;
    const y = r.top - containerRect.top;
    // Soft vector shadow (no filters): two faint layers
    const shadow1 = roundedRect(x, y, r.width, r.height, 10, '#000000');
    shadow1.setAttribute('fill-opacity', '0.05');
    shadow1.setAttribute('transform', `translate(0,1)`);
    domLayer.appendChild(shadow1);
    const shadow2 = roundedRect(x, y, r.width, r.height, 10, '#000000');
    shadow2.setAttribute('fill-opacity', '0.03');
    shadow2.setAttribute('transform', `translate(0,2)`);
    domLayer.appendChild(shadow2);

    // Card body with subtle panel gradient
    const card = roundedRect(x, y, r.width, r.height, 10, 'url(#panelGrad)', COLORS.cardBorder, 1);
    domLayer.appendChild(card);

    // Icon wrapper + SVG icon (cloned from DOM for fidelity)
    const iconSize = 28;
    const iconPad = 16; // left padding
    const iconWrapper = roundedRect(x + iconPad, y + 12, iconSize, iconSize, 8, COLORS.iconBg, '#90caf9', 1);
    domLayer.appendChild(iconWrapper);
    const origIcon = art.querySelector('svg');
    if (origIcon) {
      const ic = origIcon.cloneNode(true) as SVGSVGElement;
      // Normalize icon styling to avoid CSS dependencies
      const parentColor = getComputedStyle(origIcon.parentElement || origIcon).color || COLORS.iconBorder;
      ic.setAttribute('width', '18');
      ic.setAttribute('height', '18');
      ic.setAttribute('x', `${x + iconPad + (iconSize - 18) / 2}`);
      ic.setAttribute('y', `${y + 12 + (iconSize - 18) / 2}`);
      ic.setAttribute('stroke', parentColor);
      ic.setAttribute('fill', 'none');
      if (!ic.getAttribute('stroke-width')) ic.setAttribute('stroke-width', '2');
      ic.setAttribute('stroke-linecap', 'round');
      ic.setAttribute('stroke-linejoin', 'round');
      domLayer.appendChild(ic);
    }

    // Title
    const h2 = art.querySelector('h2');
    const title = (h2?.textContent || '').trim();
    if (title) {
      const lines = wrapText(title, Math.floor((r.width - 32) / 8));
      const textEl = addTextLines(x + 16 + iconSize + 8, y + 28, lines, 14, COLORS.text, '700');
      domLayer.appendChild(textEl);
    }

    // Unit pill (optional): look for a span that is positioned to the right in DOM
    const unitSpan = Array.from(art.querySelectorAll('span')).find((sp) => (sp.textContent || '').length <= 12);
    if (unitSpan && unitSpan.textContent) {
      const u = unitSpan.textContent.trim();
      if (u) {
        const padX = 8, padY = 6;
        const fs = 11;
        // Measure roughly: width per char ~ 6 px at 11px font
        const w = Math.max(30, u.length * 6 + padX * 2);
        const h = fs + padY * 2;
        const rx = 6;
        const ux = x + r.width - 16 - w;
        const uy = y + 10;
        const pill = roundedRect(ux, uy, w, h, rx, 'url(#pillGrad)', '#90caf9', 1);
        domLayer.appendChild(pill);
        const t = document.createElementNS(NS, 'text');
        t.setAttribute('x', `${ux + padX}`);
        t.setAttribute('y', `${uy + h - padY - 2}`);
        t.setAttribute('fill', '#0d47a1');
        t.setAttribute('font-size', `${fs}`);
        t.setAttribute('font-weight', '700');
        t.setAttribute('font-family', FONT_STACK);
        t.textContent = u;
        domLayer.appendChild(t);
      }
    }

    // Description (first paragraph)
    const p = art.querySelector('p');
    const desc = (p?.textContent || '').trim();
    if (desc) {
      const lines = wrapText(desc, Math.floor((r.width - 32) / 7));
      const textEl = addTextLines(x + 16, y + 54, lines, 12, '#2d3748', '400');
      domLayer.appendChild(textEl);
    }

    // Decision details list (if present)
    const lis = Array.from(art.querySelectorAll('ul li')) as HTMLElement[];
    if (lis.length) {
      let y0 = y + 68;
      lis.forEach((li, idx) => {
        const txt = (li.textContent || '').replace(/^\s*•\s*/, '').trim();
        if (!txt) return;
        const lines = wrapText(txt, Math.floor((r.width - 44) / 7));
        const t = addTextLines(x + 24, y0, lines, 11, '#37474f', '400');
        domLayer.appendChild(t);
        y0 += lines.length * Math.round(11 * 1.35) + 2;
      });
    }
  });

  exportSvg.appendChild(domLayer);

  // Append the diagram by cloning the existing SVG (keeps paths etc.)
  const diagramClone = svgElement.cloneNode(true) as SVGSVGElement;
  diagramClone.setAttribute('x', '0');
  diagramClone.setAttribute('y', '0');
  // Prepare the diagram clone for vector PDF: strip filters, materialize arrows
  stripUnsupportedAndReplaceMarkers(diagramClone);
  exportSvg.appendChild(diagramClone);

  // Build vector caption group
  const captionGroup = document.createElementNS(NS, 'g');
  captionGroup.setAttribute('transform', `translate(0, ${baseHeight})`);

  // Background (solid white to avoid semi-transparent rasterization)
  const bg = document.createElementNS(NS, 'rect');
  bg.setAttribute('x', '0');
  bg.setAttribute('y', '0');
  bg.setAttribute('width', `${baseWidth}`);
  bg.setAttribute('height', `${captionContentHeight}`);
  bg.setAttribute('fill', '#ffffff');
  captionGroup.appendChild(bg);

  // Title
  const titleText = document.createElementNS(NS, 'text');
  titleText.setAttribute('x', `${captionPaddingX}`);
  titleText.setAttribute('y', `${captionPaddingY + captionLine}`);
  titleText.setAttribute('fill', '#1a2332');
  titleText.setAttribute('font-size', '13');
  titleText.setAttribute('font-weight', '700');
  titleText.setAttribute('font-family', FONT_STACK);
  titleText.textContent = legendTitle;
  captionGroup.appendChild(titleText);

  // Legend row
  const legendY = captionPaddingY + captionLine + 16;
  const columns = legendItems.length;
  const effectiveWidth = baseWidth - 2 * captionPaddingX;
  const colWidth = effectiveWidth / columns;
  // approximate text width to position arrow and right label
  const approxTextWidth = (s: string, fontSize = 12) => Math.round(s.length * fontSize * 0.6);
  legendItems.forEach((it, i) => {
    const cx = captionPaddingX + i * colWidth;
    const swatch = document.createElementNS(NS, 'rect');
    swatch.setAttribute('x', `${cx}`);
    swatch.setAttribute('y', `${legendY}`);
    swatch.setAttribute('width', `${legendSwatchW}`);
    swatch.setAttribute('height', `${legendSwatchH}`);
    swatch.setAttribute('rx', `${legendSwatchH / 2}`);
    swatch.setAttribute('fill', it.color);
    captionGroup.appendChild(swatch);

    const baseX = cx + legendSwatchW + legendItemGap;
    const baseY = legendY + legendSwatchH; // baseline for text

    // Left (bold)
    const left = document.createElementNS(NS, 'text');
    left.setAttribute('x', `${baseX}`);
    left.setAttribute('y', `${baseY}`);
    left.setAttribute('fill', '#37474f');
    left.setAttribute('font-size', '12');
    left.setAttribute('font-family', FONT_STACK);
    left.setAttribute('font-weight', '700');
    left.textContent = it.left;
    captionGroup.appendChild(left);

    // Arrow icon (vector)
    const leftW = approxTextWidth(it.left, 12);
    const ax = baseX + leftW + 6;
    const ay = baseY - 6; // center vertically around text baseline
    const arrow = document.createElementNS(NS, 'path');
    // small right arrow with chevron head
    const arrowW = 16;
    const arrowH = 6;
    const lineStartX = ax;
    const lineEndX = ax + arrowW - 6;
    const cy = ay + arrowH / 2;
    const d = `M ${lineStartX} ${cy} L ${lineEndX} ${cy} M ${lineEndX - 4} ${cy - 4} L ${lineEndX} ${cy} L ${lineEndX - 4} ${cy + 4}`;
    arrow.setAttribute('d', d);
    arrow.setAttribute('stroke', '#607d8b');
    arrow.setAttribute('stroke-width', '2');
    arrow.setAttribute('fill', 'none');
    arrow.setAttribute('stroke-linecap', 'round');
    arrow.setAttribute('stroke-linejoin', 'round');
    captionGroup.appendChild(arrow);

    // Right (normal)
    const right = document.createElementNS(NS, 'text');
    right.setAttribute('x', `${ax + arrowW + 4}`);
    right.setAttribute('y', `${baseY}`);
    right.setAttribute('fill', '#37474f');
    right.setAttribute('font-size', '12');
    right.setAttribute('font-family', FONT_STACK);
    right.textContent = it.right;
    captionGroup.appendChild(right);
  });

  // Paragraph
  const para = document.createElementNS(NS, 'text');
  para.setAttribute('x', `${captionPaddingX}`);
  para.setAttribute('y', `${legendY + legendSwatchH + captionGap + captionLine}`);
  para.setAttribute('fill', '#1a2332');
  para.setAttribute('font-size', '12');
  para.setAttribute('font-family', FONT_STACK);
  paragraphLines.forEach((ln, idx) => {
    const tspan = document.createElementNS(NS, 'tspan');
    tspan.setAttribute('x', `${captionPaddingX}`);
    tspan.setAttribute('dy', idx === 0 ? '0' : `${captionLine}`);
    tspan.textContent = ln;
    para.appendChild(tspan);
  });
  captionGroup.appendChild(para);

  // Top divider to separate caption from diagram
  const divider = document.createElementNS(NS, 'line');
  divider.setAttribute('x1', '0');
  divider.setAttribute('y1', '0');
  divider.setAttribute('x2', `${baseWidth}`);
  divider.setAttribute('y2', '0');
  divider.setAttribute('stroke', '#e0e7ef');
  divider.setAttribute('stroke-width', '1');
  captionGroup.appendChild(divider);

  exportSvg.appendChild(captionGroup);

  // Serialize composed SVG and send to server to render via pdfkit (vector)
  const serializer = new XMLSerializer();
  const source = serializer.serializeToString(exportSvg);

  const res = await fetch('/api/export-figura02', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ svg: source, width: baseWidth, height: totalHeight, filename: name }),
  });
  if (!res.ok) {
    const info = await res.json().catch(() => ({}));
    throw new Error(`PDF export failed: ${info?.error ?? res.statusText}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

function useRerouteOnResize(refs: Array<React.RefObject<Element | null>>, onResize: () => void) {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof ResizeObserver === 'undefined') {
      return;
    }

    let frame: number | null = null;
    const schedule = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(onResize);
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
    // Re-route after fonts load to account for text metrics changes
    // Supported in modern browsers; safe no-op otherwise
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (document.fonts && 'ready' in document.fonts) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      (document.fonts.ready as Promise<void>).then(() => schedule());
    }
    schedule();

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      observed.forEach((el) => observer.unobserve(el));
      observer.disconnect();
      window.removeEventListener('resize', schedule);
    };
  }, [onResize]);
}

// Compute a dynamic merge point for multiple sources going into one target.
// The merge X is placed a fixed gap to the left of the target; the merge Y
// is the average of source centerlines, clamped within the target band.
function useMergePoint(
  containerRef: React.RefObject<HTMLDivElement | null>,
  sourceRefs: Array<React.RefObject<HTMLElement | null>>,
  targetRef: React.RefObject<HTMLElement | null>,
  xGap: number = 28,
): { x: number; y: number } {
  const [pt, setPt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  // Hold latest sourceRefs to avoid recreating callbacks/effects on each render
  const sourceRefsRef = useRef(sourceRefs);
  useEffect(() => {
    sourceRefsRef.current = sourceRefs;
  }, [sourceRefs]);

  const update = useCallback(() => {
    const container = containerRef.current;
    const target = targetRef.current;
    if (!container || !target) return;

    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    const centers: number[] = [];
    for (const r of sourceRefsRef.current) {
      const el = r.current;
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      centers.push(rect.top + rect.height / 2 - containerRect.top);
    }
    // Fallback to target center if sources not ready
    const avgY =
      centers.length > 0
        ? centers.reduce((a, b) => a + b, 0) / centers.length
        : targetRect.top + targetRect.height / 2 - containerRect.top;

  const targetTop = targetRect.top - containerRect.top;
  const targetBottom = targetTop + targetRect.height;
    // Lock merge Y to the exact target centerline so the final segment
    // from merge → target can be a perfectly straight horizontal run.
    const y = targetRect.top + targetRect.height / 2 - containerRect.top;
  // Enforce a minimum horizontal lead-in so the incoming curves have room
  // to meet the merge node smoothly (no right-angle step). This also controls
  // how long the final straight run is between the node and the arrowhead.
  const effectiveGap = Math.max(xGap, MERGE_MIN_GAP);
  const x = Math.max(0, targetRect.left - containerRect.left - effectiveGap);
    // Do not snap X; preserving the exact lead-in distance avoids subtle
    // curvature quantization near the arrowhead when multiple lines merge.
    // Don't snap Y - let it align naturally with source centers to avoid kinks
    setPt({ x, y });
  }, [containerRef, targetRef, xGap]);

  useEffect(() => {
    update();
  }, [update]);

  useRerouteOnResize([containerRef, targetRef, ...sourceRefsRef.current], update);
  return pt;
}

function useCurvedConnector(
  containerRef: React.RefObject<HTMLDivElement | null>,
  fromRef: React.RefObject<HTMLElement | null>,
  toRef: React.RefObject<HTMLElement | null>,
  { offset = 0, fromOffset, toOffset }: ConnectorOptions = {},
): string {
  const [path, setPath] = useState('');

  const updatePath = useCallback(() => {
    const container = containerRef.current;
    const fromEl = fromRef.current;
    const toEl = toRef.current;
    if (!container || !fromEl || !toEl) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();

    const startOffset = fromOffset ?? offset;
    const endOffset = toOffset ?? offset;

    // Anchor points: source EAST edge center → target WEST edge center
    const x1 = fromRect.right - containerRect.left;
    const y1 = fromRect.top + fromRect.height / 2 - containerRect.top + startOffset;
    
    // Target anchor on WEST edge (left side) - path endpoint exactly on edge
    const targetX = toRect.left - containerRect.left;
    const targetY = toRect.top + toRect.height / 2 - containerRect.top + endOffset;
    
    // Path endpoint: exactly on card edge (arrow will extend backward from here)
    const x2 = targetX;
    const y2 = targetY;
    
    // Straight segment starts STRAIGHT_SEGMENT + ARROW_LENGTH before edge
    // so the entire straight portion (including arrow) is perpendicular
    const straightStartX = x2 - STRAIGHT_SEGMENT - ARROW_LENGTH;
    const straightStartY = y2;

    // Bézier curve from source to start of straight segment
    const dx = Math.max(straightStartX - x1, 60);
    const c = 0.35 * dx;
    const cx1 = x1 + c;
    const cy1 = y1;
    const cx2 = straightStartX - c;
    const cy2 = straightStartY;
    
    // Path: curve + straight perpendicular segment
    const d = `M ${x1.toFixed(2)} ${y1.toFixed(2)} C ${cx1.toFixed(2)} ${cy1.toFixed(2)}, ${cx2.toFixed(2)} ${cy2.toFixed(2)}, ${straightStartX.toFixed(2)} ${straightStartY.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)}`;

    setPath(d);
  }, [containerRef, fromRef, toRef, offset, fromOffset, toOffset]);

  useEffect(() => {
    updatePath();
  }, [updatePath]);

  useRerouteOnResize([containerRef, fromRef, toRef], updatePath);

  return path;
}

// Vertical connector: from bottom center of source to top center of target
function useVerticalConnector(
  containerRef: React.RefObject<HTMLDivElement | null>,
  fromRef: React.RefObject<HTMLElement | null>,
  toRef: React.RefObject<HTMLElement | null>,
): string {
  const [path, setPath] = useState('');

  const updatePath = useCallback(() => {
    const container = containerRef.current;
    const fromEl = fromRef.current;
    const toEl = toRef.current;
    if (!container || !fromEl || !toEl) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();

    // Bottom center of source card
    const x1 = fromRect.left + fromRect.width / 2 - containerRect.left;
    const y1 = fromRect.bottom - containerRect.top;
    
    // Target anchor on TOP edge - path endpoint exactly on edge
    const targetX = toRect.left + toRect.width / 2 - containerRect.left;
    const targetY = toRect.top - containerRect.top;
    
    // Path endpoint: exactly on card edge (arrow will extend backward from here)
    const x2 = targetX;
    const y2 = targetY;
    
    // Straight segment starts STRAIGHT_SEGMENT + ARROW_LENGTH before edge
    // so the entire straight portion (including arrow) is perpendicular
    const straightStartX = x2;
    const straightStartY = y2 - STRAIGHT_SEGMENT - ARROW_LENGTH;

    // Vertical Bézier curve to start of straight segment
    const dy = straightStartY - y1;
    const c = 0.4 * dy;
    
    const cx1 = x1;
    const cy1 = y1 + c;
    const cx2 = straightStartX;
    const cy2 = straightStartY - c;
    
    // Path: curve + straight perpendicular segment
    const d = `M ${x1.toFixed(2)} ${y1.toFixed(2)} C ${cx1.toFixed(2)} ${cy1.toFixed(2)}, ${cx2.toFixed(2)} ${cy2.toFixed(2)}, ${straightStartX.toFixed(2)} ${straightStartY.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)}`;

    setPath(d);
  }, [containerRef, fromRef, toRef]);

  useEffect(() => {
    updatePath();
  }, [updatePath]);

  useRerouteOnResize([containerRef, fromRef, toRef], updatePath);

  return path;
}

// Merge node connector: from card to a virtual merge point
function useMergeConnector(
  containerRef: React.RefObject<HTMLDivElement | null>,
  fromRef: React.RefObject<HTMLElement | null>,
  toRef: React.RefObject<HTMLElement | null>,
  mergeX: number, // relative X position of merge node
  mergeY: number, // relative Y position of merge node
  fromOffset: number = 0,
  isFromMerge: boolean = false, // true if from merge node to target
): string {
  const [path, setPath] = useState('');

  const updatePath = useCallback(() => {
    const container = containerRef.current;
    const fromEl = fromRef.current;
    const toEl = toRef.current;
    if (!container || !fromEl || !toEl) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();
    if (isFromMerge) {
      // From merge node to target WEST edge — draw a perfectly straight
      // horizontal segment so the arrowhead sits on a straight path.
      const x1 = mergeX;
      const targetX = toRect.left - containerRect.left;
      const y2 = toRect.top + toRect.height / 2 - containerRect.top;
      const x2 = targetX; // endpoint on the card edge
      const d = `M ${x1.toFixed(2)} ${y2.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)}`;
      setPath(d);
    } else {
      // From source to merge node
      const x1 = fromRect.right - containerRect.left; // EAST port of source (right edge)
      const y1 = fromRect.top + fromRect.height / 2 - containerRect.top + fromOffset;
      const x2 = mergeX;
      const y2 = mergeY;

      const dx = Math.max(x2 - x1, 80);
      const c = 0.35 * dx;
      const cx1 = x1 + c;
      const cy1 = y1;
      const cx2 = x2 - c;
      const cy2 = y2;
      
      const d = `M ${x1.toFixed(2)} ${y1.toFixed(2)} C ${cx1.toFixed(2)} ${cy1.toFixed(2)}, ${cx2.toFixed(2)} ${cy2.toFixed(2)}, ${x2.toFixed(2)} ${y2.toFixed(2)}`;
      setPath(d);
    }
  }, [containerRef, fromRef, toRef, mergeX, mergeY, fromOffset, isFromMerge]);

  useEffect(() => {
    updatePath();
  }, [updatePath]);

  useRerouteOnResize([containerRef, fromRef, toRef], updatePath);

  return path;
}

export default function Figure02_Encadeamento(): React.ReactElement {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1, height: 1 });

  const rsRef = useRef<HTMLDivElement | null>(null);
  const tempRef = useRef<HTMLDivElement | null>(null);
  const umidadeRef = useRef<HTMLDivElement | null>(null);
  const ventoRef = useRef<HTMLDivElement | null>(null);
  const pressaoRef = useRef<HTMLDivElement | null>(null);
  const precipitacaoRef = useRef<HTMLDivElement | null>(null);
  const armazenamentoRef = useRef<HTMLDivElement | null>(null);

  const et0Ref = useRef<HTMLDivElement | null>(null);
  const gddRef = useRef<HTMLDivElement | null>(null);
  const bhRef = useRef<HTMLDivElement | null>(null);

  const d1Ref = useRef<HTMLDivElement | null>(null);
  const d2Ref = useRef<HTMLDivElement | null>(null);
  const d3Ref = useRef<HTMLDivElement | null>(null);

  const variableCards: CardDefinition[] = [
    // Group 1: ET₀ inputs (Rs, T, UR, u₂, P) - Top section
    {
      id: 'rs',
      title: 'Radiação solar global - Rs',
      unit: 'MJ m⁻² d⁻¹',
      description: 'Entrada de balanço de energia (ET₀).',
      Icon: Sun,
      ref: rsRef,
    },
    {
      id: 'temp',
      title: 'Temperatura do ar (méd./máx./mín.) - T, Tmax, Tmin',
      unit: '°C',
      description: 'eₛ(T), Δ e termos de ET₀; base para GDD.',
      Icon: Thermometer,
      ref: tempRef,
    },
    {
      id: 'ur',
      title: 'Umidade relativa do ar - UR',
      unit: '%',
      description: 'Determina eₐ e o VPD em ET₀.',
      Icon: Droplets,
      ref: umidadeRef,
    },
    {
      id: 'u2',
      title: 'Vento a 2 m - u₂',
      unit: 'm s⁻¹',
      description: 'Controla o termo aerodinâmico de ET₀.',
      Icon: Wind,
      ref: ventoRef,
    },
    {
      id: 'pressao',
      title: 'Pressão atmosférica - P',
      unit: 'kPa',
      description: 'Ajusta a constante psicrométrica γ em ET₀.',
      Icon: BarChart3,
      ref: pressaoRef,
    },
    // Group 2: BH inputs (Pcp, ΔS) - Bottom section
    {
      id: 'pcp',
      title: 'Precipitação observada - Pcp',
      unit: 'mm',
      description: 'Entrada do balanço hídrico (BH).',
      Icon: CloudRain,
      ref: precipitacaoRef,
    },
    {
      id: 'solo',
      title: 'Armazenamento de água no solo - S',
      unit: 'mm',
      description: 'ΔS fecha o balanço hídrico diário.',
      Icon: Database,
      ref: armazenamentoRef,
    },
  ];

  const indicatorCards: CardDefinition[] = [
    // Top: ET₀ (feeds into BH and D1)
    {
      id: 'et0',
      title: 'ET₀ — Evapotranspiração de referência',
      unit: 'mm d⁻¹',
      description: 'Penman–Monteith FAO-56/ASCE.',
      Icon: Cog,
      ref: et0Ref,
    },
    // Middle: BH (receives ET₀, Pcp, ΔS; feeds D1)
    {
      id: 'bh',
      title: 'Balanço hídrico — BH',
      unit: 'mm',
      description: 'BH = Pcp − ET₀ ± ΔS.',
      Icon: Droplets,
      ref: bhRef,
    },
    // Bottom: GDD (receives T; feeds D3)
    {
      id: 'gdd',
      title: 'GDD — Graus-dia de desenvolvimento',
      unit: '°C·d',
      description: 'Σ[(Tmax + Tmin)/2 − Tbase].',
      Icon: FlaskConical,
      ref: gddRef,
    },
  ];

  const decisionCards: DecisionCardDefinition[] = [
    // Top: Receives from ET₀ + BH
    {
      id: 'd1',
      title: 'Decisão de irrigação',
      Icon: Droplets,
      details: [
        { icon: '•', text: 'Lâmina estimada via BH/ET₀' },
        { icon: '•', text: 'Momento: janela de déficit crítico' },
        { icon: '•', text: 'Risco de déficit: calculado por BH' },
      ],
      hint: 'Baseado em ET₀ e balanço hídrico',
      ref: d1Ref,
    },
    // Bottom: Receives from GDD + ET₀
    {
      id: 'd3',
      title: 'Planejamento operacional',
      Icon: LayoutDashboard,
      details: [
        { icon: '•', text: 'Janela via GDD para maturação' },
        { icon: '•', text: 'Risco: previsão + reservatório' },
        { icon: '•', text: 'GDD: 850 °C·d (estimado)' },
      ],
      hint: 'Baseado em GDD e previsão climática',
      ref: d3Ref,
    },
    // Middle: No connections (would need proper indicator)
    {
      id: 'd2',
      title: 'Manejo fitossanitário',
      Icon: Sprout,
      details: [
        { icon: '•', text: 'Risco via GDD + índice UR/T' },
        { icon: '•', text: 'Janela térmica: monitorada' },
        { icon: '•', text: 'Condição vento: no índice aplicação' },
      ],
      hint: 'Baseado em indicador de risco (GDD)',
      ref: d2Ref,
    },
  ];

  // Compute merge points for groups that share a common target
  // Move the ET₀ merge node slightly backwards (more lead-in) for better spacing
  const mergeEt0 = useMergePoint(containerRef, [rsRef, tempRef, umidadeRef, ventoRef, pressaoRef], et0Ref, 28);
  const mergeBh = useMergePoint(containerRef, [precipitacaoRef, armazenamentoRef], bhRef, 28); // ET₀ uses vertical connection
  const mergeD1 = useMergePoint(containerRef, [et0Ref, bhRef], d1Ref, 28);
  const mergeD3 = useMergePoint(containerRef, [et0Ref, gddRef], d3Ref, 28);

  // VARIABLES → INDICATORS (with merge into a single arrow per target)
  // Sources to merge for ET₀ - all start from exact center of their boxes (offset = 0)
  const pathRsToEt0Merge = useMergeConnector(containerRef, rsRef, et0Ref, mergeEt0.x, mergeEt0.y, 0, false);
  const pathTempToEt0Merge = useMergeConnector(containerRef, tempRef, et0Ref, mergeEt0.x, mergeEt0.y, 0, false);
  const pathUrToEt0Merge = useMergeConnector(containerRef, umidadeRef, et0Ref, mergeEt0.x, mergeEt0.y, 0, false);
  const pathVentoToEt0Merge = useMergeConnector(containerRef, ventoRef, et0Ref, mergeEt0.x, mergeEt0.y, 0, false);
  const pathPressToEt0Merge = useMergeConnector(containerRef, pressaoRef, et0Ref, mergeEt0.x, mergeEt0.y, 0, false);
  // Single arrow from merge to ET₀ target
  const pathMergeToEt0 = useMergeConnector(containerRef, et0Ref, et0Ref, mergeEt0.x, mergeEt0.y, 0, true);

  // T → GDD (single connection) - starts from exact center of T box
  const pathTempToGdd = useCurvedConnector(containerRef, tempRef, gddRef, { fromOffset: 0, toOffset: 0 });
  
  // Pcp, ΔS → BH (merge then single arrow) - horizontal connections
  const pathPcpToBhMerge = useMergeConnector(containerRef, precipitacaoRef, bhRef, mergeBh.x, mergeBh.y, 0, false);
  const pathSoloToBhMerge = useMergeConnector(containerRef, armazenamentoRef, bhRef, mergeBh.x, mergeBh.y, 0, false);
  const pathMergeToBh = useMergeConnector(containerRef, bhRef, bhRef, mergeBh.x, mergeBh.y, 0, true);
  
  // ET₀ → BH (vertical connection from bottom center to top center)
  const pathEt0ToBh = useVerticalConnector(containerRef, et0Ref, bhRef);
  
  // INDICATORS → DECISIONS
  // Merge ET₀ + BH → D1 (single final arrow) - all start from exact center
  const pathEt0ToD1Merge = useMergeConnector(containerRef, et0Ref, d1Ref, mergeD1.x, mergeD1.y, 0, false);
  const pathBhToD1Merge = useMergeConnector(containerRef, bhRef, d1Ref, mergeD1.x, mergeD1.y, 0, false);
  const pathMergeToD1 = useMergeConnector(containerRef, d1Ref, d1Ref, mergeD1.x, mergeD1.y, 0, true);
  // GDD → Manejo Fitossanitário (bottom to middle) - starts from exact center
  const pathGddToD2 = useCurvedConnector(containerRef, gddRef, d2Ref, { fromOffset: 0, toOffset: 0 });
  // Merge ET₀ + GDD → D3 (single final arrow) - all start from exact center
  const pathEt0ToD3Merge = useMergeConnector(containerRef, et0Ref, d3Ref, mergeD3.x, mergeD3.y, 0, false);
  const pathGddToD3Merge = useMergeConnector(containerRef, gddRef, d3Ref, mergeD3.x, mergeD3.y, 0, false);
  const pathMergeToD3 = useMergeConnector(containerRef, d3Ref, d3Ref, mergeD3.x, mergeD3.y, 0, true);


  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    setCanvasSize({ width: rect.width, height: rect.height });
  }, [containerRef]);

  const connectors = useMemo(
    () =>
      [
        // STEP 1: Variables → Indicators (merge to single arrow)
        { id: 'rs-et0-merge', d: pathRsToEt0Merge, color: getStrokeByTarget('et0'), target: 'et0', width: 1.8, title: 'Rs → merge(ET₀)', arrow: false },
        { id: 'temp-et0-merge', d: pathTempToEt0Merge, color: getStrokeByTarget('et0'), target: 'et0', width: 1.8, title: 'T → merge(ET₀)', arrow: false },
        { id: 'ur-et0-merge', d: pathUrToEt0Merge, color: getStrokeByTarget('et0'), target: 'et0', width: 1.8, title: 'UR → merge(ET₀)', arrow: false },
        { id: 'vento-et0-merge', d: pathVentoToEt0Merge, color: getStrokeByTarget('et0'), target: 'et0', width: 1.8, title: 'u₂ → merge(ET₀)', arrow: false },
        { id: 'press-et0-merge', d: pathPressToEt0Merge, color: getStrokeByTarget('et0'), target: 'et0', width: 1.8, title: 'P → merge(ET₀)', arrow: false },
        { id: 'merge-et0', d: pathMergeToEt0, color: getStrokeByTarget('et0'), target: 'et0', width: 1.8, title: 'Merge → ET₀', arrow: true },
        
        // T → GDD (phenology indicator)
        { id: 'temp-gdd', d: pathTempToGdd, color: getStrokeByTarget('gdd'), target: 'gdd', width: 1.8, title: 'T → GDD', arrow: true },
        
        // Variables → BH (water balance, merged)
        { id: 'pcp-bh-merge', d: pathPcpToBhMerge, color: getStrokeByTarget('bh'), target: 'bh', width: 1.8, title: 'Pcp → merge(BH)', arrow: false },
        { id: 'solo-bh-merge', d: pathSoloToBhMerge, color: getStrokeByTarget('bh'), target: 'bh', width: 1.8, title: 'ΔS → merge(BH)', arrow: false },
        { id: 'merge-bh', d: pathMergeToBh, color: getStrokeByTarget('bh'), target: 'bh', width: 1.8, title: 'Merge → BH', arrow: true },
        
  // ET₀ → BH (vertical connection) — use ET₀ hue consistently
  { id: 'et0-bh-vertical', d: pathEt0ToBh, color: getStrokeByTarget('et0'), target: 'et0', width: 1.8, title: 'ET₀ → BH (vertical)', arrow: true },
        
        // STEP 2: Indicators → Decisions (merged)
        // Color by decision target so each decision owns a single hue
        { id: 'et0-d1-merge', d: pathEt0ToD1Merge, color: getStrokeByTarget('d1'), target: 'd1', width: 1.8, title: 'ET₀ → merge(D1)', arrow: false },
        { id: 'bh-d1-merge', d: pathBhToD1Merge, color: getStrokeByTarget('d1'), target: 'd1', width: 1.8, title: 'BH → merge(D1)', arrow: false },
        { id: 'merge-d1', d: pathMergeToD1, color: getStrokeByTarget('d1'), target: 'd1', width: 1.8, title: 'Merge → Decisão Irrigação', arrow: true },
        { id: 'gdd-d2', d: pathGddToD2, color: getStrokeByTarget('d2'), target: 'd2', width: 1.8, title: 'GDD → Manejo Fitossanitário', arrow: true },
        { id: 'et0-d3-merge', d: pathEt0ToD3Merge, color: getStrokeByTarget('d3'), target: 'd3', width: 1.8, title: 'ET₀ → merge(D3)', arrow: false },
        { id: 'gdd-d3-merge', d: pathGddToD3Merge, color: getStrokeByTarget('d3'), target: 'd3', width: 1.8, title: 'GDD → merge(D3)', arrow: false },
        { id: 'merge-d3', d: pathMergeToD3, color: getStrokeByTarget('d3'), target: 'd3', width: 1.8, title: 'Merge → Planejamento', arrow: true },
      ].filter((connector) => connector.d),
    [
      pathRsToEt0Merge,
      pathTempToEt0Merge,
      pathUrToEt0Merge,
      pathVentoToEt0Merge,
      pathPressToEt0Merge,
      pathMergeToEt0,
      pathTempToGdd,
      pathPcpToBhMerge,
      pathSoloToBhMerge,
      pathMergeToBh,
      pathEt0ToBh,
      pathEt0ToD1Merge,
      pathBhToD1Merge,
      pathMergeToD1,
      pathGddToD2,
      pathEt0ToD3Merge,
      pathGddToD3Merge,
      pathMergeToD3,
    ],
  );

  const svgWidth = canvasSize.width || 1;
  const svgHeight = canvasSize.height || 1;

  // Merge node visuals (only if there are > 1 incoming sources)
  const mergeNodes = useMemo(
    () => [
      { id: 'et0', x: mergeEt0.x, y: mergeEt0.y, color: getStrokeByTarget('et0'), sources: 5 },
      { id: 'bh', x: mergeBh.x, y: mergeBh.y, color: getStrokeByTarget('bh'), sources: 2 },
      { id: 'd1', x: mergeD1.x, y: mergeD1.y, color: getStrokeByTarget('d1'), sources: 2 },
      { id: 'd3', x: mergeD3.x, y: mergeD3.y, color: getStrokeByTarget('d3'), sources: 2 },
    ],
    [mergeEt0.x, mergeEt0.y, mergeBh.x, mergeBh.y, mergeD1.x, mergeD1.y, mergeD3.x, mergeD3.y],
  );

  return (
    <section aria-label="Figura 2 – Variáveis, indicadores e decisões agroclimáticas" className="w-full bg-gradient-to-br from-[#fafbfc] to-[#f5f7fa] py-12">
  <div className="mx-auto flex w-full flex-col gap-8 px-4 sm:px-6 lg:px-8 overflow-x-auto">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between border-b-2 border-[#d1d9e0] pb-6">
          <header className="max-w-3xl space-y-3">
            <h1 className="text-3xl font-bold text-[#1a2332] tracking-tight">Figura 2 – Variáveis → Indicadores → Decisões</h1>
            <p className="text-base text-[#37474f] leading-relaxed">
              Encadeamento de variáveis meteorológicas (WMO-No. 8) em indicadores interoperáveis (OGC SensorThings)
              com cálculo de ET₀ conforme FAO-56 e resultantes decisões operacionais.
            </p>
          </header>
          <div className="flex shrink-0 items-center gap-3">
            <button type="button" className={toolbarButtonClass} onClick={() => exportAsSVG(svgRef, 'Figura02.svg')}>
              Exportar SVG
            </button>
            <button
              type="button"
              className={toolbarButtonClass}
              onClick={() => void exportDiagramPDF(svgRef, containerRef, 'Figura02.pdf')}
            >
              Exportar PDF
            </button>
          </div>
        </div>

  <div className="relative" aria-describedby="fig2-caption">
    <div ref={containerRef} className="grid grid-cols-1 gap-y-12 gap-x-6 lg:grid-cols-[465px_420px_400px] lg:gap-x-40 lg:gap-y-12">
          <svg
            ref={svgRef}
            width={svgWidth}
            height={svgHeight}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="pointer-events-none absolute inset-0 z-20 overflow-visible"
            shapeRendering="geometricPrecision"
            role="presentation"
            aria-hidden="true"
          >
            <defs>
              {/* Per-target markers (16×9 px) — refX=16 refY=4.5 so the arrow TIP is at the path endpoint (card edge) */}
              <marker id="arrowHead-et0" markerWidth="16" markerHeight="9" refX="16" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
                <polygon points="0 0, 16 4.5, 0 9" fill={STROKE_BY_TARGET.et0} />
              </marker>
              <marker id="arrowHead-bh" markerWidth="16" markerHeight="9" refX="16" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
                <polygon points="0 0, 16 4.5, 0 9" fill={STROKE_BY_TARGET.bh} />
              </marker>
              <marker id="arrowHead-gdd" markerWidth="16" markerHeight="9" refX="16" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
                <polygon points="0 0, 16 4.5, 0 9" fill={STROKE_BY_TARGET.gdd} />
              </marker>
              <marker id="arrowHead-d1" markerWidth="16" markerHeight="9" refX="16" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
                <polygon points="0 0, 16 4.5, 0 9" fill={STROKE_BY_TARGET.d1} />
              </marker>
              <marker id="arrowHead-d3" markerWidth="16" markerHeight="9" refX="16" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
                <polygon points="0 0, 16 4.5, 0 9" fill={STROKE_BY_TARGET.d3} />
              </marker>
              <marker id="arrowHead-d2" markerWidth="16" markerHeight="9" refX="16" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
                <polygon points="0 0, 16 4.5, 0 9" fill={STROKE_BY_TARGET.d2} />
              </marker>
              {/* Origin-based markers for Indicators → Decisions */}
              <marker id="arrowHead-origin-et0" markerWidth="16" markerHeight="9" refX="16" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
                <polygon points="0 0, 16 4.5, 0 9" fill="#283593" />
              </marker>
              <marker id="arrowHead-origin-bh" markerWidth="16" markerHeight="9" refX="16" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
                <polygon points="0 0, 16 4.5, 0 9" fill="#42A5F5" />
              </marker>
              <marker id="arrowHead-origin-gdd" markerWidth="16" markerHeight="9" refX="16" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
                <polygon points="0 0, 16 4.5, 0 9" fill="#4FC3F7" />
              </marker>
              <filter id="dropShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="1.5"/>
                <feOffset dx="0" dy="1" result="offsetblur"/>
                <feFlood floodColor="#1565c0" floodOpacity="0.15"/>
                <feComposite in2="offsetblur" operator="in"/>
                <feMerge>
                  <feMergeNode/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              {/* Subtle, stable glow for merge nodes (reduces flicker and color fringes) */}
              <filter id="mergeGlow" x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
                <feDropShadow dx="0" dy="0" stdDeviation="1" floodColor="#000000" floodOpacity="0.18"/>
              </filter>
            </defs>
            {connectors.map((connector) => (
              <path
                key={connector.id}
                d={connector.d}
                stroke={connector.color}
                strokeWidth={connector.width || 1.5}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                markerEnd={connector.arrow ? `url(#arrowHead-${connector.target})` : undefined}
              >
                <title>{connector.title}</title>
              </path>
            ))}

            {/* Subtle rounded merge nodes (only when more than one line merges) */}
            {mergeNodes
              .filter((n) => n.sources > 1)
              .map((n) => (
                <circle
                  key={`merge-node-${n.id}`}
                  cx={n.x}
                  cy={n.y}
                  r={MERGE_NODE_R}
                  fill="#ffffff"
                  stroke={n.color}
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                  filter="url(#mergeGlow)"
                />
              ))}
          </svg>

          <section className={laneClass} aria-labelledby="lane-variables">
            <div className={laneHeadClass} id="lane-variables">
              VARIÁVEIS METEOROLÓGICAS
            </div>
            <div className={laneBodyClass}>
              {variableCards.map(({ id, title, unit, description, Icon, ref }) => {
                return (
                  <article key={id} ref={ref} className={variableCardClass}>
                    <div className="flex items-center gap-4">
                      <div className={`${iconWrapperClass} shrink-0`} aria-hidden="true">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex w-full flex-col gap-y-1.5">
                        <div className="relative flex items-start">
                          <h2 className={`${cardTitleClass} flex-1 min-w-0 pr-16`}>{title}</h2>
                          {unit ? (
                            <span className={`${pillTextClass} shrink-0 absolute top-0 right-0`}>{unit}</span>
                          ) : null}
                        </div>
                        <p className={cardBodyTextClass}>{description}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className={laneClass} aria-labelledby="lane-indicadores">
            <div className={laneHeadClass} id="lane-indicadores">
              INDICADORES DERIVADOS
            </div>
            <div className={`${laneBodyClass}`} style={{ gap: '48px' }}>
              {indicatorCards.map(({ id, title, unit, description, Icon, ref }) => {
                return (
                  <article key={id} ref={ref} className={cardContainerClass}>
                    <div className="flex items-center gap-4">
                      <div className={`${iconWrapperClass} shrink-0`} aria-hidden="true">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex w-full flex-col gap-y-1.5">
                        <div className="relative flex items-start">
                          <h2 className={`${cardTitleClass} flex-1 min-w-0 pr-16`}>{title}</h2>
                          {unit ? (
                            <span className={`${pillTextClass} shrink-0 absolute top-0 right-0`}>{unit}</span>
                          ) : null}
                        </div>
                        <p className={cardBodyTextClass}>{description}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className={laneClass} aria-labelledby="lane-decisoes">
            <div className={laneHeadClass} id="lane-decisoes">
              DECISÃO OPERACIONAL
            </div>
            <div className={laneBodyClass}>
              {decisionCards.map(({ id, title, Icon, details, hint, ref }) => (
                <article key={id} ref={ref} className={cardContainerClass}>
                  <div className="flex w-full flex-col">
                    <div className="flex items-center gap-4 mb-3">
                      <div className={iconWrapperClass} aria-hidden="true">
                        <Icon className="h-4 w-4" />
                      </div>
                      <h2 className={`${cardTitleClass} uppercase tracking-wide`}>{title}</h2>
                    </div>
                    <div className="border-t border-[#d1d9e0] pt-2.5 pb-1.5">
                      <ul className="space-y-1 text-xs leading-snug text-[#37474f]">
                        {details.map(({ icon, text }) => (
                          <li key={text} className="flex items-start gap-2">
                            {icon && (
                              <span className="inline-flex w-6 justify-center text-base shrink-0 mt-0.5 text-[#1565c0] font-bold" aria-hidden="true">
                                {icon}
                              </span>
                            )}
                            <span className="flex-1">{text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <p className={hintClass}>{hint}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <footer className="col-span-full border-t-2 border-[#d1d9e0] pt-5 space-y-3 bg-white/50 rounded-lg px-6 py-4">
            <div className="mb-2">
              <h3 className="text-sm font-bold text-[#1a2332] mb-2">Cores dos conectores (por grupo)</h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-xs text-[#37474f]">
              <li className="flex items-center gap-2">
                <span className="inline-block h-1.5 w-10 rounded-full" style={{ backgroundColor: getStrokeByTarget('et0') }} />
                <span className="inline-flex items-center gap-1.5">
                  <strong>Grupo ET₀</strong>
                  <ArrowRight size={14} strokeWidth={2.5} className="text-[#607d8b]" aria-hidden="true" />
                  <span>Decisão de irrigação (D1)</span>
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-block h-1.5 w-10 rounded-full" style={{ backgroundColor: getStrokeByTarget('bh') }} />
                <span className="inline-flex items-center gap-1.5">
                  <strong>Grupo BH</strong>
                  <ArrowRight size={14} strokeWidth={2.5} className="text-[#607d8b]" aria-hidden="true" />
                  <span>Planejamento operacional (D3)</span>
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-block h-1.5 w-10 rounded-full" style={{ backgroundColor: getStrokeByTarget('gdd') }} />
                <span className="inline-flex items-center gap-1.5">
                  <strong>Grupo GDD</strong>
                  <ArrowRight size={14} strokeWidth={2.5} className="text-[#607d8b]" aria-hidden="true" />
                  <span>Manejo fitossanitário (D2)</span>
                </span>
              </li>
            </ul>
          </div>
          <p id="fig2-caption" className="text-sm text-[#1a2332] leading-6">
            <strong className="text-[#1565c0]">Legenda:</strong> Fluxo em duas etapas — (1) Variáveis
            <ArrowRight size={14} strokeWidth={2.5} className="inline mx-1 align-[-1px] text-[#607d8b]" aria-hidden="true" />
            Indicadores; (2) Indicadores
            <ArrowRight size={14} strokeWidth={2.5} className="inline mx-1 align-[-1px] text-[#607d8b]" aria-hidden="true" />
            Decisões. As setas usam três cores consistentes por grupo: ET₀/D1, BH/D3 e GDD/D2. Todas as conexões de um grupo compartilham a mesma cor ao longo de todo o percurso.
          </p>
        </footer>
        </div>
        </div>
      </div>
    </section>
  );
}
