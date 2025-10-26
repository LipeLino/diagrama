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
      const interRegular = path.join(fontsDir, 'Inter-Regular.ttf');
      const interBold = path.join(fontsDir, 'Inter-Bold.ttf');
      const interSemi = path.join(fontsDir, 'Inter-SemiBold.ttf');
      const interVariable = path.join(fontsDir, 'Inter-VariableFont_opsz,wght.ttf');

      const registerIfExists = (name: string, filePath: string) => {
        try {
          if (fs.existsSync(filePath)) {
            doc.registerFont(name, filePath);
            return true;
          }
        } catch (e) {
          console.warn(`Font registration failed for ${name} -> ${filePath}:`, e);
        }
        return false;
      };

      const registeredRegular = registerIfExists('Inter-Regular', interRegular);
      const registeredBold = registerIfExists('Inter-Bold', interBold);
      const registeredSemi = registerIfExists('Inter-SemiBold', interSemi);

      // If discrete Inter TTFs are missing, alias the variable font under common names.
      if (fs.existsSync(interVariable)) {
        try {
          if (!registeredRegular) doc.registerFont('Inter-Regular', interVariable);
          if (!registeredSemi) doc.registerFont('Inter-SemiBold', interVariable);
          if (!registeredBold) doc.registerFont('Inter-Bold', interVariable);
          // Generic family alias for plain 'Inter'
          doc.registerFont('Inter', interVariable);
        } catch (e) {
          console.warn('Inter variable font registration failed:', e);
        }
      }
    } catch (fontErr) {
      console.warn('Inter font registration skipped:', fontErr);
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
        const f = (family || '').toLowerCase();
        if (f.includes('inter')) {
          if (f.includes('semi')) return 'Inter-SemiBold';
          if (f.includes('bold')) return 'Inter-Bold';
          if (f.includes('regular') || f.trim() === 'inter') return bold ? 'Inter-Bold' : 'Inter-Regular';
          return 'Inter-Regular';
        }
        // Safe fallback to a standard PDF font to avoid 'undefined' errors
        return 'Helvetica';
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
