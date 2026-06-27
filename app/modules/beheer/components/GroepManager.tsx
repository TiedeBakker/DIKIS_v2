'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveGroep, saveGroepObjecten, getGroepObjecten } from '../actions';

interface Groep {
  id: string;
  naam: string;
  toelichting: string | null;
  standaardSetId: string | null;
}

interface ParameterSet {
  id: string;
  naam: string;
}

interface BeschikbaarObject {
  objectId: string;
  objectType: string;
  weergaveNaam: string;
  extraInfo: string | null;
}

interface GekoppeldObjectState {
  objectId: string;
  objectType: string;
}

interface Props {
  groepen: Groep[];
  sets: ParameterSet[];
  beschikbareObjecten: BeschikbaarObject[];
  activeEditId: string | null;
}

export default function GroepManager({ groepen, sets, beschikbareObjecten, activeEditId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [naam, setNaam] = useState('');
  const [toelichting, setToelichting] = useState('');
  const [standaardSetId, setStandaardSetId] = useState('');
  const [gekoppeldeObjecten, setGekoppeldeObjecten] = useState<GekoppeldObjectState[]>([]);
  const [zoekTerm, setZoekTerm] = useState('');

  useEffect(() => {
    if (activeEditId) {
      const gekozenGroep = groepen.find(g => g.id === activeEditId);
      if (gekozenGroep) {
        setNaam(gekozenGroep.naam);
        setToelichting(gekozenGroep.toelichting || '');
        setStandaardSetId(gekozenGroep.standaardSetId || '');
        
        getGroepObjecten(activeEditId).then((objLinks) => {
          setGekoppeldeObjecten(objLinks.map(o => ({
            objectId: o.objectId,
            objectType: o.objectType
          })));
        });
      }
    } else {
      setNaam('');
      setToelichting('');
      setStandaardSetId('');
      setGekoppeldeObjecten([]);
    }
  }, [activeEditId, groepen]);

  const handleSaveGroep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!naam.trim()) return;

    startTransition(async () => {
      await saveGroep(activeEditId, { naam, toelichting, standaardSetId: standaardSetId || null });
      if (!activeEditId) {
        setNaam('');
        setToelichting('');
        setStandaardSetId('');
      }
    });
  };

  const handleToggleObject = (objId: string, objType: string) => {
    const bestaatAl = gekoppeldeObjecten.some(o => o.objectId === objId && o.objectType === objType);
    if (bestaatAl) {
      setGekoppeldeObjecten(gekoppeldeObjecten.filter(o => !(o.objectId === objId && o.objectType === objType)));
    } else {
      setGekoppeldeObjecten([...gekoppeldeObjecten, { objectId: objId, objectType: objType }]);
    }
  };

  const handleSaveKoppelingen = () => {
    if (!activeEditId) return;
    startTransition(async () => {
      await saveGroepObjecten(activeEditId, gekoppeldeObjecten);
      alert('Groepsleden succesvol bijgewerkt!');
    });
  };

  const gefilterdeObjecten = beschikbareObjecten.filter(obj => {
    const term = zoekTerm.toLowerCase();
    return (
      obj.weergaveNaam.toLowerCase().includes(term) ||
      (obj.extraInfo && obj.extraInfo.toLowerCase().includes(term)) ||
      obj.objectType.toLowerCase().includes(term)
    );
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* LINKS: HOOFDFORMULIER */}
      <div className="space-y-6 lg:col-span-1">
        <form onSubmit={handleSaveGroep} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">{activeEditId ? '📝 Groep Aanpassen' : '➕ Nieuwe Groep'}</h3>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Naam van de groep</label>
            <input type="text" value={naam} onChange={e => setNaam(e.target.value)} placeholder="Bijv. Woningen Complex A" className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Toelichting</label>
            <textarea value={toelichting} onChange={e => setToelichting(e.target.value)} placeholder="Toelichting..." className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm h-16" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Standaard Parameter-set</label>
            <select value={standaardSetId} onChange={e => setStandaardSetId(e.target.value || '')} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white">
              <option value="">-- Geen standaard set --</option>
              {sets.map(s => <option key={s.id} value={s.id}>{s.naam}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={isPending} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md text-sm transition-colors disabled:opacity-50">{activeEditId ? 'Bijwerken' : 'Groep Aanmaken'}</button>
            {activeEditId && <button type="button" onClick={() => router.push('/modules/beheer?tab=groepen')} className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium py-2 px-3 rounded-md text-sm transition-colors">Nieuw</button>}
          </div>
        </form>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3 bg-slate-100 border-b border-slate-200 font-semibold text-xs text-slate-700 uppercase">Beschikbare Groepen</div>
          <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto">
            {groepen.map(g => {
              const setMeta = sets.find(s => s.id === g.standaardSetId);
              return (
                <div key={g.id} onClick={() => router.push(`/modules/beheer?tab=groepen&editId=${g.id}`)} className={`p-3 cursor-pointer text-sm flex justify-between items-center ${activeEditId === g.id ? 'bg-blue-50 font-semibold text-blue-700' : 'hover:bg-slate-50 text-slate-700'}`}>
                  <div>
                    <div>{g.naam}</div>
                    {setMeta && <div className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded-full mt-0.5">⚙️ {setMeta.naam}</div>}
                  </div>
                  <span>➔</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* RECHTS: MIXED VENSTER (BOVEN: ACTUELE LEDEN, ONDER: LIVE SEARCH VIEW) */}
      <div className="lg:col-span-2 space-y-4">
        {!activeEditId ? (
          <div className="p-8 bg-white border border-dashed border-slate-300 rounded-lg text-center text-slate-400 italic text-sm">
            Selecteer of maak eerst een groep aan om objecten te bundelen.
          </div>
        ) : (
          <>
            {/* BOVENSTE DEEL: ACTUELE LEDEN BINNEN DE GROEP */}
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">📁 Huidige groepsleden ({gekoppeldeObjecten.length} objecten)</h4>
                <button onClick={handleSaveKoppelingen} disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-1 px-3 rounded text-xs transition-colors disabled:opacity-50">
                  💾 Ledenlijst Opslaan
                </button>
              </div>
              <div className="border border-slate-100 rounded max-h-48 overflow-y-auto divide-y divide-slate-100 bg-white">
                {gekoppeldeObjecten.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 italic">Deze groep heeft nog geen leden. Vink hieronder objecten aan.</div>
                ) : (
                  gekoppeldeObjecten.map((linked) => {
                    const objMeta = beschikbareObjecten.find(o => o.objectId === linked.objectId && o.objectType === linked.objectType);
                    return (
                      <div key={`${linked.objectType}-${linked.objectId}`} className="p-2 flex justify-between items-center text-xs hover:bg-slate-50">
                        <div>
                          <span className="font-semibold text-slate-800">{objMeta?.weergaveNaam || 'Onbekend object'}</span>
                          <span className="text-[10px] text-slate-400 ml-2 truncate max-w-xs">{objMeta?.extraInfo}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${linked.objectType === 'gebouwen' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'}`}>{linked.objectType}</span>
                          <button onClick={() => handleToggleObject(linked.objectId, linked.objectType)} className="text-red-500 hover:text-red-700 font-bold px-1 text-sm">×</button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ONDERSTE DEEL: SEARCH MATRIX (VIEW CATALOGUS) */}
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
              <div className="border-b border-slate-100 pb-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">🔍 Catalogus (Zoeken & Toevoegen via SQL View)</h4>
              </div>
              <input type="text" placeholder="Type adres, straat, plaats of naam om te filteren..." value={zoekTerm} onChange={e => setZoekTerm(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 bg-slate-50" />
              <div className="border border-slate-200 rounded max-h-64 overflow-y-auto divide-y divide-slate-100 bg-slate-50/50">
                {gefilterdeObjecten.map((obj) => {
                  const isGeselecteerd = gekoppeldeObjecten.some(o => o.objectId === obj.objectId && o.objectType === obj.objectType);
                  return (
                    <div key={`${obj.objectType}-${obj.objectId}`} onClick={() => handleToggleObject(obj.objectId, obj.objectType)} className={`p-2 flex items-center gap-3 text-xs cursor-pointer select-none transition-colors ${isGeselecteerd ? 'bg-blue-50/50 text-blue-800' : 'hover:bg-slate-100'}`}>
                      <input type="checkbox" checked={isGeselecteerd} readOnly className="h-3.5 w-3.5 text-blue-600 rounded border-slate-300 pointer-events-none" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-800 truncate">{obj.weergaveNaam}</div>
                        <div className="text-slate-400 truncate text-[10px]">{obj.extraInfo}</div>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${obj.objectType === 'gebouwen' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'}`}>{obj.objectType}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}