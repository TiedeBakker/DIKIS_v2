// src/app/modules/metingen/page.tsx
import { db } from '@/db';
import { groepen, parameterSets, vBeschikbareObjecten, parameters, groepObjecten } from '@/db/schema';
import Link from 'next/link';
import ObjectInvoerForm from './components/ObjectInvoerForm';
import BatchInvoerMatrix from './components/BatchInvoerMatrix';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ tab?: string }>;
}

export default async function MetingenPage({ searchParams }: Props) {
  const { tab } = await searchParams;
  const actiefTab = tab || 'object';

  // Haal alle benodigde data centraal op
  const alleGroepen = await db.select().from(groepen);
  const alleSets = await db.select().from(parameterSets);
  const alleParameters = await db.select().from(parameters);
  const alleObjectenUitView = await db.select().from(vBeschikbareObjecten);
  const alleGroepKoppelingen = await db.select().from(groepObjecten);

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 px-4 py-2">
      {/* Module Kop */}
      <div>
        <p className="text-xl font-bold text-slate-900">Metingen & Inspecties</p>
        <p className="text-sm text-slate-500">Registreer waarnemingen per object of via de backoffice matrix.</p>
      </div>

      {/* Tab Navigatie */}
      <div className="flex gap-2 border-b border-slate-200 pb-px">
        <Link
          href="/modules/metingen?tab=object"
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px border ${
            actiefTab === 'object'
              ? 'bg-white border-slate-200 border-b-white text-blue-600 font-semibold'
              : 'bg-slate-50 border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          📱 Object Invoer (Ad-hoc & Sets)
        </Link>
        <Link
          href="/modules/metingen?tab=batch"
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px border ${
            actiefTab === 'batch'
              ? 'bg-white border-slate-200 border-b-white text-blue-600 font-semibold'
              : 'bg-slate-50 border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          🧮 Batch Matrix
        </Link>
      </div>

      {/* Tab Inhoud */}
      <div className="bg-slate-50 p-2 md:p-4 rounded-xl border border-slate-200">
        {actiefTab === 'object' ? (
          <ObjectInvoerForm 
            objectenView={alleObjectenUitView}
            sets={alleSets}
            parameters={alleParameters}
          />
        ) : (
          <BatchInvoerMatrix 
            groepen={alleGroepen}
            sets={alleSets}
            parameters={alleParameters}
            objectenView={alleObjectenUitView}
            groepKoppelingen={alleGroepKoppelingen}
          />
        )}
      </div>
    </div>
  );
}