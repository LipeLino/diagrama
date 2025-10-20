export const metadata = {
  title: 'Diagramas (Next + Tailwind)',
  description: 'Figuras com conectores SVG e exportação',
};

import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh antialiased">
        <main className="max-w-7xl mx-auto p-6 md:p-8 lg:p-10">
          {children}
        </main>
      </body>
    </html>
  );
}

