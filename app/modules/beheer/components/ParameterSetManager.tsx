'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveParameterSet, saveSetRegels, getSetRegels } from '../actions';

interface ParameterSet {
  id: string;
  naam: string;
  toelichting: string | null;
}

interface Parameter {
  id: string;
  naam: string;
  toelichting: string | null;
}

interface SetRegelState {
  parameterId: string;
  verplicht: boolean;
  volgnr: number;
  label: string;
  placeholder: string;
}

interface Props {
  sets: ParameterSet[];
  parameters: Parameter[];
  activeEditId: string | null;
}

export default function ParameterSetManager({ sets, parameters, activeEditId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [naam, setNaam] = useState('');
  const [toelichting, setToelichting] = useState('');
  const [gekoppeldeRegels, setGekoppeldeRegels] = useState<SetRegelState[]>([]);
  const [zoekTerm, setZoekTerm] = useState('');

  useEffect(() => {
    if (activeEditId) {
      const gekozenSet = sets.find(s => s.id === activeEditId);
      if (gekozenSet) {
        setNaam(gekozenSet.naam);
        setToelichting(gekozenSet.toelichting || '');
        
        getSetRegels(activeEditId).then((regels) => {
          setGekoppeldeRegels(regels.map(r => ({
            parameterId: r.parameterId,
            verplicht: r.verplicht || false,
            volgnr: r.volgnr || 1,
            label: r.label || '',
            placeholder: r.placeholder || ''
          })));
        });
      }
    } else {
      setNaam('');
      setToelichting('');
      setGekoppeldeRegels([]);
    }
  }, [activeEditId, sets]);

  const handleSaveSet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!naam.trim()) return;

    startTransition(async () => {
      await saveParameterSet(activeEditId, { naam, toelichting });
      if (!activeEditId) {
        setNaam('');
        setToelichting('');
      }
    });
  };

  const handleAddParameter = (parameterId: string) => {
    if (gekoppeldeRegels.some(r => r.parameterId === parameterId)) return;
    const hoogsteVolgnr = gekoppeldeRegels.reduce((max, r) => r.volgnr > max ? r.volgnr : max, 0);
    const paramMeta = parameters.find(p => p.id === parameterId);

    setGekoppeldeRegels([
      ...gekoppeldeRegels,
      {
        parameterId,
        verplicht: false,
        volgnr: hoogsteVolgnr + 1,
        label: paramMeta?.naam || '',
        placeholder: ''
      }
    ]);
  };

  const handleUpdateRegel = (paramId: string, veld: keyof SetRegelState, waarde: any) => {
    setGekoppeldeRegels(gekoppeldeRegels.map(r => 
      r.parameterId === paramId ? { ...r, [veld]: waarde } : r
    ));
  };

  const handleRemoveRegel = (paramId: string) => {
    setGekoppeldeRegels(gekoppeldeRegels.filter(r => r.parameterId !== paramId));
  };

  const handleSaveRegels = () => {
    if (!activeEditId) return;
    startTransition(async () => {
      const gesorteerd = [...gekoppeldeRegels].sort((a, b) => a.volgnr - b.volgnr);
      await saveSetRegels(activeEditId, gesorteerd);
      alert('Parameter-set regels succesvol bijgewerkt!');
    });
  };

  const beschikbareParameters = parameters.filter(p => 
    !gekoppeldeRegels.some(r => r.parameterId === p.id) &&
    p.naam.toLowerCase().includes(zoekTerm.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* LINKS: HOOFDFORMULIER */}
      <div className="space-y-6 lg:col-span-1">
        <form onSubmit={handleSaveSet} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            {activeEditId ? '📝 Set Aanpassen' : '➕ Nieuwe Parameter-set'}
          </h3>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Naam van de set</label>
            <input
              type="text"
              value={naam}
              onChange={e => setNaam(e.target.value)}
              placeholder="Bijv. Energie-audit"
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Toelichting</label>
            <textarea
              value={toelichting}
              onChange={e => setToelichting(e.target.value)}
              placeholder="Waarvoor dient deze set?"
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 h-20"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={isPending} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md text-sm transition-colors disabled:opacity-50">
              {activeEditId ? 'Bijwerken' : 'Set Aanmaken'}
            </button>
            {activeEditId && (
              <button type="button" onClick={() => router.push('/modules/beheer?tab=sets')} className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium py-2 px-3 rounded-md text-sm transition-colors">
                Nieuw
              </button>
            )}
          </div>
        </form>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3 bg-slate-100 border-b border-slate-200 font-semibold text-xs text-slate-700 uppercase">Beschikbare Sets</div>
          <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
            {sets.map(s => (
              <div key={s.id} onClick={() => router.push(`/modules/beheer?tab=sets&editId=${s.id}`)} className={`p-3 cursor-pointer transition-colors text-sm flex justify-between items-center ${activeEditId === s.id ? 'bg-blue-50 font-semibold text-blue-700' : 'hover:bg-slate-50 text-slate-700'}`}>
                <div>
                  <div>{s.naam}</div>
                  <div className="text-xs text-slate-400 font-normal truncate max-w-50">{s.toelichting}</div>
                </div>
                <span>➔</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RECHTS: MIXED VENSTER (BOVEN: ACTUEEL, ONDER: ZOEKEN/TOEVOEGEN) */}
      <div className="lg:col-span-2 space-y-4">
        {!activeEditId ? (
          <div className="p-8 bg-white border border-dashed border-slate-300 rounded-lg text-center text-slate-400 italic text-sm">
            Selecteer of maak eerst een set aan om de parameters te beheren.
          </div>
        ) : (
          <>
            {/* BOVENSTE DEEL: ACTUELE PARAMETERS IN SET */}
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">📋 Gekoppelde parameters in deze set ({gekoppeldeRegels.length})</h4>
                <button onClick={handleSaveRegels} disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-1 px-3 rounded text-xs transition-colors disabled:opacity-50">
                  💾 Volgorde & Wijzigingen Opslaan
                </button>
              </div>
              
              <div className="overflow-x-auto max-h-64 overflow-y-auto border border-slate-100 rounded">
                <table className="w-full text-left text-xs text-slate-600 border-collapse">
                  <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="px-2 py-2 w-16 text-center">Volgnr</th>
                      <th className="px-2 py-2 w-1/4">Stam Parameter</th>
                      <th className="px-2 py-2">Invoer Label</th>
                      <th className="px-2 py-2 w-28">Placeholder</th>
                      <th className="px-2 py-2 text-center w-16">Verplicht</th>
                      <th className="px-2 py-2 text-right w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {gekoppeldeRegels.length === 0 ? (
                      <tr><td colSpan={6} className="p-4 text-center text-slate-400 italic">De set is nog leeg. Klik hieronder op parameters om ze toe te voegen.</td></tr>
                    ) : (
                      [...gekoppeldeRegels].sort((a, b) => a.volgnr - b.volgnr).map((regel) => {
                        const paramMeta = parameters.find(p => p.id === regel.parameterId);
                        return (
                          <tr key={regel.parameterId} className="hover:bg-slate-50 transition-colors">
                            <td className="px-2 py-1"><input type="number" value={regel.volgnr} onChange={e => handleUpdateRegel(regel.parameterId, 'volgnr', Number(e.target.value))} className="w-12 px-1 py-0.5 border border-slate-300 rounded text-center" /></td>
                            <td className="px-2 py-1 font-medium text-slate-800">{paramMeta?.naam}</td>
                            <td className="px-2 py-1"><input type="text" value={regel.label} onChange={e => handleUpdateRegel(regel.parameterId, 'label', e.target.value)} className="w-full px-2 py-0.5 border border-slate-300 rounded" /></td>
                            <td className="px-2 py-1"><input type="text" value={regel.placeholder} onChange={e => handleUpdateRegel(regel.parameterId, 'placeholder', e.target.value)} className="w-full px-2 py-0.5 border border-slate-300 rounded text-slate-400" /></td>
                            <td className="px-2 py-1 text-center"><input type="checkbox" checked={regel.verplicht} onChange={e => handleUpdateRegel(regel.parameterId, 'verplicht', e.target.checked)} className="h-3.5 w-3.5 text-blue-600 border-slate-300 rounded" /></td>
                            <td className="px-2 py-1 text-right"><button onClick={() => handleRemoveRegel(regel.parameterId)} className="text-red-500 hover:text-red-700 font-bold text-sm px-2">×</button></td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ONDERSTE DEEL: ZOEKEN & TOEVOEGEN UIT DATABASE */}
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
              <div className="border-b border-slate-100 pb-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">🔍 Parameter toevoegen uit stamgegevens</h4>
              </div>
              <input type="text" placeholder="Type om te zoeken door alle stam-parameters..." value={zoekTerm} onChange={e => setZoekTerm(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 bg-slate-50" />
              <div className="border border-slate-200 rounded max-h-48 overflow-y-auto divide-y divide-slate-100 bg-slate-50/50">
                {beschikbareParameters.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 italic">Geen (nieuwe) parameters gevonden.</div>
                ) : (
                  beschikbareParameters.map(p => (
                    <div key={p.id} onClick={() => handleAddParameter(p.id)} className="p-2 flex justify-between items-center text-xs hover:bg-blue-50 cursor-pointer transition-colors text-slate-700">
                      <div>
                        <span className="font-semibold text-slate-800">{p.naam}</span>
                        <span className="text-[10px] text-slate-400 ml-2 italic">{p.toelichting}</span>
                      </div>
                      <span className="text-blue-600 font-bold text-sm bg-blue-100/50 px-2 rounded hover:bg-blue-200">+ Voeg toe</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}