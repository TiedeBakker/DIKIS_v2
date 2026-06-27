// src/app/modules/beheer/page.tsx
import { db } from '@/db';
import { parameters, parameterSets, groepen, vBeschikbareObjecten } from '@/db/schema';
import Link from 'next/link';
import ParameterSetManager from './components/ParameterSetManager';
import GroepManager from './components/GroepManager';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ tab?: string; editId?: string }>;
}

export default async function BeheerPage({ searchParams }: Props) {
  const { tab, editId } = await searchParams;
  const actiefTab = tab || 'sets'; // Standaard tab is 'sets'

  // Haal de basisdata op die we nodig hebben voor de selecties en overzichten
  const alleParameters = await db.select().from(parameters);
  const alleSets = await db.select().from(parameterSets);
  const alleGroepen = await db.select().from(groepen);
  
  // Haal de objecten rechtstreeks en type-safe op uit de SQL View!
  const alleBeschikbareObjecten = await db.select().from(vBeschikbareObjecten);

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 px-4">
      {/* Module Titel */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Definities & Groeperingen</h1>
        <p className="text-sm text-slate-500">Stel parameter-sets samen en bundel objecten voor batch-inspecties.</p>
      </div>

      {/* Tab-navigatie */}
      <div className="flex gap-2 border-b border-slate-200 pb-px">
        <Link
          href="/modules/beheer?tab=sets"
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px border ${
            actiefTab === 'sets'
              ? 'bg-white border-slate-200 border-b-white text-blue-600'
              : 'bg-slate-50 border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          ⚙️ Parameter-sets ({alleSets.length})
        </Link>
        <Link
          href="/modules/beheer?tab=groepen"
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px border ${
            actiefTab === 'groepen'
              ? 'bg-white border-slate-200 border-b-white text-blue-600'
              : 'bg-slate-50 border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          📁 Groepen ({alleGroepen.length})
        </Link>
      </div>

      {/* Inhoud op basis van actieve tab */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
        {actiefTab === 'sets' ? (
          <ParameterSetManager 
            sets={alleSets} 
            parameters={alleParameters} 
            activeEditId={editId || null} 
          />
        ) : (
          <GroepManager 
            groepen={alleGroepen} 
            sets={alleSets}
            beschikbareObjecten={alleBeschikbareObjecten} 
            activeEditId={editId || null} 
          />
        )}
      </div>
    </div>
  );
}