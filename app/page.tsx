import dynamic from 'next/dynamic';

const Figure02 = dynamic(() => import('./figures/Figure02_Encadeamento'), { ssr: true });
const Figure03 = dynamic(() => import('./figures/Figure03_IoT_Arquitetura'), { ssr: true });
const Figure04 = dynamic(() => import('./figures/Figure04_DSS_Pipeline'), { ssr: true });
const Figure05 = dynamic(() => import('./figures/Figure05_WalkForward_MLOps'), { ssr: true });
const Figure06 = dynamic(() => import('./figures/Figure06_Seguranca_RBAC'), { ssr: true });

export default function Page() {
  return (
    <div className="space-y-16">
      <header>
        <h1 className="text-2xl font-bold text-[#0f2747]">Diagramas</h1>
        <p className="text-sm opacity-80">Next.js (App Router) + Tailwind + SVG</p>
      </header>

      <Figure02 />
      <Figure03 />
      <Figure04 />
      <Figure05 />
      <Figure06 />
    </div>
  );
}

