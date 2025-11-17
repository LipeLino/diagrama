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
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
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

const FALLBACK_FONT_FAMILY = 'NotoSans-Regular';
const INTER_FONT_BY_WEIGHT: Record<number, string> = {
  400: 'Inter-400',
  600: 'Inter-600',
  700: 'Inter-700',
};

const FALLBACK_GLYPH_REGEX = /[\u2080-\u2089\u0391-\u03A9\u03B1-\u03C9\u1D00-\u1D7F\u2070-\u209F\u2200-\u22FF]/;

const normalizeFontWeight = (fontWeightInput: string | number | undefined): number => {
  if (typeof fontWeightInput === 'number') {
    if (fontWeightInput >= 700) return 700;
    if (fontWeightInput >= 600) return 600;
    return 400;
  }
  const value = (fontWeightInput ?? '400').toString().trim().toLowerCase();
  if (!value) return 400;
  if (value === 'bold' || value === 'bolder') return 700;
  if (value.includes('semi') || value === '600') return 600;
  const parsed = parseInt(value, 10);
  if (Number.isFinite(parsed)) {
    if (parsed >= 700) return 700;
    if (parsed >= 600) return 600;
    return 400;
  }
  return 400;
};

const resolveSvgFontFamily = (fontWeight: number): string => INTER_FONT_BY_WEIGHT[fontWeight] ?? INTER_FONT_BY_WEIGHT[400];

type TextRun = { text: string; fallback: boolean };

const splitTextIntoRuns = (text: string): TextRun[] => {
  if (!text) return [];
  const chars = Array.from(text);
  const runs: TextRun[] = [];
  let currentText = '';
  let currentFallback: boolean | null = null;
  chars.forEach((ch) => {
    const needsFallback = FALLBACK_GLYPH_REGEX.test(ch);
    if (currentFallback === null) {
      currentFallback = needsFallback;
      currentText = ch;
      return;
    }
    if (needsFallback === currentFallback) {
      currentText += ch;
      return;
    }
    runs.push({ text: currentText, fallback: currentFallback });
    currentText = ch;
    currentFallback = needsFallback;
  });
  if (currentText) {
    runs.push({ text: currentText, fallback: currentFallback ?? false });
  }
  return runs;
};

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

const DEBUG_DESCRIPTIONS = false;

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
  'whitespace-nowrap rounded-md bg-linear-to-r from-[#e3f2fd] to-[#bbdefb] px-3 py-1 text-[13px] font-bold text-[#0d47a1] border border-[#90caf9] antialiased';
const iconWrapperClass =
  'flex h-7 w-7 items-center justify-center rounded-lg bg-[#e3f2fd] text-[#1565C0] border border-[#90caf9] shadow-sm';

// Arrowhead geometry: 16×9 px, no padding - endpoints snap directly to card edge
const ARROW_LENGTH = 16;
const STRAIGHT_SEGMENT = 12; // Final straight perpendicular segment before arrow
// To avoid a 90° step when multiple connectors merge, ensure the merge node
// sits at least this extra distance before the start of the final straight stub.
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

/**
 * Captures a live DOM node (e.g., a Leaflet map) as a high-DPI PNG and embeds it into a 1:1
 * PDF page so the exported document matches the on-screen framing. Used when rebuilding a
 * fully vector snapshot would diverge from the rendered state.
 */
export const exportElementAsPngPDF = async (
  elementRef: ExportContainer,
  name: string,
  options?: { scale?: number },
) => {
  const element = elementRef.current;
  if (!element) return;

  const scale = options?.scale ?? Math.min(3, window.devicePixelRatio || 1);
  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    logging: false,
    backgroundColor: null,
    // html2canvas cannot parse modern color() / color-mix() in oklab;
    // strip those Tailwind base rules from the cloned document before rasterizing.
    onclone: (clonedDoc) => {
      clonedDoc
        .querySelectorAll<HTMLStyleElement>('style')
        .forEach((styleEl) => {
          if (styleEl.textContent && styleEl.textContent.includes('oklab')) {
            styleEl.parentElement?.removeChild(styleEl);
          }
        });
    },
  });

  const width = canvas.width || 1;
  const height = canvas.height || 1;
  const pngData = canvas.toDataURL('image/png');

  const pdf = new jsPDF({
    orientation: width >= height ? 'l' : 'p',
    unit: 'px',
    format: [width, height],
    compress: true,
  });

  pdf.addImage(pngData, 'PNG', 0, 0, width, height, undefined, 'FAST');
  pdf.save(name);
};

// Export a vector PDF containing only the diagram (SVG) and a vector caption (no title/header UI)
export const exportDiagramPDF = async (
  svgRef: ExportableSVG,
  containerRef: ExportContainer,
  name: string,
  options?: { padding?: number },
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

  const containerRect = containerEl.getBoundingClientRect();
  const svgRect = svgElement.getBoundingClientRect();
  // Tight framing: compute bounds across lanes + legend + connector overlay (exclude title/buttons)
  const laneEls = Array.from(containerEl.querySelectorAll('[data-export="lane"]')) as HTMLElement[];
  const legendForBounds = containerEl.querySelector('[data-export="legend"]') as HTMLElement | null;

  const connectorElements = Array.from(
    svgElement.querySelectorAll<SVGGraphicsElement>('path, circle, ellipse, line, polyline, polygon, text'),
  );
  const connectorRects = connectorElements
    .map((el) => el.getBoundingClientRect())
    .filter((rect) => Number.isFinite(rect.width) && Number.isFinite(rect.height) && (rect.width > 0 || rect.height > 0));

  const boundRects: DOMRect[] = connectorRects.length > 0 ? [...connectorRects] : [svgRect];
  boundRects.push(...laneEls.map((el) => el.getBoundingClientRect()));
  if (legendForBounds) {
    boundRects.push(legendForBounds.getBoundingClientRect());
  }
  // Include overlay labels, callouts, and headers in bounds so they are not cropped
  const extraForBounds = Array.from(
    containerEl.querySelectorAll<HTMLElement>('[data-export="stage-header"], [data-export="lane-title"], [data-export="connector-label"], [data-export="callout"]'),
  );
  if (extraForBounds.length) {
    boundRects.push(...extraForBounds.map((el) => el.getBoundingClientRect()));
  }
  if (!boundRects.length) {
    boundRects.push(containerRect);
  }

  let minL = Number.POSITIVE_INFINITY;
  let minT = Number.POSITIVE_INFINITY;
  let maxR = Number.NEGATIVE_INFINITY;
  let maxB = Number.NEGATIVE_INFINITY;
  boundRects.forEach((r) => {
    minL = Math.min(minL, r.left);
    minT = Math.min(minT, r.top);
    maxR = Math.max(maxR, r.right);
    maxB = Math.max(maxB, r.bottom);
  });
  if (!Number.isFinite(minL)) {
    // Fallback to container if query fails
    minL = containerRect.left;
    minT = containerRect.top;
    maxR = containerRect.right;
    maxB = containerRect.bottom;
  }
  const x0 = minL;
  const y0 = minT;
  const baseWidth = Math.max(1, Math.round(maxR - minL));
  const baseHeight = Math.max(1, Math.round(maxB - minT));

  // Create export SVG (diagram only; legend reconstructed separately via DOM layer)
  const NS = 'http://www.w3.org/2000/svg';
  const exportSvg = document.createElementNS(NS, 'svg');
  exportSvg.setAttribute('xmlns', NS);
  // Add a small padding around the entire diagram so background isn't flush to content
  const PADDING = Math.max(0, options?.padding ?? 4); // px on each side
  const paddedWidth = baseWidth + PADDING * 2;
  const paddedHeight = baseHeight + PADDING * 2;
  exportSvg.setAttribute('width', `${paddedWidth}`);
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
  // Solid white page background to avoid transparent-on-black PDF viewers
  const pageBg = document.createElementNS(NS, 'rect');
  pageBg.setAttribute('x', '0');
  pageBg.setAttribute('y', '0');
  pageBg.setAttribute('width', `${paddedWidth}`);
  pageBg.setAttribute('height', `${paddedHeight}`);
  pageBg.setAttribute('fill', '#ffffff');
  exportSvg.appendChild(pageBg);
  exportSvg.setAttribute('height', `${paddedHeight}`);
  exportSvg.setAttribute('viewBox', `0 0 ${paddedWidth} ${paddedHeight}`);

  // 1) Rebuild the HTML cards, lanes, and legend as vector shapes inside the SVG
  // Split into a back layer (lane backgrounds) and a front layer (cards, texts, legend)
  const domBackLayer = document.createElementNS(NS, 'g');
  const domLayer = document.createElementNS(NS, 'g');
  // Shift layers by the padding
  domBackLayer.setAttribute('transform', `translate(${PADDING},${PADDING})`);
  domLayer.setAttribute('transform', `translate(${PADDING},${PADDING})`);

  const measurementCanvas = document.createElement('canvas');
  const measureCtx = measurementCanvas.getContext('2d');
  if (!measureCtx) {
    throw new Error('Canvas measurement context unavailable for PDF export');
  }

  type CornerRadii = number | Partial<Record<'tl' | 'tr' | 'br' | 'bl', number>>;

  const roundedRect = (
    x: number,
    y: number,
    w: number,
    h: number,
    radius: CornerRadii,
    fill: string,
    stroke?: string,
    strokeWidth: number = 1,
  ) => {
    const limit = Math.max(0, Math.min(w, h) / 2);
    const raw = typeof radius === 'number'
      ? { tl: radius, tr: radius, br: radius, bl: radius }
      : {
          tl: radius.tl ?? 0,
          tr: radius.tr ?? 0,
          br: radius.br ?? 0,
          bl: radius.bl ?? 0,
        };
    const clamp = (value: number) => Math.max(0, Math.min(value, limit));
    const radii = {
      tl: clamp(raw.tl),
      tr: clamp(raw.tr),
      br: clamp(raw.br),
      bl: clamp(raw.bl),
    };

    const path = document.createElementNS(NS, 'path');
    const d = [
      `M ${(x + radii.tl).toFixed(2)} ${y.toFixed(2)}`,
      `H ${(x + w - radii.tr).toFixed(2)}`,
      `Q ${(x + w).toFixed(2)} ${y.toFixed(2)} ${(x + w).toFixed(2)} ${(y + radii.tr).toFixed(2)}`,
      `V ${(y + h - radii.br).toFixed(2)}`,
      `Q ${(x + w).toFixed(2)} ${(y + h).toFixed(2)} ${(x + w - radii.br).toFixed(2)} ${(y + h).toFixed(2)}`,
      `H ${(x + radii.bl).toFixed(2)}`,
      `Q ${x.toFixed(2)} ${(y + h).toFixed(2)} ${x.toFixed(2)} ${(y + h - radii.bl).toFixed(2)}`,
      `V ${(y + radii.tl).toFixed(2)}`,
      `Q ${x.toFixed(2)} ${y.toFixed(2)} ${(x + radii.tl).toFixed(2)} ${y.toFixed(2)}`,
      'Z',
    ];
    path.setAttribute('d', d.join(' '));
    path.setAttribute('fill', fill);
    if (stroke) {
      path.setAttribute('stroke', stroke);
      path.setAttribute('stroke-width', `${strokeWidth}`);
    }
    return path;
  };

  const parsePx = (value: string | null, fallback: number) => {
    if (!value) return fallback;
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const getLineHeightPx = (style: CSSStyleDeclaration, fontSize: number) => {
    const lh = style.lineHeight;
    if (!lh || lh === 'normal') return fontSize * 1.4;
    if (lh.endsWith('px')) {
      const px = parseFloat(lh);
      return Number.isFinite(px) ? px : fontSize * 1.4;
    }
    const ratio = parseFloat(lh);
    if (Number.isFinite(ratio)) return ratio * fontSize;
    return fontSize * 1.4;
  };

  const applyTextTransform = (text: string, transform: string) => {
    switch (transform) {
      case 'uppercase':
        return text.toUpperCase();
      case 'lowercase':
        return text.toLowerCase();
      case 'capitalize':
        return text.replace(/\b(\p{L})/gu, (match) => match.toUpperCase());
      default:
        return text;
    }
  };

  const configureFont = (style: CSSStyleDeclaration) => {
    const fontStyle = style.fontStyle || 'normal';
    const fontVariant = style.fontVariant || 'normal';
    const fontWeight = style.fontWeight || '400';
    const fontSize = style.fontSize || '14px';
    const fontFamily = style.fontFamily || FONT_STACK;
    measureCtx.font = `${fontStyle} ${fontVariant} ${fontWeight} ${fontSize} ${fontFamily}`.trim();
  };

  const measureStringWidth = (text: string, style: CSSStyleDeclaration) => {
    if (!text) return 0;
    configureFont(style);
    const base = measureCtx.measureText(text).width;
    const letterSpacing = style.letterSpacing && style.letterSpacing !== 'normal' ? parsePx(style.letterSpacing, 0) : 0;
    const wordSpacing = style.wordSpacing && style.wordSpacing !== 'normal' ? parsePx(style.wordSpacing, 0) : 0;
    if (!letterSpacing && !wordSpacing) return base;
    const letters = Math.max(0, text.length - 1);
    const words = Math.max(0, (text.match(/\s+/g) || []).length);
    return base + letterSpacing * letters + wordSpacing * words;
  };

  const wrapTextExact = (text: string, maxWidth: number, style: CSSStyleDeclaration) => {
    if (!text) return [''];
    if (maxWidth <= 0) return [text];
    const whiteSpace = (style.whiteSpace || '').toLowerCase();
    if (whiteSpace === 'nowrap' || whiteSpace.startsWith('pre')) {
      return [text];
    }
    const words = text.split(/\s+/).filter(Boolean);
    if (!words.length) return [''];
    const lines: string[] = [];
    let current = '';

    const breakToken = (token: string) => {
      let chunk = '';
      for (const char of token) {
        const candidate = chunk ? `${chunk}${char}` : char;
        if (measureStringWidth(candidate, style) > maxWidth && chunk) {
          lines.push(chunk);
          chunk = char;
        } else {
          chunk = candidate;
        }
      }
      return chunk;
    };

    words.forEach((word) => {
      const candidate = current ? `${current} ${word}` : word;
      if (measureStringWidth(candidate, style) <= maxWidth) {
        current = candidate;
        return;
      }

      if (current) {
        lines.push(current);
        current = '';
      }

      if (measureStringWidth(word, style) <= maxWidth) {
        current = word;
      } else {
        current = breakToken(word);
      }
    });

    if (current) {
      lines.push(current);
    }

    return lines;
  };

  type TextOptions = { align?: 'left' | 'center'; color?: string };

  type AnchoredTextElement = SVGTextElement & {
    _anchorX?: number;
    _baselineY?: number;
  };

  const populateTextNodeWithLines = (
    textEl: SVGTextElement,
    lines: string[],
    anchorX: number,
    lineHeight: number,
    fontFamily: string,
    fontWeight: string,
    letterSpacing?: string,
  ) => {
    while (textEl.firstChild) {
      textEl.removeChild(textEl.firstChild);
    }
    lines.forEach((line, lineIndex) => {
      const runs = splitTextIntoRuns(line);
      if (!runs.length) {
        runs.push({ text: '', fallback: false });
      }
      runs.forEach((run, runIndex) => {
        const tspan = document.createElementNS(NS, 'tspan');
        if (runIndex === 0) {
          tspan.setAttribute('x', `${anchorX}`);
          if (lineIndex > 0) {
            tspan.setAttribute('dy', `${lineHeight}`);
          }
        }
        const family = run.fallback ? FALLBACK_FONT_FAMILY : fontFamily;
        const weight = run.fallback ? '400' : fontWeight;
        tspan.setAttribute('font-family', family);
        tspan.setAttribute('font-weight', weight);
        if (letterSpacing) {
          tspan.setAttribute('letter-spacing', letterSpacing);
        }
        tspan.textContent = run.text;
        textEl.appendChild(tspan);
      });
    });
  };

  const createTextFromElement = (el: HTMLElement, options: TextOptions = {}): SVGTextElement | null => {
  const rect = el.getBoundingClientRect();
  const style = getComputedStyle(el);
  const datasetExport = el.dataset?.export ?? '';
    const paddingLeft = parsePx(style.paddingLeft, 0);
    const paddingRight = parsePx(style.paddingRight, 0);
    const paddingTop = parsePx(style.paddingTop, 0);
    const fontSize = parsePx(style.fontSize, 14);
    const lineHeight = getLineHeightPx(style, fontSize);
    const align = options.align ?? (style.textAlign === 'center' ? 'center' : 'left');

    const raw = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (!raw) {
      console.warn('createTextFromElement: empty text content for', el);
      return null;
    }
    const transformed = applyTextTransform(raw, style.textTransform || 'none');
    // Primary width from the element box; if unreliable (0/very small/NaN), fallback to the host card width.
    let maxWidth = Math.max(0, rect.width - paddingLeft - paddingRight);
  const host = el.closest('article[data-export-card]') as HTMLElement | null;
  const hostRect = host?.getBoundingClientRect();
  const hostStyle = host ? getComputedStyle(host) : null;
    if ((!Number.isFinite(maxWidth) || maxWidth < 4) && hostRect) {
      maxWidth = Math.max(80, hostRect.width - 32); // generous inner width
    }
    let lines = wrapTextExact(transformed, maxWidth, style);
    const isDecisionTitle = datasetExport === 'card-title' && host?.getAttribute('data-export-card') === 'decision';
    const isLegendText = datasetExport === 'legend-text' || datasetExport === 'legend-paragraph';
    if (isDecisionTitle) {
      const singleLineHeightThreshold = lineHeight * 1.25;
      const appearsSingleLine = rect.height <= singleLineHeightThreshold;
      if (lines.length !== 1 && appearsSingleLine) {
        lines = [transformed];
      }
    } else if (isLegendText) {
      lines = [transformed];
    }
    // Safety: if wrapping produced no lines due to a zero/NaN width edge case,
    // render a single unwrapped line so content never disappears in the PDF.
    if (!lines || lines.length === 0) {
      console.warn('createTextFromElement: wrapping produced no lines, using unwrapped fallback for', raw);
      lines = [transformed];
    }

  const textElement = document.createElementNS(NS, 'text') as AnchoredTextElement;
    // Compute X/Y with robust fallbacks; ensure we never emit NaN which would place text at 0,0 in some renderers.
    const safe = (v: number | undefined, fb: number) => (Number.isFinite(v as number) ? (v as number) : fb);
    const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
    // If element width is unreliable, anchor to host padding area.
    const useHostX = !!hostRect && (!Number.isFinite(rect.width) || rect.width < 4);
    const rectLeft = safe(rect.left, (hostRect ? hostRect.left : x0 + 16));
    const rectTop = safe(rect.top, (hostRect ? hostRect.top : y0 + 16));
    const hostPadLeft = parsePx(hostStyle?.paddingLeft || null, 16);
    const hostPadRight = parsePx(hostStyle?.paddingRight || null, 16);
    const hostPadTop = parsePx(hostStyle?.paddingTop || null, 16);
    const hostPadBottom = parsePx(hostStyle?.paddingBottom || null, 16);
    const baseLeft = useHostX ? (safe(hostRect?.left, x0 + 16) - x0 + hostPadLeft) : (rectLeft - x0 + paddingLeft);
    const anchorX = align === 'center'
      ? baseLeft + maxWidth / 2
      : baseLeft;
    const topY = rectTop - y0 + paddingTop;
    let baseline = topY + (lineHeight - fontSize) / 2 + fontSize;
    if (!Number.isFinite(baseline)) {
      // Fallback baseline roughly one line below the host top.
      const hostTop = safe(hostRect?.top, y0 + 16);
      baseline = (hostTop - y0) + hostPadTop + fontSize;
    }

    // Extra safety for card descriptions: ensure text sits inside the card bounds even if layout metrics glitch
    if (el.getAttribute('data-export') === 'card-description' && hostRect) {
      const minX = (hostRect.left - x0) + hostPadLeft;
      const maxX = (hostRect.right - x0) - hostPadRight;
      const minY = (hostRect.top - y0) + hostPadTop + fontSize * 0.9;
      const maxY = (hostRect.bottom - y0) - hostPadBottom - fontSize * 0.5;
      // reassign clamped values
      const clampedX = clamp(anchorX, minX, maxX);
      const clampedY = clamp(baseline, minY, maxY);
      // Apply the clamped coordinates
      // Note: we can't change 'anchorX' const; recompute local variables instead
      // We'll set attributes using these values below
      textElement._anchorX = clampedX;
      textElement._baselineY = clampedY;
    }

  const finalX = textElement._anchorX ?? anchorX;
  const finalY = textElement._baselineY ?? baseline;
  textElement.setAttribute('x', `${finalX}`);
  textElement.setAttribute('y', `${finalY}`);
    textElement.setAttribute('fill', options.color ?? style.color ?? COLORS.text);
    textElement.setAttribute('font-size', `${fontSize}`);
    // Map to concrete Inter font files to preserve exact weights in PDF
    const normalizedWeight = normalizeFontWeight(style.fontWeight || '400');
    const svgFamily = resolveSvgFontFamily(normalizedWeight);
    const weightString = `${normalizedWeight}`;
    textElement.setAttribute('font-family', svgFamily);
    textElement.setAttribute('font-weight', weightString);
    textElement.setAttribute('font-style', style.fontStyle || 'normal');
    textElement.setAttribute('dominant-baseline', 'alphabetic');
    textElement.setAttribute('text-rendering', 'geometricPrecision');
    if (align === 'center') {
      textElement.setAttribute('text-anchor', 'middle');
    }
    const letterSpacing = style.letterSpacing;
    if (letterSpacing && letterSpacing !== 'normal') {
      textElement.setAttribute('letter-spacing', letterSpacing);
    }

    populateTextNodeWithLines(textElement, lines, textElement._anchorX ?? anchorX, lineHeight, svgFamily, weightString, letterSpacing && letterSpacing !== 'normal' ? letterSpacing : undefined);

    return textElement;
  };

  type DescriptionLayout = {
    lines: string[];
    anchorX: number;
    baseline: number;
    fontSize: number;
    lineHeight: number;
    fill: string;
    fontWeight: string;
    fontStyle: string;
    fontFamily: string;
    letterSpacing?: string;
  };

  const computeDescriptionLayout = (
    cardEl: HTMLElement,
    descriptionEl: HTMLElement,
    titleEl: HTMLElement | null,
    x0Ref: number,
    y0Ref: number,
  ): DescriptionLayout | null => {
    const hostStyle = getComputedStyle(cardEl);
    const descStyle = getComputedStyle(descriptionEl);
    const hostPadLeft = parsePx(hostStyle.paddingLeft, 16);
    const hostPadRight = parsePx(hostStyle.paddingRight, 16);
    const hostPadTop = parsePx(hostStyle.paddingTop, 16);
    const hostPadBottom = parsePx(hostStyle.paddingBottom, 16);
    const marginTop = parsePx(descStyle.marginTop, 0);
    const fontSize = parsePx(descStyle.fontSize, 13);
    const lineHeight = getLineHeightPx(descStyle, fontSize);
    const descPadLeft = parsePx(descStyle.paddingLeft, 0);
    const descPadRight = parsePx(descStyle.paddingRight, 0);
    const descPadTop = parsePx(descStyle.paddingTop, 0);
    const raw = (descriptionEl.textContent || '').replace(/\s+/g, ' ').trim();
    if (!raw) {
      return null;
    }
    const rect = cardEl.getBoundingClientRect();
    const titleRect = titleEl?.getBoundingClientRect();
    const columnLeft = titleRect ? titleRect.left : rect.left + hostPadLeft;
    const columnRight = rect.right - hostPadRight;
    const maxWidth = Math.max(80, columnRight - columnLeft - descPadLeft - descPadRight);
    const transformed = applyTextTransform(raw, descStyle.textTransform || 'none');
    let lines = wrapTextExact(transformed, maxWidth, descStyle);
    if (!lines || lines.length === 0) {
      lines = [transformed];
    }
    const topBaselineStart = titleRect ? titleRect.bottom - y0Ref : rect.top - y0Ref + hostPadTop;
    const unclampedBaseline = topBaselineStart + marginTop + descPadTop + (lineHeight - fontSize) / 2 + fontSize;
    const unclampedAnchorX = columnLeft - x0Ref + descPadLeft;
    const minX = rect.left - x0Ref + hostPadLeft;
    const maxX = rect.right - x0Ref - hostPadRight;
    const minY = rect.top - y0Ref + hostPadTop + fontSize * 0.9;
    const maxY = rect.bottom - y0Ref - hostPadBottom - fontSize * 0.5;
    const clampVal = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
    const anchorX = clampVal(unclampedAnchorX, minX, maxX);
    const baseline = clampVal(unclampedBaseline, minY, maxY);
    const weightNumeric = normalizeFontWeight(descStyle.fontWeight || '400');
    const fontWeight = `${weightNumeric}`;
    const fontStyle = descStyle.fontStyle || 'normal';
    const fill = descStyle.color || COLORS.text;
    const fontFamily = resolveSvgFontFamily(weightNumeric);
    const letterSpacing = descStyle.letterSpacing && descStyle.letterSpacing !== 'normal' ? descStyle.letterSpacing : undefined;
    return {
      lines,
      anchorX,
      baseline,
      fontSize,
      lineHeight,
      fill,
      fontWeight,
      fontStyle,
      fontFamily,
      letterSpacing,
    };
  };

  const applyDescriptionLayoutToText = (
    textEl: SVGTextElement,
    layout: DescriptionLayout,
  ) => {
    textEl.setAttribute('x', `${layout.anchorX}`);
    textEl.setAttribute('y', `${layout.baseline}`);
    textEl.setAttribute('fill', layout.fill);
    textEl.setAttribute('font-size', `${layout.fontSize}`);
    textEl.setAttribute('font-family', layout.fontFamily);
    textEl.setAttribute('font-weight', layout.fontWeight);
    textEl.setAttribute('font-style', layout.fontStyle);
    textEl.setAttribute('dominant-baseline', 'alphabetic');
    textEl.setAttribute('text-rendering', 'geometricPrecision');
    textEl.setAttribute('text-anchor', 'start');
    if (layout.letterSpacing) {
      textEl.setAttribute('letter-spacing', layout.letterSpacing);
    } else {
      textEl.removeAttribute('letter-spacing');
    }
    populateTextNodeWithLines(textEl, layout.lines, layout.anchorX, layout.lineHeight, layout.fontFamily, layout.fontWeight, layout.letterSpacing);
  };

  // Lane backgrounds
  const laneSections = Array.from(containerEl.querySelectorAll('[data-export="lane"]')) as HTMLElement[];
  laneSections.forEach((lane) => {
    const rect = lane.getBoundingClientRect();
    const style = getComputedStyle(lane);
    const radius = parsePx(style.borderRadius, 16);
    const stroke = style.borderTopColor || COLORS.border;
    const strokeWidth = parsePx(style.borderTopWidth, 2);
  const x = rect.left - x0;
  const y = rect.top - y0;

    const shadow1 = roundedRect(x, y, rect.width, rect.height, radius, '#000000');
    shadow1.setAttribute('fill-opacity', '0.04');
    shadow1.setAttribute('transform', 'translate(0,1)');
  domBackLayer.appendChild(shadow1);
    const shadow2 = roundedRect(x, y, rect.width, rect.height, radius, '#000000');
    shadow2.setAttribute('fill-opacity', '0.025');
    shadow2.setAttribute('transform', 'translate(0,2)');
  domBackLayer.appendChild(shadow2);

    const body = roundedRect(x, y, rect.width, rect.height, radius, 'url(#panelGrad)', stroke, strokeWidth);
    domBackLayer.appendChild(body);
  });

  // Lane headers (drawn atop background)
  const laneHeaders = Array.from(containerEl.querySelectorAll('[data-export="lane-header"]')) as HTMLElement[];
  laneHeaders.forEach((header) => {
    const rect = header.getBoundingClientRect();
  const x = rect.left - x0;
  const y = rect.top - y0;
    const bar = roundedRect(
      x,
      y,
      rect.width,
      rect.height,
      { tl: 12, tr: 12, br: 0, bl: 0 },
      COLORS.laneHead,
    );
    domLayer.appendChild(bar);
    const text = createTextFromElement(header, { align: 'center', color: '#ffffff' });
    if (text) {
      domLayer.appendChild(text);
    }
  });

  // Stage column headers (top row)
  const stageHeaders = Array.from(containerEl.querySelectorAll('[data-export="stage-header"]')) as HTMLElement[];
  stageHeaders.forEach((header) => {
    const text = createTextFromElement(header, { align: 'center' });
    if (text) domLayer.appendChild(text);
  });

  // Lane vertical titles (rotated)
  const laneTitles = Array.from(containerEl.querySelectorAll('[data-export="lane-title"]')) as HTMLElement[];
  laneTitles.forEach((titleEl) => {
    const rect = titleEl.getBoundingClientRect();
    const cx = rect.left - x0 + rect.width / 2;
    const cy = rect.top - y0 + rect.height / 2;
    const text = createTextFromElement(titleEl, { align: 'center' });
    if (text) {
      text.setAttribute('x', `${cx}`);
      text.setAttribute('y', `${cy}`);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('transform', `rotate(-90 ${cx} ${cy})`);
      domLayer.appendChild(text);
    }
  });

  // Cards and inner content
  const debugAnnotations: Array<{ id: string; x: number; y: number; note: string }> = [];
  const cards = Array.from(containerEl.querySelectorAll('article[data-export-card]')) as HTMLElement[];
  cards.forEach((cardEl) => {
    const cardId = cardEl.getAttribute('data-export-card-id') ?? '';
    const rect = cardEl.getBoundingClientRect();
    const style = getComputedStyle(cardEl);
    const radius = parsePx(style.borderRadius, 10);
    const stroke = style.borderTopColor || COLORS.cardBorder;
    const strokeWidth = parsePx(style.borderTopWidth, 1);
  const x = rect.left - x0;
  const y = rect.top - y0;

    const shadow1 = roundedRect(x, y, rect.width, rect.height, radius, '#000000');
    shadow1.setAttribute('fill-opacity', '0.05');
    shadow1.setAttribute('transform', 'translate(0,1)');
    domLayer.appendChild(shadow1);
    const shadow2 = roundedRect(x, y, rect.width, rect.height, radius, '#000000');
    shadow2.setAttribute('fill-opacity', '0.03');
    shadow2.setAttribute('transform', 'translate(0,2)');
    domLayer.appendChild(shadow2);

    const body = roundedRect(x, y, rect.width, rect.height, radius, 'url(#panelGrad)', stroke, strokeWidth);
    domLayer.appendChild(body);

    const iconWrapper = cardEl.querySelector('[data-export="icon-wrapper"]') as HTMLElement | null;
    if (iconWrapper) {
      const iRect = iconWrapper.getBoundingClientRect();
      const iStyle = getComputedStyle(iconWrapper);
      const iconRadius = parsePx(iStyle.borderRadius, 8);
      const iconStroke = iStyle.borderTopColor || '#90caf9';
      const iconStrokeWidth = parsePx(iStyle.borderTopWidth, 1);
      const wrapperRect = roundedRect(
  iRect.left - x0,
  iRect.top - y0,
        iRect.width,
        iRect.height,
        iconRadius,
        iStyle.backgroundColor || COLORS.iconBg,
        iconStroke,
        iconStrokeWidth,
      );
      domLayer.appendChild(wrapperRect);

      const iconSvg = iconWrapper.querySelector('svg[data-export="icon"]');
      if (iconSvg) {
  const svgRect = iconSvg.getBoundingClientRect();
        const svgClone = iconSvg.cloneNode(true) as SVGSVGElement;
  svgClone.setAttribute('x', `${svgRect.left - x0}`);
  svgClone.setAttribute('y', `${svgRect.top - y0}`);
        svgClone.setAttribute('width', `${svgRect.width}`);
        svgClone.setAttribute('height', `${svgRect.height}`);
        const svgStyle = getComputedStyle(iconSvg);
        const strokeColor = svgStyle.stroke && svgStyle.stroke !== 'none'
          ? svgStyle.stroke
          : svgStyle.color || COLORS.iconBorder;
        svgClone.setAttribute('stroke', strokeColor);
        const strokeWidthValue = svgStyle.strokeWidth && svgStyle.strokeWidth !== 'none'
          ? svgStyle.strokeWidth
          : '2';
        svgClone.setAttribute('stroke-width', strokeWidthValue);
        svgClone.setAttribute('stroke-linecap', 'round');
        svgClone.setAttribute('stroke-linejoin', 'round');
        svgClone.setAttribute('fill', svgStyle.fill && svgStyle.fill !== 'none' ? svgStyle.fill : 'none');
        domLayer.appendChild(svgClone);
      }
    }

    const titleEl = cardEl.querySelector('[data-export="card-title"]') as HTMLElement | null;
    if (titleEl) {
      const textEl = createTextFromElement(titleEl);
      if (textEl) {
        domLayer.appendChild(textEl);
      }
    }

    const descriptionEl = cardEl.querySelector('[data-export="card-description"]') as HTMLElement | null;
    if (descriptionEl) {
      const layout = computeDescriptionLayout(cardEl, descriptionEl, titleEl, x0, y0);
      let textNode = createTextFromElement(descriptionEl);
      let appended = false;

      if (textNode) {
        const anchorXRaw = parseFloat(textNode.getAttribute('x') ?? 'NaN');
        const anchorYRaw = parseFloat(textNode.getAttribute('y') ?? 'NaN');
        const invalid = !Number.isFinite(anchorXRaw) || !Number.isFinite(anchorYRaw) || (Math.abs(anchorXRaw) < 0.5 && Math.abs(anchorYRaw) < 0.5);
        if (!invalid) {
          domLayer.appendChild(textNode);
          appended = true;
          if (DEBUG_DESCRIPTIONS) {
            debugAnnotations.push({
              id: cardId || 'unknown',
              x: anchorXRaw,
              y: anchorYRaw,
              note: `${cardId || '?'} desc anchor`,
            });
          }
        }
      }

      if (!appended && layout) {
        if (!textNode) {
          textNode = document.createElementNS(NS, 'text');
        }
        applyDescriptionLayoutToText(textNode, layout);
        domLayer.appendChild(textNode);
        appended = true;
        if (DEBUG_DESCRIPTIONS) {
          debugAnnotations.push({
            id: cardId || 'unknown',
            x: layout.anchorX,
            y: layout.baseline,
            note: `${cardId || '?'} desc anchor`,
          });
        }
      }
    }

    const unitEl = cardEl.querySelector('[data-export="unit-pill"]') as HTMLElement | null;
    if (unitEl) {
      const pillRect = unitEl.getBoundingClientRect();
      const pillStyle = getComputedStyle(unitEl);
      const pillRadius = parsePx(pillStyle.borderRadius, 6);
      const pillStroke = pillStyle.borderTopColor || '#90caf9';
      const pillStrokeWidth = parsePx(pillStyle.borderTopWidth, 1);
      const pill = roundedRect(
  pillRect.left - x0,
  pillRect.top - y0,
        pillRect.width,
        pillRect.height,
        pillRadius,
        'url(#pillGrad)',
        pillStroke,
        pillStrokeWidth,
      );
      domLayer.appendChild(pill);
      const unitText = createTextFromElement(unitEl);
      if (unitText) {
        domLayer.appendChild(unitText);
      }
    }

    const dividerEl = cardEl.querySelector('[data-export="card-divider"]') as HTMLElement | null;
    if (dividerEl) {
      const dRect = dividerEl.getBoundingClientRect();
      const divStyle = getComputedStyle(dividerEl);
      const divider = document.createElementNS(NS, 'line');
  const yPos = dRect.top - y0 + parsePx(divStyle.borderTopWidth, 1) / 2;
  divider.setAttribute('x1', `${dRect.left - x0}`);
  divider.setAttribute('x2', `${dRect.right - x0}`);
      divider.setAttribute('y1', `${yPos}`);
      divider.setAttribute('y2', `${yPos}`);
      divider.setAttribute('stroke', divStyle.borderTopColor || '#d1d9e0');
      divider.setAttribute('stroke-width', divStyle.borderTopWidth || '1');
      domLayer.appendChild(divider);
    }

    const detailIcons = Array.from(cardEl.querySelectorAll('[data-export="detail-icon"]')) as HTMLElement[];
    detailIcons.forEach((iconEl) => {
      const iconText = createTextFromElement(iconEl, { align: 'center' });
      if (iconText) {
        domLayer.appendChild(iconText);
      }
    });

    const detailTexts = Array.from(cardEl.querySelectorAll('[data-export="detail-text"]')) as HTMLElement[];
    detailTexts.forEach((detailEl) => {
      const detailText = createTextFromElement(detailEl);
      if (detailText) {
        domLayer.appendChild(detailText);
      }
    });

    const hintEl = cardEl.querySelector('[data-export="card-hint"]') as HTMLElement | null;
    if (hintEl) {
      const hRect = hintEl.getBoundingClientRect();
      const hStyle = getComputedStyle(hintEl);
      const hintRadius = parsePx(hStyle.borderRadius, 6);
      const hintStroke = hStyle.borderTopColor || '#90caf9';
      const hintStrokeWidth = parsePx(hStyle.borderTopWidth, 1);
      const hintBox = roundedRect(
  hRect.left - x0,
  hRect.top - y0,
        hRect.width,
        hRect.height,
        hintRadius,
        hStyle.backgroundColor || '#e3f2fd',
        hintStroke,
        hintStrokeWidth,
      );
      domLayer.appendChild(hintBox);
      const hintText = createTextFromElement(hintEl);
      if (hintText) {
        domLayer.appendChild(hintText);
      }
    }
  });

  if (DEBUG_DESCRIPTIONS && debugAnnotations.length) {
    debugAnnotations.forEach(({ id, x, y, note }) => {
      const marker = document.createElementNS(NS, 'circle');
      marker.setAttribute('cx', `${x}`);
      marker.setAttribute('cy', `${y}`);
      marker.setAttribute('r', '3');
      marker.setAttribute('fill', '#ff1744');
      marker.setAttribute('stroke', '#ffffff');
      marker.setAttribute('stroke-width', '1');
      marker.setAttribute('data-debug', `anchor-${id}`);
      domLayer.appendChild(marker);

      const label = document.createElementNS(NS, 'text');
      label.setAttribute('x', `${x + 6}`);
      label.setAttribute('y', `${y - 6}`);
      label.setAttribute('fill', '#d32f2f');
      label.setAttribute('font-size', '10');
      label.setAttribute('font-family', 'Inter-400');
      label.setAttribute('font-weight', '400');
      label.textContent = note;
      label.setAttribute('data-debug', `label-${id}`);
      domLayer.appendChild(label);
    });
  }

  // Legend container and contents
  const legendWrapper = containerEl.querySelector('[data-export="legend"]') as HTMLElement | null;
  if (legendWrapper) {
    const legendRect = legendWrapper.getBoundingClientRect();
    const legendStyle = getComputedStyle(legendWrapper);
    const legendRadius = parsePx(legendStyle.borderRadius, 12);
    const legendStroke = legendStyle.borderTopColor || legendStyle.borderColor || '#d1d9e0';
    const legendStrokeWidth = parsePx(legendStyle.borderTopWidth || legendStyle.borderWidth, 1);
  const lx = legendRect.left - x0;
  const ly = legendRect.top - y0;

    const legendShadow1 = roundedRect(lx, ly, legendRect.width, legendRect.height, legendRadius, '#000000');
    legendShadow1.setAttribute('fill-opacity', '0.04');
    legendShadow1.setAttribute('transform', 'translate(0,1)');
    domLayer.appendChild(legendShadow1);
    const legendShadow2 = roundedRect(lx, ly, legendRect.width, legendRect.height, legendRadius, '#000000');
    legendShadow2.setAttribute('fill-opacity', '0.025');
    legendShadow2.setAttribute('transform', 'translate(0,2)');
    domLayer.appendChild(legendShadow2);

    const legendBody = roundedRect(
      lx,
      ly,
      legendRect.width,
      legendRect.height,
      legendRadius,
      // Force solid white caption background to avoid rgba() -> black fallbacks in svg-to-pdf
      // and to ensure readability regardless of viewer theme.
      '#ffffff',
      legendStroke,
      legendStrokeWidth,
    );
    domLayer.appendChild(legendBody);

    // Legend pill wrappers (rounded rectangles around each element group)
    const legendPills = Array.from(legendWrapper.querySelectorAll('[data-export="legend-pill"]')) as HTMLElement[];
    legendPills.forEach((pill) => {
      const pRect = pill.getBoundingClientRect();
      const pStyle = getComputedStyle(pill);
      const pRadius = parsePx(pStyle.borderRadius, 8);
      const pStroke = pStyle.borderTopColor || pStyle.borderColor || '#d6dde8';
      const pStrokeWidth = parsePx(pStyle.borderTopWidth || pStyle.borderWidth, 1);
      // Force solid white background for PDF export (rgba values with transparency may render incorrectly)
      const pFill = '#ffffff';
      const pillRect = roundedRect(
        pRect.left - x0,
        pRect.top - y0,
        pRect.width,
        pRect.height,
        pRadius,
        pFill,
        pStroke,
        pStrokeWidth,
      );
      domLayer.appendChild(pillRect);
    });

    const legendSwatches = Array.from(legendWrapper.querySelectorAll('[data-export="legend-swatch"]')) as HTMLElement[];
    legendSwatches.forEach((swatch) => {
      const swRect = swatch.getBoundingClientRect();
      const swStyle = getComputedStyle(swatch);
      const swRadius = parsePx(swStyle.borderRadius, swRect.height / 2);
      const sw = roundedRect(
  swRect.left - x0,
  swRect.top - y0,
        swRect.width,
        swRect.height,
        swRadius,
        swStyle.backgroundColor || '#90caf9',
      );
      domLayer.appendChild(sw);
    });

    // Legend icons (e.g., activity icon) if present
    const legendIcons = Array.from(legendWrapper.querySelectorAll('[data-export="icon-wrapper"]')) as HTMLElement[];
    legendIcons.forEach((iconWrapper) => {
      const iRect = iconWrapper.getBoundingClientRect();
      const iStyle = getComputedStyle(iconWrapper);
      const iconRadius = parsePx(iStyle.borderRadius, 8);
      const iconStroke = iStyle.borderTopColor || '#90caf9';
      const iconStrokeWidth = parsePx(iStyle.borderTopWidth, 1);
      const wrapperRect = roundedRect(
        iRect.left - x0,
        iRect.top - y0,
        iRect.width,
        iRect.height,
        iconRadius,
        iStyle.backgroundColor || COLORS.iconBg,
        iconStroke,
        iconStrokeWidth,
      );
      domLayer.appendChild(wrapperRect);

      const iconSvg = iconWrapper.querySelector('svg[data-export="icon"]');
      if (iconSvg) {
        const svgRect = iconSvg.getBoundingClientRect();
        const svgClone = iconSvg.cloneNode(true) as SVGSVGElement;
        svgClone.setAttribute('x', `${svgRect.left - x0}`);
        svgClone.setAttribute('y', `${svgRect.top - y0}`);
        svgClone.setAttribute('width', `${svgRect.width}`);
        svgClone.setAttribute('height', `${svgRect.height}`);
        const svgStyle = getComputedStyle(iconSvg);
        const strokeColor = svgStyle.stroke && svgStyle.stroke !== 'none'
          ? svgStyle.stroke
          : svgStyle.color || COLORS.iconBorder;
        svgClone.setAttribute('stroke', strokeColor);
        const strokeWidthValue = svgStyle.strokeWidth && svgStyle.strokeWidth !== 'none'
          ? svgStyle.strokeWidth
          : '2';
        svgClone.setAttribute('stroke-width', strokeWidthValue);
        svgClone.setAttribute('stroke-linecap', 'round');
        svgClone.setAttribute('stroke-linejoin', 'round');
        svgClone.setAttribute('fill', svgStyle.fill && svgStyle.fill !== 'none' ? svgStyle.fill : 'none');
        domLayer.appendChild(svgClone);
      }
    });

    const legendArrows = Array.from(legendWrapper.querySelectorAll('svg[data-export="legend-arrow"]')) as SVGSVGElement[];
    type LegendMetrics = {
      blockTop: number;
      lineHeight: number;
      fontSize: number;
      baseline: number;
    };

    const getLegendMetrics = (el: HTMLElement | null): LegendMetrics | null => {
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      const fontSize = parsePx(style.fontSize || null, 14);
      const lineHeight = getLineHeightPx(style, fontSize);
      const paddingTop = parsePx(style.paddingTop || null, 0);
      const blockTop = rect.top - y0 + paddingTop;
      const baseline = blockTop + (lineHeight - fontSize) / 2 + fontSize;
      return { blockTop, lineHeight, fontSize, baseline };
    };

    const findSiblingText = (container: HTMLElement | null): HTMLElement | null => {
      if (!container) return null;
      const searchDirection = (node: Element | null, forward: boolean): HTMLElement | null => {
        let current = node;
        while (current) {
          const datasetExport = (current as HTMLElement).dataset?.export;
          if (datasetExport === 'legend-text') {
            return current as HTMLElement;
          }
          current = forward
            ? current.nextElementSibling
            : current.previousElementSibling;
        }
        return null;
      };

      const fromParent = searchDirection(container.previousElementSibling, false)
        ?? searchDirection(container.nextElementSibling, true);
      if (fromParent) return fromParent;

      const within = Array.from(container.children).find((child) => {
        if (!(child instanceof HTMLElement)) return false;
        return child.dataset?.export === 'legend-text';
      }) as HTMLElement | undefined;
      if (within) return within;

      const parent = container.parentElement;
      if (parent) {
        const viaParent = searchDirection(parent.previousElementSibling, false)
          ?? searchDirection(parent.nextElementSibling, true);
        if (viaParent) return viaParent;
      }
      return null;
    };

    legendArrows.forEach((arrow) => {
      const arrowRect = arrow.getBoundingClientRect();
      const container = arrow.parentElement as HTMLElement | null;
      const prevText = container?.previousElementSibling as HTMLElement | null;
      const nextText = container?.nextElementSibling as HTMLElement | null;
      const textRef = findSiblingText(container);
      const metrics = getLegendMetrics(textRef);
      let arrowTop: number;
      if (metrics) {
        const innerTop = metrics.blockTop + Math.max(0, (metrics.lineHeight - arrowRect.height) / 2);
        const alignMiddleOffset = metrics.fontSize * 0.12;
        arrowTop = innerTop + alignMiddleOffset;
      } else if (container) {
        const containerRect = container.getBoundingClientRect();
        arrowTop = containerRect.top - y0 + (containerRect.height - arrowRect.height) / 2;
      } else {
        arrowTop = arrowRect.top - y0;
      }

      const arrowClone = arrow.cloneNode(true) as SVGSVGElement;
      let arrowLeft = arrowRect.left - x0;
      if (prevText && nextText) {
        const prevRect = prevText.getBoundingClientRect();
        const nextRect = nextText.getBoundingClientRect();
        const prevRight = prevRect.right - x0;
        const nextLeft = nextRect.left - x0;
        const gapMid = prevRight + (nextLeft - prevRight) / 2;
        const gapWidth = nextLeft - prevRight;
        const centerBias = gapWidth * 0.25; // tiny visual nudge keeps arrow optically centered between the text spans
        arrowLeft = gapMid - arrowRect.width / 2 + centerBias;
      }
      arrowClone.setAttribute('x', `${arrowLeft}`);
      arrowClone.setAttribute('y', `${arrowTop}`);
      arrowClone.setAttribute('width', `${arrowRect.width}`);
      arrowClone.setAttribute('height', `${arrowRect.height}`);
      const arrowStyle = getComputedStyle(arrow);
      if (arrowStyle.stroke && arrowStyle.stroke !== 'none') {
        arrowClone.setAttribute('stroke', arrowStyle.stroke);
      }
      if (arrowStyle.fill && arrowStyle.fill !== 'none') {
        arrowClone.setAttribute('fill', arrowStyle.fill);
      }
      if (arrowStyle.strokeWidth && arrowStyle.strokeWidth !== 'none') {
        arrowClone.setAttribute('stroke-width', arrowStyle.strokeWidth);
      }
      arrowClone.setAttribute('stroke-linecap', 'round');
      arrowClone.setAttribute('stroke-linejoin', 'round');
      domLayer.appendChild(arrowClone);
    });

    const legendTexts = Array.from(
      legendWrapper.querySelectorAll('[data-export="legend-text"], [data-export="legend-paragraph"]')
    ) as HTMLElement[];
    legendTexts.forEach((textEl) => {
      const legendText = createTextFromElement(textEl);
      if (legendText) {
        domLayer.appendChild(legendText);
      }
    });

    // Decision diamond glyphs (rotated squares)
    const legendDiamonds = Array.from(legendWrapper.querySelectorAll('[data-export="legend-diamond"]')) as HTMLElement[];
    legendDiamonds.forEach((dEl) => {
      const rect = dEl.getBoundingClientRect();
      const cx = rect.left - x0 + rect.width / 2;
      const cy = rect.top - y0 + rect.height / 2;
      const style = getComputedStyle(dEl);
      const stroke = style.borderTopColor || '#1f6feb';
      const strokeWidth = parsePx(style.borderTopWidth, 1);
      const side = Math.max(2, Math.min(rect.width, rect.height) / Math.SQRT2);
      const half = side / 2;
      const square = document.createElementNS(NS, 'rect');
      square.setAttribute('x', `${cx - half}`);
      square.setAttribute('y', `${cy - half}`);
      square.setAttribute('width', `${side}`);
      square.setAttribute('height', `${side}`);
      square.setAttribute('rx', '1.5');
      square.setAttribute('ry', '1.5');
      square.setAttribute('fill', '#ffffff');
      square.setAttribute('stroke', stroke);
      square.setAttribute('stroke-width', `${strokeWidth}`);
      square.setAttribute('transform', `rotate(45 ${cx} ${cy})`);
      domLayer.appendChild(square);
    });
  }

  // Connector overlay labels (HTML spans above SVG)
  const overlayLabels = Array.from(containerEl.querySelectorAll('[data-export="connector-label"]')) as HTMLElement[];
  overlayLabels.forEach((labelEl) => {
    const rect = labelEl.getBoundingClientRect();
    const style = getComputedStyle(labelEl);
    const radius = parsePx(style.borderRadius, Math.min(rect.height / 2, 999));
    const stroke = style.borderTopColor || '#c5d2e3';
    const strokeWidth = parsePx(style.borderTopWidth, 1);
    const fill = style.backgroundColor || '#ffffff';
    const pill = roundedRect(
      rect.left - x0,
      rect.top - y0,
      rect.width,
      rect.height,
      radius,
      fill,
      stroke,
      strokeWidth,
    );
    domLayer.appendChild(pill);
    const text = createTextFromElement(labelEl, { align: 'center' });
    if (text) domLayer.appendChild(text);

    // Optional pointer from label toward its target
    const pointerDir = (labelEl.getAttribute('data-pointer') || '').toLowerCase();
    if (pointerDir === 'down') {
      const cx = rect.left - x0 + rect.width / 2;
      const baseY = rect.top - y0 + rect.height; // bottom edge of pill
      const triBorder = document.createElementNS(NS, 'polygon');
      triBorder.setAttribute('points', `${cx},${baseY + 6} ${cx - 6},${baseY} ${cx + 6},${baseY}`);
      triBorder.setAttribute('fill', stroke);
      domLayer.appendChild(triBorder);
      const triInner = document.createElementNS(NS, 'polygon');
      triInner.setAttribute('points', `${cx},${baseY + 5} ${cx - 5},${baseY} ${cx + 5},${baseY}`);
      triInner.setAttribute('fill', fill);
      domLayer.appendChild(triInner);
    } else if (pointerDir === 'right') {
      const baseX = rect.left - x0 + rect.width; // right edge of pill
      const cy = rect.top - y0 + rect.height / 2;
      const triBorder = document.createElementNS(NS, 'polygon');
      triBorder.setAttribute('points', `${baseX},${cy - 6} ${baseX},${cy + 6} ${baseX + 6},${cy}`);
      triBorder.setAttribute('fill', stroke);
      domLayer.appendChild(triBorder);
      const triInner = document.createElementNS(NS, 'polygon');
      triInner.setAttribute('points', `${baseX},${cy - 5} ${baseX},${cy + 5} ${baseX + 5},${cy}`);
      triInner.setAttribute('fill', fill);
      domLayer.appendChild(triInner);
    }
  });

  // Callouts (popup notes with pointer)
  const callouts = Array.from(containerEl.querySelectorAll('[data-export="callout"]')) as HTMLElement[];
  callouts.forEach((cEl) => {
    const rect = cEl.getBoundingClientRect();
    const style = getComputedStyle(cEl);
    const radius = parsePx(style.borderRadius, 6);
    const stroke = style.borderTopColor || '#b8c4d6';
    const strokeWidth = parsePx(style.borderTopWidth, 1);
    const fill = style.backgroundColor || '#ffffff';
  // Use getPropertyValue to avoid `any` access for the short-hand gap property
  const gapShorthand = style.getPropertyValue('gap');
  const gapPx = parsePx(style.columnGap || gapShorthand || null, 8);
    const box = roundedRect(
      rect.left - x0,
      rect.top - y0,
      rect.width,
      rect.height,
      radius,
      fill,
      stroke,
      strokeWidth,
    );
    domLayer.appendChild(box);

    // Optional icon inside callout (clone if present)
    const icon = cEl.querySelector('svg');
    let iconRightOffset = 0;
    if (icon) {
      const iRect = icon.getBoundingClientRect();
      const iClone = icon.cloneNode(true) as SVGSVGElement;
      iClone.setAttribute('x', `${iRect.left - x0}`);
      iClone.setAttribute('y', `${iRect.top - y0}`);
      iClone.setAttribute('width', `${iRect.width}`);
      iClone.setAttribute('height', `${iRect.height}`);
      const iStyle = getComputedStyle(icon);
      if (iStyle.stroke && iStyle.stroke !== 'none') iClone.setAttribute('stroke', iStyle.stroke);
      if (iStyle.fill && iStyle.fill !== 'none') iClone.setAttribute('fill', iStyle.fill);
      if (iStyle.strokeWidth && iStyle.strokeWidth !== 'none') iClone.setAttribute('stroke-width', iStyle.strokeWidth);
      iClone.setAttribute('stroke-linecap', 'round');
      iClone.setAttribute('stroke-linejoin', 'round');
      domLayer.appendChild(iClone);
      iconRightOffset = (iRect.width || 0) + gapPx;
    }

    const text = createTextFromElement(cEl);
    if (text) {
      // If there is an icon, align text start to padding-left + icon width + gap
      if (iconRightOffset > 0) {
        const padLeft = parsePx(style.paddingLeft, 6);
        const newX = (rect.left - x0) + padLeft + iconRightOffset;
        const prevX = parseFloat(text.getAttribute('x') || '0');
        const delta = Number.isFinite(prevX) ? (newX - prevX) : 0;
        text.setAttribute('x', `${newX}`);
        // Shift tspans by same delta so the first line anchors correctly
        const tspans = Array.from(text.querySelectorAll('tspan')) as SVGTextElement[];
        tspans.forEach((tspan, idx) => {
          const xAttr = tspan.getAttribute('x');
          if (xAttr) {
            const old = parseFloat(xAttr);
            const next = (Number.isFinite(old) ? old : newX) + delta;
            tspan.setAttribute('x', `${next}`);
          } else if (idx === 0) {
            tspan.setAttribute('x', `${newX}`);
          }
        });
      }
      domLayer.appendChild(text);
    }

    // We intentionally do not draw callout pointers here. Pointer triangles are drawn on labels (above) and should point toward the target card.
  });

  // Decision diamond (rotated square) in the diagram
  const decisionNodes = Array.from(containerEl.querySelectorAll('[data-export-card="decisao"]')) as HTMLElement[];
  decisionNodes.forEach((nodeEl) => {
    const nRect = nodeEl.getBoundingClientRect();
    const cx = nRect.left - x0 + nRect.width / 2;
    const cy = nRect.top - y0 + nRect.height / 2;
    // Match on-screen: wrapper h-20 w-20 contains inner rotated square roughly same size.
    const side = Math.max(4, Math.min(nRect.width, nRect.height) * 0.9);
    const half = side / 2;
    const square = document.createElementNS(NS, 'rect');
    square.setAttribute('x', `${cx - half}`);
    square.setAttribute('y', `${cy - half}`);
    square.setAttribute('width', `${side}`);
    square.setAttribute('height', `${side}`);
    square.setAttribute('rx', '4');
    square.setAttribute('ry', '4');
    square.setAttribute('fill', '#ffffff');
    square.setAttribute('stroke', '#b8c4d6');
    square.setAttribute('stroke-width', '1');
    square.setAttribute('transform', `rotate(45 ${cx} ${cy})`);
    domLayer.appendChild(square);
    // Manual multi-line title handling respecting <br/>
    const titleEl = nodeEl.querySelector('[data-export="card-title"]') as HTMLElement | null;
    if (titleEl) {
      const rawHtml = titleEl.innerHTML;
      const lines = rawHtml.split(/<br\s*\/?>(?:\s*)/i).map(l => l.replace(/<[^>]+>/g, '').trim()).filter(Boolean);
      if (lines.length) {
        const fontSize = 15; // matches activityTitleClass
        const lineHeight = fontSize * 1.2;
        const textGroup = document.createElementNS(NS, 'g');
        lines.forEach((line, idx) => {
          const text = document.createElementNS(NS, 'text');
          text.setAttribute('x', `${cx}`);
          // Center block vertically around cy
          const totalHeight = lineHeight * lines.length;
            const firstBaseline = cy - (totalHeight / 2) + fontSize; // approximate
          const y = firstBaseline + idx * lineHeight;
          text.setAttribute('y', `${y}`);
          text.setAttribute('fill', COLORS.text);
          text.setAttribute('font-size', `${fontSize}`);
          text.setAttribute('font-family', 'Inter-600');
          text.setAttribute('font-weight', '600');
          text.setAttribute('text-anchor', 'middle');
          text.textContent = line;
          textGroup.appendChild(text);
        });
        domLayer.appendChild(textGroup);
      }
    }
  });

  // Append the diagram by cloning the existing SVG (keeps paths etc.) UNDER the DOM layer
  // so cards/text render above connectors like on the live page
  const diagramClone = svgElement.cloneNode(true) as SVGSVGElement;
  const svgRectAbs = svgElement.getBoundingClientRect();
  // Also shift the original connector layer by the padding so it aligns with the DOM layer
  diagramClone.setAttribute('x', `${svgRectAbs.left - x0 + PADDING}`);
  diagramClone.setAttribute('y', `${svgRectAbs.top - y0 + PADDING}`);
  // Prepare the diagram clone for vector PDF: strip filters, materialize arrows
  stripUnsupportedAndReplaceMarkers(diagramClone);
  // Layering: back backgrounds → connectors → front DOM (cards/labels/legend)
  exportSvg.appendChild(domBackLayer);
  exportSvg.appendChild(diagramClone);
  exportSvg.appendChild(domLayer);

  // Serialize composed SVG and send to server to render via pdfkit (vector)
  const serializer = new XMLSerializer();
  const source = serializer.serializeToString(exportSvg);

  const res = await fetch('/api/export-figura02', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ svg: source, width: paddedWidth, height: paddedHeight, filename: name }),
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
    // We intentionally skip `refs` to avoid re-subscribing observers on every render.
    // The observed elements are stable DOM nodes tied to these refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  <section aria-label="Figura 2 – Variáveis, indicadores e decisões agroclimáticas" className="w-full bg-linear-to-br from-[#fafbfc] to-[#f5f7fa] py-12">
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

          <section className={laneClass} aria-labelledby="lane-variables" data-export="lane">
            <div className={laneHeadClass} id="lane-variables" data-export="lane-header">
              VARIÁVEIS METEOROLÓGICAS
            </div>
            <div className={laneBodyClass}>
              {variableCards.map(({ id, title, unit, description, Icon, ref }) => {
                return (
                  <article
                    key={id}
                    ref={ref}
                    className={variableCardClass}
                    data-export-card="variable"
                    data-export-card-id={id}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`${iconWrapperClass} shrink-0`}
                        aria-hidden="true"
                        data-export="icon-wrapper"
                      >
                        <Icon className="h-4 w-4" data-export="icon" />
                      </div>
                      <div className="flex w-full flex-col gap-y-1.5">
                        <div className="relative flex items-start">
                          <h2
                            className={`${cardTitleClass} flex-1 min-w-0 pr-16`}
                            data-export="card-title"
                          >
                            {title}
                          </h2>
                          {unit ? (
                            <span
                              className={`${pillTextClass} shrink-0 absolute top-0 right-0`}
                              data-export="unit-pill"
                            >
                              {unit}
                            </span>
                          ) : null}
                        </div>
                        <p className={cardBodyTextClass} data-export="card-description">
                          {description}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className={laneClass} aria-labelledby="lane-indicadores" data-export="lane">
            <div className={laneHeadClass} id="lane-indicadores" data-export="lane-header">
              INDICADORES DERIVADOS
            </div>
            <div className={`${laneBodyClass}`} style={{ gap: '48px' }}>
              {indicatorCards.map(({ id, title, unit, description, Icon, ref }) => {
                return (
                  <article
                    key={id}
                    ref={ref}
                    className={cardContainerClass}
                    data-export-card="indicator"
                    data-export-card-id={id}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`${iconWrapperClass} shrink-0`}
                        aria-hidden="true"
                        data-export="icon-wrapper"
                      >
                        <Icon className="h-4 w-4" data-export="icon" />
                      </div>
                      <div className="flex w-full flex-col gap-y-1.5">
                        <div className="relative flex items-start">
                          <h2
                            className={`${cardTitleClass} flex-1 min-w-0 pr-16`}
                            data-export="card-title"
                          >
                            {title}
                          </h2>
                          {unit ? (
                            <span
                              className={`${pillTextClass} shrink-0 absolute top-0 right-0`}
                              data-export="unit-pill"
                            >
                              {unit}
                            </span>
                          ) : null}
                        </div>
                        <p className={cardBodyTextClass} data-export="card-description">
                          {description}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className={laneClass} aria-labelledby="lane-decisoes" data-export="lane">
            <div className={laneHeadClass} id="lane-decisoes" data-export="lane-header">
              DECISÃO OPERACIONAL
            </div>
            <div className={laneBodyClass}>
              {decisionCards.map(({ id, title, Icon, details, hint, ref }) => (
                <article
                  key={id}
                  ref={ref}
                  className={cardContainerClass}
                  data-export-card="decision"
                  data-export-card-id={id}
                >
                  <div className="flex w-full flex-col">
                    <div className="flex items-center gap-4 mb-3">
                      <div className={iconWrapperClass} aria-hidden="true" data-export="icon-wrapper">
                        <Icon className="h-4 w-4" data-export="icon" />
                      </div>
                      <h2
                        className={`${cardTitleClass} uppercase tracking-wide`}
                        data-export="card-title"
                      >
                        {title}
                      </h2>
                    </div>
                    <div className="border-t border-[#d1d9e0] pt-2.5 pb-1.5" data-export="card-divider">
                      <ul className="space-y-1 text-xs leading-snug text-[#37474f]">
                        {details.map(({ icon, text }) => (
                          <li key={text} className="flex items-start gap-2">
                            {icon && (
                              <span
                                className="inline-flex w-6 justify-center text-base shrink-0 mt-0.5 text-[#1565c0] font-bold"
                                aria-hidden="true"
                                data-export="detail-icon"
                              >
                                {icon}
                              </span>
                            )}
                            <span className="flex-1" data-export="detail-text">
                              {text}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <p className={hintClass} data-export="card-hint">
                      {hint}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <footer
            className="col-span-full border-t-2 border-[#d1d9e0] pt-5 space-y-3 bg-white/50 rounded-lg px-6 py-4"
            data-export="legend"
          >
            <div className="mb-2">
              <h3 className="text-sm font-bold text-[#1a2332] mb-2" data-export="legend-text">
                Cores dos conectores (por grupo)
              </h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-xs text-[#37474f]">
                <li className="flex items-center gap-3">
                  <span
                    className="inline-flex h-1.5 w-12 rounded-[5px]"
                    style={{ backgroundColor: getStrokeByTarget('et0') }}
                    data-export="legend-swatch"
                  />
                  <span className="inline-flex items-center gap-1.5">
                    <strong className="text-[#1a2332]" data-export="legend-text">
                      Grupo ET₀
                    </strong>
                    <ArrowRight
                      size={14}
                      strokeWidth={2.5}
                      className="text-[#607d8b]"
                      style={{ marginTop: '1px' }}
                      aria-hidden="true"
                      data-export="legend-arrow"
                    />
                    <span data-export="legend-text">Decisão de irrigação (D1)</span>
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <span
                    className="inline-flex h-1.5 w-12 rounded-[5px]"
                    style={{ backgroundColor: getStrokeByTarget('bh') }}
                    data-export="legend-swatch"
                  />
                  <span className="inline-flex items-center gap-1.5">
                    <strong className="text-[#1a2332]" data-export="legend-text">
                      Grupo BH
                    </strong>
                    <ArrowRight
                      size={14}
                      strokeWidth={2.5}
                      className="text-[#607d8b]"
                      style={{ marginTop: '1px' }}
                      aria-hidden="true"
                      data-export="legend-arrow"
                    />
                    <span data-export="legend-text">Planejamento operacional (D2)</span>
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <span
                    className="inline-flex h-1.5 w-12 rounded-[5px]"
                    style={{ backgroundColor: getStrokeByTarget('gdd') }}
                    data-export="legend-swatch"
                  />
                  <span className="inline-flex items-center gap-1.5">
                    <strong className="text-[#1a2332]" data-export="legend-text">
                      Grupo GDD
                    </strong>
                    <ArrowRight
                      size={14}
                      strokeWidth={2.5}
                      className="text-[#607d8b]"
                      style={{ marginTop: '1px' }}
                      aria-hidden="true"
                      data-export="legend-arrow"
                    />
                    <span data-export="legend-text">Manejo fitossanitário (D3)</span>
                  </span>
                </li>
              </ul>
            </div>
            <p
              id="fig2-caption"
              className="text-sm text-[#1a2332] leading-6 whitespace-nowrap"
              data-export="legend-paragraph"
            >
              <strong className="text-[#1565c0]" data-export="legend-text">Legenda:</strong>{' '}
              <span className="pr-1" data-export="legend-text">fluxo em três etapas — (1) Variáveis</span>
              <span
                className="inline-flex items-center mx-1 align-middle text-[#607d8b] leading-none whitespace-nowrap"
                aria-hidden="true"
                data-export="legend-arrow"
              >
                <ArrowRight size={14} strokeWidth={2.5} data-export="legend-arrow" />
              </span>
              <span className="pl-1" data-export="legend-text">(2) Indicadores</span>
              <span
                className="inline-flex items-center mx-1 align-middle text-[#607d8b] leading-none whitespace-nowrap"
                aria-hidden="true"
                data-export="legend-arrow"
              >
                <ArrowRight size={14} strokeWidth={2.5} data-export="legend-arrow" />
              </span>
              <span className="pl-1" data-export="legend-text">
                (3) Decisões. As setas usam três cores por grupo: ET₀/D1, BH/D2 e GDD/D3. Todas as conexões de um grupo compartilham a mesma cor ao longo de todo o percurso.
              </span>
            </p>
          </footer>
        </div>
        </div>
      </div>
    </section>
  );
}
