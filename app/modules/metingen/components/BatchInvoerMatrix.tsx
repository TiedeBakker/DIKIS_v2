'use client';

import { useState, useEffect, useTransition } from 'react';
import { getParametersVoorSet, saveBatchMetingen } from '../actions';

interface Groep { id: string; naam: string; standaardSetId: string | null; }
interface ParameterSet { id: string; naam: string; }
interface Parameter { id: string; naam: string; }
interface GroepObjectKoppeling { groepId: string; objectId: string; objectType: string; }
interface ObjectViewRow { objectId: string; objectType: string; weergaveNaam: string; extraInfo: string | null; }

interface Props {
  groepen: Groep[];
  sets: ParameterSet[];
  parameters: Parameter[];
  objectenView: ObjectViewRow[];
  groepKoppelingen: GroepObjectKoppeling[];
}

export default function BatchInvoerMatrix({ groepen, sets, parameters, objectenView, groepKoppelingen }: Props) {
  const [isPending, startTransition] = useTransition();

  // Selectie-states
  const [geselecteerdeGroepId, setGeselecteerdeGroepId] = useState('');
  const [geselecteerdeSetId, setGeselecteerdeSetId] = useState('');

  // Matrix-states (Welke kolommen en welke rijen doen mee?)
  const [actieveKolommen, setActieveKolommen] = useState<{ parameterId: string; label: string; verplicht: boolean; placeholder: string }[]>([]);
  const [actieveRijen, setActieveRijen] = useState<ObjectViewRow[]>([]);

  // De state waarin alle ingetypte waarden live worden bijgehouden: Sleutel = "objectId-parameterId"
  const [matrixWaarden, setMatrixWaarden] = useState<Record<string, string>>({});

  // 1. Als de groep wijzigt, zet direct de juiste rijen klaar én selecteer de standaard parameterset
  useEffect(() => {
    if (!geselecteerdeGroepId) {
      setActieveRijen([]);
      setGeselecteerdeSetId('');
      return;
    }

    const huidigeGroep = groepen.find(g => g.id === geselecteerdeGroepId);
    
    // Filter welke objecten in deze groep zitten
    const gekoppeldeLeden = groepKoppelingen.filter(k => k.groepId === geselecteerdeGroepId);
    
    // Match deze leden met de rij-informatie (namen/adressen) uit de SQL View
    const gematchteRijen = gekoppeldeLeden.map(lid => {
      return objectenView.find(o => o.objectId === lid.objectId && o.objectType === lid.objectType);
    }).filter(Boolean) as ObjectViewRow[];

    setActieveRijen(gematchteRijen);

    // Auto-selecteer de standaard set als die er is
    if (huidigeGroep?.standaardSetId) {
      setGeselecteerdeSetId(huidigeGroep.standaardSetId);
    } else {
      setGeselecteerdeSetId('');
    }
    setMatrixWaarden({}); // Reset invoer bij groepswissel
  }, [geselecteerdeGroepId, groepen, groepKoppelingen, objectenView]);

  // 2. Als de parameterset wijzigt (of geladen wordt), haal de regels op voor de kolommen
  useEffect(() => {
    if (!geselecteerdeSetId) {
      setActieveKolommen([]);
      return;
    }

    getParametersVoorSet(geselecteerdeSetId).then((regels) => {
      const kolommen = regels.map(r => {
        const stamParam = parameters.find(p => p.id === r.parameterId);
        return {
          parameterId: r.parameterId,
          label: r.label || stamParam?.naam || 'Onbekend',
          verplicht: r.verplicht,
          placeholder: r.placeholder || ''
        };
      });
      setActieveKolommen(kolommen);
    });
  }, [geselecteerdeSetId, parameters]);

  // Handler om een cel-waarde aan te passen in de state
  const handleCellChange = (objId: string, paramId: string, waarde: string) => {
    setMatrixWaarden(prev => ({
      ...prev,
      [`${objId}-${paramId}`]: waarde
    }));
  };

  // Verzenden van de complete matrix naar de server action
  const handleSaveMatrix = () => {
    if (actieveRijen.length === 0 || actieveKolommen.length === 0) return;

    // Valideer eerst de verplichte velden
    for (const rij of actieveRijen) {
      for (const kol of actieveKolommen) {
        if (kol.verplicht) {
          const waarde = matrixWaarden[`${rij.objectId}-${kol.parameterId}`];
          if (!waarde || waarde.trim() === '') {
            alert(`Fout: Het veld "${kol.label}" is verplicht voor object "${rij.weergaveNaam}".`);
            return;
          }
        }
      }
    }

    // Bouw de platte array op die de server action verwacht
    const payload: { objectId: string; objectType: string; parameterId: string; waarde: string }[] = [];
    
    actieveRijen.forEach(rij => {
      actieveKolommen.forEach(kol => {
        const waarde = matrixWaarden[`${rij.objectId}-${kol.parameterId}`] || '';
        payload.push({
          objectId: rij.objectId,
          objectType: rij.objectType,
          parameterId: kol.parameterId,
          waarde: waarde
        });
      });
    });

    startTransition(async () => {
      const result = await saveBatchMetingen(payload);
      if (result.success) {
        alert(result.message);
        setMatrixWaarden({}); // Maak matrix leeg na succesvolle opslag
      } else {
        alert('Er ging iets mis: ' + result.message);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* SELECTIE PANEL */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Stap 1: Kies een Groep</label>
          <select
            value={geselecteerdeGroepId}
            onChange={e => setGeselecteerdeGroepId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">-- Selecteer Groep (Laadt bijbehorende objecten) --</option>
            {groepen.map(g => <option key={g.id} value={g.id}>{g.naam}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Stap 2: Controleer/Kies Parameter-set</label>
          <select
            value={geselecteerdeSetId}
            onChange={e => setGeselecteerdeSetId(e.target.value)}
            disabled={!geselecteerdeGroepId}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="">-- Kies een Parameter-set (Kolommen) --</option>
            {sets.map(s => <option key={s.id} value={s.id}>{s.naam}</option>)}
          </select>
        </div>
      </div>

      {/* MATRIX RENDERER */}
      {!geselecteerdeGroepId || !geselecteerdeSetId ? (
        <div className="p-12 bg-white border border-dashed border-slate-300 rounded-lg text-center text-slate-400 italic text-sm">
          Selecteer hierboven een Groep en Parameter-set om het invoerscherm te genereren.
        </div>
      ) : actieveRijen.length === 0 ? (
        <div className="p-12 bg-white border border-slate-300 rounded-lg text-center text-slate-500 italic text-sm">
          ⚠️ Deze groep bevat op dit moment nog geen objecten. Voeg eerst objecten toe via het Beheer.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden space-y-4 p-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Invoermatrix</h3>
              <p className="text-xs text-slate-400">Rijen vloeien live uit de SQL View. Leeg gelaten velden worden overgeslagen.</p>
            </div>
            <button
              onClick={handleSaveMatrix}
              disabled={isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-md text-xs shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              📥 Batch Metingen Opslaan
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse border border-slate-200">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="px-3 py-3 border border-slate-200 min-w-[280px]">📍 Object (Gebouw / Persoon uit View)</th>
                  {actieveKolommen.map(kol => (
                    <th key={kol.parameterId} className="px-3 py-3 border border-slate-200 min-w-[160px]">
                      <div className="flex flex-col">
                        <span>{kol.label}</span>
                        {kol.verplicht && <span className="text-[10px] text-red-500 font-bold font-sans">* Verplicht</span>}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {actieveRijen.map(rij => (
                  <tr key={`${rij.objectType}-${rij.objectId}`} className="hover:bg-slate-50/80 transition-colors">
                    {/* Linker kolom: Object informatie */}
                    <td className="px-3 py-2 border border-slate-200">
                      <div className="font-semibold text-slate-800">{rij.weergaveNaam}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-xs">{rij.extraInfo}</div>
                    </td>
                    
                    {/* Dynamische invoercellen op basis van de parameters */}
                    {actieveKolommen.map(kol => {
                      const uniekeSleutel = `${rij.objectId}-${kol.parameterId}`;
                      const huidigeWaarde = matrixWaarden[uniekeSleutel] || '';
                      
                      return (
                        <td key={kol.parameterId} className="p-1 border border-slate-200 bg-white">
                          <input
                            type="text"
                            value={huidigeWaarde}
                            onChange={e => handleCellChange(rij.objectId, kol.parameterId, e.target.value)}
                            placeholder={kol.placeholder}
                            className={`w-full px-2.5 py-1.5 text-xs rounded border focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors ${
                              kol.verplicht && huidigeWaarde.trim() === '' 
                                ? 'border-amber-200 bg-amber-50/20' 
                                : 'border-slate-200'
                            }`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}