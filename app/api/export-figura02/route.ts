import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: Request): Promise<Response> {
  try {
    const { svg, width, height, filename } = await req.json();
    if (!svg || !width || !height) {
      return NextResponse.json({ error: 'Missing svg/width/height' }, { status: 400 });
    }

    const PX_TO_PT = 72 / 96; // CSS px to PDF points
    const wPt = Math.max(1, Math.round(width * PX_TO_PT));
    const hPt = Math.max(1, Math.round(height * PX_TO_PT));

    // Use require at runtime to avoid Turbopack trying to bundle ESM helpers in fontkit
    const cjsRequire = (eval('require') as NodeRequire);
    // pdfkit and svg-to-pdfkit are CommonJS
    const PDFDocument = cjsRequire('pdfkit');
    const SVGtoPDF = cjsRequire('svg-to-pdfkit');

    const doc = new PDFDocument({ size: [wPt, hPt], margin: 0 });
    // Ensure the PDF page has a solid white background (avoids dark-mode viewers turning caption black)
    doc.rect(0, 0, wPt, hPt).fill('#FFFFFF');
    doc.fillColor('#000000');

    // Try to register site fonts if available (optional). If missing, pdfkit falls back to Helvetica.
    try {
      const fs = cjsRequire('fs') as typeof import('fs');
      const path = cjsRequire('path') as typeof import('path');

      const fontsDir = path.join(process.cwd(), 'public', 'fonts');
      const fontFiles: Array<{ name: string; file: string }> = [
        { name: 'Inter-400', file: 'Inter-Regular.ttf' },
        { name: 'Inter-600', file: 'Inter-SemiBold.ttf' },
        { name: 'Inter-700', file: 'Inter-Bold.ttf' },
  { name: 'Roboto-400', file: 'Roboto-Regular.ttf' },
  { name: 'NotoSansSymbols2-Regular', file: 'NotoSansSymbols2-Regular.ttf' },
  { name: 'NotoSansMath-Regular', file: 'NotoSansMath-Regular.ttf' },
  { name: 'NotoSans-Regular', file: 'NotoSans-Regular.ttf' },
      ];

      fontFiles.forEach(({ name, file }) => {
        const fullPath = path.join(fontsDir, file);
        try {
          const fontBuffer = fs.readFileSync(fullPath);
          doc.registerFont(name, fontBuffer);
        } catch (err) {
          console.warn(`Font registration failed for ${name} (${fullPath}). Falling back to Helvetica.`, err);
        }
      });
    } catch (fontErr) {
      console.warn('Custom font registration skipped:', fontErr);
    }

    const chunks: Uint8Array[] = [];
    doc.on('data', (c: Uint8Array) => chunks.push(c));
    const done = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    // Render the SVG into the PDF at (0,0) sized to the page
    // preserveAspectRatio 'none' so our composed svg fills exactly
    const SVGtoPDFFn = SVGtoPDF as unknown as (
      d: unknown,
      s: string,
      x: number,
      y: number,
      o: { width: number; height: number; preserveAspectRatio: string; fontCallback?: (family: string, bold: boolean, italic: boolean, fontStyle?: string) => string | undefined },
    ) => void;
    // Map SVG font families to registered fonts when present
    const options = {
      width: wPt,
      height: hPt,
      preserveAspectRatio: 'none',
  fontCallback: (family: string, bold: boolean) => {
        const normalized = (family || '').toLowerCase();
        if (normalized.includes('inter-700')) return 'Inter-700';
        if (normalized.includes('inter-600')) return 'Inter-600';
        if (normalized.includes('inter-400') || normalized === 'inter') return bold ? 'Inter-700' : 'Inter-400';
  if (normalized.includes('roboto-400') || normalized.includes('roboto')) return 'Roboto-400';
  if (normalized.includes('notosans-regular') || normalized.includes('notosans')) return 'NotoSans-Regular';
  if (normalized.includes('notosansmath-regular') || normalized.includes('notosansmath')) return 'NotoSansMath-Regular';
  if (normalized.includes('notosanssymbols2-regular') || normalized.includes('notosanssymbols2')) return 'NotoSansSymbols2-Regular';
        if (normalized.includes('helvetica')) return 'Helvetica';
        // Default to Inter regular if available, otherwise Helvetica
    return 'Inter-400';
      },
    };
    SVGtoPDFFn(doc, svg, 0, 0, options);
    doc.end();

    const buffer = await done;

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename || 'Figura02.pdf'}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Export failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
