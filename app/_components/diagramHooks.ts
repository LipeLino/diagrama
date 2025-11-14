import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export const ARROW_LENGTH = 16;
export const STRAIGHT_SEGMENT = 12;
export const MERGE_NODE_R = 4;
export const MERGE_MIN_GAP = 36;

export type ConnectorOptions = {
  offset?: number;
  fromOffset?: number;
  toOffset?: number;
  minDx?: number;
  // Optional anchors for Y position along card edge
  fromAnchorY?: 'top' | 'center' | 'bottom';
  toAnchorY?: 'top' | 'center' | 'bottom';
  fromInset?: number; // pixels inward from chosen edge for fromAnchorY top/bottom
  toInset?: number; // pixels inward from chosen edge for toAnchorY top/bottom
  // Optional alternative start side and fraction for horizontal connectors
  fromSide?: 'right' | 'left' | 'top' | 'bottom';
  fromXFraction?: number; // when fromSide is top/bottom, 0..1 across the edge (default 0.66)
  arcLift?: number; // raises the curve by subtracting from control point y's (adds more curvature)
};

export function useRerouteOnResize(refs: Array<React.RefObject<Element | null>>, onResize: () => void): void {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof ResizeObserver === 'undefined') {
      return;
    }

    let frame: number | null = null;
    const schedule = () => {
      if (frame !== null) {
        cancelAnimationFrame(frame);
      }
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

    if (typeof document !== 'undefined' && 'fonts' in document && document.fonts?.ready) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - older TS lib definitions might not include fonts.ready
      (document.fonts.ready as Promise<void>).then(() => schedule());
    } else {
      schedule();
    }

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      observed.forEach((el) => observer.unobserve(el));
      observer.disconnect();
      window.removeEventListener('resize', schedule);
    };
    // We intentionally omit `onResize` to avoid re-registering observers on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, refs);
}

export function useMergePoint(
  containerRef: React.RefObject<HTMLDivElement | null>,
  sourceRefs: Array<React.RefObject<HTMLElement | null>>,
  targetRef: React.RefObject<HTMLElement | null>,
  xGap: number = 28,
  side: 'left' | 'right' = 'left',
): { x: number; y: number } {
  const [pt, setPt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
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

    const y = targetRect.top + targetRect.height / 2 - containerRect.top;
    const effectiveGap = Math.max(xGap, MERGE_MIN_GAP);
    const x = side === 'left'
      ? Math.max(0, targetRect.left - containerRect.left - effectiveGap)
      : targetRect.right - containerRect.left + effectiveGap;

    setPt({ x, y });
  }, [containerRef, targetRef, xGap, side]);

  // Compute synchronously before paint to avoid a frame with (0,0)
  useLayoutEffect(() => {
    update();
  }, [update]);

  useRerouteOnResize([containerRef, targetRef, ...sourceRefsRef.current], update);

  return pt;
}

export function useCurvedConnector(
  containerRef: React.RefObject<HTMLDivElement | null>,
  fromRef: React.RefObject<HTMLElement | null>,
  toRef: React.RefObject<HTMLElement | null>,
  { offset = 0, fromOffset, toOffset, minDx, fromAnchorY, toAnchorY, fromInset = 0, toInset = 0, fromSide = 'right', fromXFraction = 0.66, arcLift = 0 }: ConnectorOptions = {},
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

    let x1: number;
    if (fromSide === 'left') {
      x1 = fromRect.left - containerRect.left;
    } else if (fromSide === 'right') {
      x1 = fromRect.right - containerRect.left;
    } else if (fromSide === 'top' || fromSide === 'bottom') {
      x1 = fromRect.left + fromRect.width * fromXFraction - containerRect.left;
    } else {
      x1 = fromRect.right - containerRect.left;
    }
    let y1: number;
    switch (fromAnchorY ?? 'center') {
      case 'top':
        y1 = fromRect.top - containerRect.top + fromInset;
        break;
      case 'bottom':
        y1 = fromRect.bottom - containerRect.top - fromInset;
        break;
      default:
        y1 = fromRect.top + fromRect.height / 2 - containerRect.top + startOffset;
    }

    const arrowDir: 1 | -1 = x1 <= toRect.left - containerRect.left ? 1 : -1;
    const targetEdge = arrowDir === 1
      ? toRect.left - containerRect.left
      : toRect.right - containerRect.left;
    const x2 = targetEdge;
    let y2: number;
    switch (toAnchorY ?? 'center') {
      case 'top':
        y2 = toRect.top - containerRect.top + toInset;
        break;
      case 'bottom':
        y2 = toRect.bottom - containerRect.top - toInset;
        break;
      default:
        y2 = toRect.top + toRect.height / 2 - containerRect.top + endOffset;
    }

    const stubLength = STRAIGHT_SEGMENT + ARROW_LENGTH;
    const straightStartX = x2 - arrowDir * stubLength;
    const straightStartY = y2;

    const rawRun = straightStartX - x1;
    const runDir = rawRun === 0 ? arrowDir : (rawRun > 0 ? 1 : -1);
    const absRun = Math.max(Math.abs(rawRun), minDx ?? 72);

  // Apply arcLift to raise the curve (control points only)
  const cx1 = x1 + absRun * 0.6 * runDir;
  const cy1 = y1 - arcLift;
  const cx2 = straightStartX - absRun * 0.35 * runDir;
  const cy2 = straightStartY - arcLift * 0.6; // slightly less lift near target for smoother descent

    const d = `M ${x1.toFixed(2)} ${y1.toFixed(2)} C ${cx1.toFixed(2)} ${cy1.toFixed(2)}, ${cx2.toFixed(2)} ${cy2.toFixed(
      2,
    )}, ${straightStartX.toFixed(2)} ${straightStartY.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)}`;

    setPath(d);
  }, [containerRef, fromRef, toRef, offset, fromOffset, toOffset, minDx]);

  // Layout effect prevents a transient path to (0,0) before measurements settle
  useLayoutEffect(() => {
    updatePath();
  }, [updatePath]);

  useRerouteOnResize([containerRef, fromRef, toRef], updatePath);

  return path;
}

export interface VerticalConnectorOptions {
  sourceXFraction?: number; // 0..1 across the top/bottom edge; default 0.5 (center)
  targetXFraction?: number; // 0..1 across the top edge; default 0.5 (center)
}

export function useVerticalConnector(
  containerRef: React.RefObject<HTMLDivElement | null>,
  fromRef: React.RefObject<HTMLElement | null>,
  toRef: React.RefObject<HTMLElement | null>,
  options: VerticalConnectorOptions = {},
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

  const srcFrac = options.sourceXFraction ?? 0.5;
  const tgtFrac = options.targetXFraction ?? 0.5;
  const x1 = fromRect.left + fromRect.width * srcFrac - containerRect.left;
    const y1 = fromRect.bottom - containerRect.top;
  const x2 = toRect.left + toRect.width * tgtFrac - containerRect.left;
    const y2 = toRect.top - containerRect.top;

    const straightStartX = x2;
    const straightStartY = y2 - (STRAIGHT_SEGMENT + ARROW_LENGTH);

    const dy = straightStartY - y1;
    const c = 0.4 * dy;

    const cx1 = x1;
    const cy1 = y1 + c;
    const cx2 = straightStartX;
    const cy2 = straightStartY - c;

    const d = `M ${x1.toFixed(2)} ${y1.toFixed(2)} C ${cx1.toFixed(2)} ${cy1.toFixed(2)}, ${cx2.toFixed(2)} ${cy2.toFixed(
      2,
    )}, ${straightStartX.toFixed(2)} ${straightStartY.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)}`;

    setPath(d);
  }, [containerRef, fromRef, toRef, options.sourceXFraction, options.targetXFraction]);

  // Layout effect prevents a transient path to (0,0) before measurements settle
  useLayoutEffect(() => {
    updatePath();
  }, [updatePath]);

  useRerouteOnResize([containerRef, fromRef, toRef], updatePath);

  return path;
}

export function useMergeConnector(
  containerRef: React.RefObject<HTMLDivElement | null>,
  fromRef: React.RefObject<HTMLElement | null>,
  toRef: React.RefObject<HTMLElement | null>,
  mergeX: number,
  mergeY: number,
  fromOffset: number = 0,
  isFromMerge: boolean = false,
  targetSide: 'left' | 'right' = 'left',
  fromSide: 'left' | 'right' = 'right',
): string {
  const [path, setPath] = useState('');

  const updatePath = useCallback(() => {
    const container = containerRef.current;
    const fromEl = fromRef.current;
    const toEl = toRef.current;
    if (!container || !fromEl || !toEl) {
      return;
    }

    // Guard against the unmeasured initial state (0,0). It's extremely unlikely
    // that a real merge sits at y=0 in our diagrams; this prevents accidental
    // paths shooting to the viewport origin during the first frame.
    if (mergeX === 0 && mergeY === 0) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();

    if (isFromMerge) {
      const x1 = mergeX;
      const y1 = mergeY;
      const y2 = toRect.top + toRect.height / 2 - containerRect.top;
      const arrowDir = targetSide === 'right' ? -1 : 1;
      const targetEdgeX = targetSide === 'right'
        ? toRect.right - containerRect.left
        : toRect.left - containerRect.left;
      const x2 = targetEdgeX;
      const stubLength = STRAIGHT_SEGMENT + ARROW_LENGTH;
      const straightStartX = x2 - arrowDir * stubLength;
      const straightStartY = y2;
      const rawRun = straightStartX - x1;
      const runDir = rawRun === 0 ? arrowDir : (rawRun > 0 ? 1 : -1);
      const absRun = Math.max(Math.abs(rawRun), 72);
      const yDelta = y2 - y1;
      let cySpan = yDelta * 0.35;
      if (cySpan > 48) cySpan = 48;
      if (cySpan < -48) cySpan = -48;
      const cx1 = x1 + absRun * 0.6 * runDir;
      const cy1 = y1 + cySpan;
      const cx2 = straightStartX - absRun * 0.3 * runDir;
      const cy2 = straightStartY - cySpan * 0.25;
      const d = `M ${x1.toFixed(2)} ${y1.toFixed(2)} C ${cx1.toFixed(2)} ${cy1.toFixed(2)}, ${cx2.toFixed(2)} ${cy2.toFixed(
        2,
      )}, ${straightStartX.toFixed(2)} ${straightStartY.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)}`;
      setPath(d);
    } else {
      const startEdge = fromSide === 'left' ? fromRect.left : fromRect.right;
      const x1 = startEdge - containerRect.left;
      const y1 = fromRect.top + fromRect.height / 2 - containerRect.top + fromOffset;
      const x2 = mergeX;
      const y2 = mergeY;
      const rawRun = x2 - x1;
      const runDir: 1 | -1 = rawRun === 0 ? 1 : rawRun > 0 ? 1 : -1;
      const absRun = Math.max(Math.abs(rawRun), 80);
      const cx1 = x1 + absRun * 0.6 * runDir;
      const cy1 = y1;
      const cx2 = x2 - absRun * 0.3 * runDir;
      const cy2 = y2;
      const d = `M ${x1.toFixed(2)} ${y1.toFixed(2)} C ${cx1.toFixed(2)} ${cy1.toFixed(2)}, ${cx2.toFixed(2)} ${cy2.toFixed(
        2,
      )}, ${x2.toFixed(2)} ${y2.toFixed(2)}`;
      setPath(d);
    }
  }, [containerRef, fromRef, toRef, mergeX, mergeY, fromOffset, isFromMerge, targetSide]);

  // Layout effect to ensure we draw with measured coordinates before paint
  useLayoutEffect(() => {
    updatePath();
  }, [updatePath]);

  useRerouteOnResize([containerRef, fromRef, toRef], updatePath);

  return path;
}

export interface ConsumerFeederOptions {
  fromOffset?: number;
  mergeYOffset?: number;
}

export function useConsumerFeederConnector(
  containerRef: React.RefObject<HTMLDivElement | null>,
  fromRef: React.RefObject<HTMLElement | null>,
  mergeX: number,
  mergeY: number,
  { fromOffset = 0, mergeYOffset = 0 }: ConsumerFeederOptions = {},
): string {
  const [path, setPath] = useState('');

  const updatePath = useCallback(() => {
    const container = containerRef.current;
    const fromEl = fromRef.current;
    if (!container || !fromEl) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const fromRect = fromEl.getBoundingClientRect();

    const x1 = fromRect.right - containerRect.left;
    const y1 = fromRect.top + fromRect.height / 2 - containerRect.top + fromOffset;
    const x2 = mergeX;
    const y2 = mergeY + mergeYOffset;

    const run = Math.max(x2 - x1, 96);
    const c1 = x1 + run * 0.6;
    const c2 = x2 - run * 0.25;

    const d = `M ${x1.toFixed(2)} ${y1.toFixed(2)} C ${c1.toFixed(2)} ${y1.toFixed(2)}, ${c2.toFixed(2)} ${y2.toFixed(2)}, ${x2.toFixed(2)} ${y2.toFixed(2)}`;
    setPath(d);
  }, [containerRef, fromRef, mergeX, mergeY, fromOffset, mergeYOffset]);

  // Layout effect to avoid an initial (0,0) flicker
  useLayoutEffect(() => {
    updatePath();
  }, [updatePath]);

  useRerouteOnResize([containerRef, fromRef], updatePath);

  return path;
}
