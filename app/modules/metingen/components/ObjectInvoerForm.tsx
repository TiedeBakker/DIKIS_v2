'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import { getParametersVoorSet, getLaatsteMetingenVoorObject, getHistorischeMatrixVoorObject, saveAdHocMetingen,updateMetingWaarde, addMetingToBestaandeSessie } from '../actions';
interface ObjectViewRow { objectId: string; objectType: string; weergaveNaam: string; extraInfo: string | null; }
interface ParameterSet { id: string; naam: string; }

interface Parameter { 
  id: string; 
  naam: string; 
  toelichting: string | null;
  parametertypeId: string;
  eenheidId: string | null; 
  keuzelijstId: string | null;
}

interface ActiefVeld {
  parameterId: string;
  label: string;
  eenheid: string | null;
  verplicht: boolean;
  placeholder: string;
}

interface HistorischeRij {
  datumTijd: string;
  sessieId: string;
  waarden: Record<string, { id: string; waarde: string }>;
}

interface Props {
  objectenView: ObjectViewRow[];
  sets: ParameterSet[];
  parameters: Parameter[];
}

export default function ObjectInvoerForm({ objectenView, sets, parameters }: Props) {
  const [isPending, startTransition] = useTransition();

  // Object Zoek & Selectie states
  const [zoekTermObject, setZoekTermObject] = useState('');
  const [toonObjectDropdown, setToonObjectDropdown] = useState(false);
  const [geselecterdObject, setGeselecterdObject] = useState<ObjectViewRow | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Invoer type states (Format A vs Format B)
  const [invoerType, setInvoerType] = useState<'set' | 'adhoc'>('set');
  const [geselecteerdeSetId, setGeselecteerdeSetId] = useState('');
  const [geselecteerdeParameterId, setGeselecteerdeParameterId] = useState('');

  // Tijdstip van de meting
  const [gekozenTijdstip, setGekozenTijdstip] = useState('');

  // Formuliervelden en Historie states
  const [actieveVelden, setActieveVelden] = useState<ActiefVeld[]>([]);
  const [historieMap, setHistorieMap] = useState<Record<string, { waarde: string; datumTijd: string }>>({});
  const [formWaarden, setFormWaarden] = useState<Record<string, string>>({});

  // Sub-tabs & Historische reeks matrix states
  const [actiefSubTab, setActiefSubTab] = useState<'invoer' | 'overzicht'>('invoer');
  const [historischeMatrix, setHistorischeMatrix] = useState<HistorischeRij[]>([]);

  // Sluit de autocomplete-dropdown als je buiten de zoeker klikt
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setToonObjectDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter de objectenlijst live (LIMIT 50)
  const gefilterdeObjecten = objectenView
    .filter(o => {
      const term = zoekTermObject.toLowerCase();
      return (
        o.weergaveNaam.toLowerCase().includes(term) ||
        (o.extraInfo && o.extraInfo.toLowerCase().includes(term)) ||
        o.objectType.toLowerCase().includes(term)
      );
    })
    .slice(0, 50);

  // Bepaal welke velden getoond moeten worden (inclusief eenheidId)
  useEffect(() => {
    setFormWaarden({});
    if (invoerType === 'set' && geselecteerdeSetId) {
      getParametersVoorSet(geselecteerdeSetId).then((regels) => {
        const velden = regels.map(r => {
          const stamParam = parameters.find(p => p.id === r.parameterId);
          return {
            parameterId: r.parameterId,
            label: r.label || stamParam?.naam || 'Onbekend',
            eenheid: stamParam?.eenheidId || null,
            verplicht: r.verplicht,
            placeholder: r.placeholder || ''
          };
        });
        setActieveVelden(velden);
      });
    } else if (invoerType === 'adhoc' && geselecteerdeParameterId) {
      const stamParam = parameters.find(p => p.id === geselecteerdeParameterId);
      setActieveVelden([{
        parameterId: geselecteerdeParameterId,
        label: stamParam?.naam || 'Onbekend',
        eenheid: stamParam?.eenheidId || null,
        verplicht: false,
        placeholder: 'Voer waarde in...'
      }]);
    } else {
      setActieveVelden([]);
    }
  }, [invoerType, geselecteerdeSetId, geselecteerdeParameterId, parameters]);

  // Haal de laatste bekende waarde op voor de invoer-context
  useEffect(() => {
    if (!geselecterdObject || actieveVelden.length === 0) {
      setHistorieMap({});
      return;
    }
    const paramIds = actieveVelden.map(v => v.parameterId);
    getLaatsteMetingenVoorObject(geselecterdObject.objectId, paramIds).then((data) => {
      setHistorieMap(data);
    });
  }, [geselecterdObject, actieveVelden]);

  // Laad de historische matrix zodra het overzicht-tabblad actief wordt
  const laadHistorischeMatrix = () => {
    if (!geselecterdObject || actieveVelden.length === 0) return;
    const paramIds = actieveVelden.map(v => v.parameterId);
    getHistorischeMatrixVoorObject(geselecterdObject.objectId, paramIds).then(data => {
      setHistorischeMatrix(data);
    });
  };

  useEffect(() => {
    if (actiefSubTab === 'overzicht') {
      laadHistorischeMatrix();
    }
  }, [actiefSubTab, geselecterdObject, actieveVelden]);

  const handleInputChange = (paramId: string, waarde: string) => {
    setFormWaarden(prev => ({ ...prev, [paramId]: waarde }));
  };

  // Enter-key focus verschuiving helper
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const volgendeVeld = document.getElementById(`param-input-${index + 1}`);
      if (volgendeVeld) {
        (volgendeVeld as HTMLInputElement).focus();
      } else {
        const opslaanKnop = document.getElementById('btn-submit-meting');
        if (opslaanKnop) opslaanKnop.focus();
      }
    }
  };

  // Dubbelklik interactie binnen de historische matrix
 
const handleCelDubbelKlik = (rij: HistorischeRij, veld: ActiefVeld, huidigeMeting?: { id: string; waarde: string }) => {
  if (!geselecterdObject) return;

  if (huidigeMeting) {
    // SCENARIO A: METING AANPASSEN
    const nieuweWaarde = prompt(
      `Wijzig waarde voor "${veld.label}" (${new Date(rij.datumTijd).toLocaleDateString()}):`, 
      huidigeMeting.waarde
    );
    
    // Annuleren of lege invoer negeren (als ze de waarde leegmaken, mag je eventueel ook de prompt blokkeren)
    if (nieuweWaarde === null || nieuweWaarde.trim() === huidigeMeting.waarde) return;

    startTransition(async () => {
      const result = await updateMetingWaarde(huidigeMeting.id, nieuweWaarde.trim());
      if (result.success) {
        laadHistorischeMatrix(); // Ververs direct de matrix in beeld
      } else {
        alert(result.message);
      }
    });

  } else {
    // SCENARIO B: LEGE CEL INHERENT INVULLEN (DEZELFDE SESSIE)
    const nieuweWaarde = prompt(`Voeg waarde toe voor "${veld.label}" binnen deze historische reeks:`);
    if (!nieuweWaarde || nieuweWaarde.trim() === '') return;

    startTransition(async () => {
      const result = await addMetingToBestaandeSessie({
        sessieId: rij.sessieId,
        objectId: geselecterdObject.objectId,
        objectType: geselecterdObject.objectType,
        datumTijd: rij.datumTijd, // Koppeling aan het historische moment
        parameterId: veld.parameterId,
        waarde: nieuweWaarde.trim()
      });

      if (result.success) {
        laadHistorischeMatrix(); // Ververs direct de matrix in beeld
      } else {
        alert(result.message);
      }
    });
  }
};
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!geselecterdObject || actieveVelden.length === 0) return;

    for (const veld of actieveVelden) {
      if (veld.verplicht && (!formWaarden[veld.parameterId] || formWaarden[veld.parameterId].trim() === '')) {
        alert(`Het veld "${veld.label}" is verplicht.`);
        return;
      }
    }

    const bevestigd = confirm('Weet u zeker dat u deze waarneming(en) wilt opslaan?');
    if (!bevestigd) return;

    const payload = actieveVelden.map(v => ({
      parameterId: v.parameterId,
      waarde: formWaarden[v.parameterId] || ''
    }));

    startTransition(async () => {
      const result = await saveAdHocMetingen(
        geselecterdObject.objectId,
        geselecterdObject.objectType,
        gekozenTijdstip,
        payload
      );

      if (result.success) {
        alert(result.message);
        setFormWaarden({});
        const paramIds = actieveVelden.map(v => v.parameterId);
        const data = await getLaatsteMetingenVoorObject(geselecterdObject.objectId, paramIds);
        setHistorieMap(data);
        if (actiefSubTab === 'overzicht') laadHistorischeMatrix();
      } else {
        alert('Fout: ' + result.message);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto bg-white p-4 md:p-6 rounded-lg border border-slate-200 shadow-sm space-y-5">
      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
        📝 Object-Gerichte Invoer & Historie
      </h3>

      {/* STAP 1: LIVE SEARCH OBJECT AUTOCOMPLETE */}
      <div className="relative" ref={dropdownRef}>
        <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">📍 1. Selecteer Object (Gebouw of Persoon)</label>
        
        {geselecterdObject ? (
          <div className="flex items-center justify-between p-2.5 border border-blue-300 bg-blue-50/50 rounded-md text-sm">
            <div className="min-w-0">
              <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase mr-2 ${geselecterdObject.objectType === 'gebouwen' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'}`}>
                {geselecterdObject.objectType}
              </span>
              <strong className="text-slate-800 font-semibold">{geselecterdObject.weergaveNaam}</strong>
              {geselecterdObject.extraInfo && <span className="text-xs text-slate-500 block md:inline md:ml-2">({geselecterdObject.extraInfo})</span>}
            </div>
            <button
              type="button"
              onClick={() => { setGeselecterdObject(null); setZoekTermObject(''); setHistorieMap({}); setHistorischeMatrix([]); }}
              className="text-slate-400 hover:text-red-500 font-bold px-2 text-base"
            >
              ×
            </button>
          </div>
        ) : (
          <>
            <input
              type="text"
              placeholder="Typ om te zoeken naar adres, plaats of naam..."
              value={zoekTermObject}
              onFocus={() => setToonObjectDropdown(true)}
              onChange={e => setZoekTermObject(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 outline-none"
            />
            {toonObjectDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto divide-y divide-slate-100">
                {gefilterdeObjecten.length === 0 ? (
                  <div className="p-3 text-xs text-slate-400 italic text-center">Geen objecten gevonden.</div>
                ) : (
                  gefilterdeObjecten.map(o => (
                    <div
                      key={`${o.objectType}|${o.objectId}`}
                      onClick={() => {
                        setGeselecterdObject(o);
                        setToonObjectDropdown(false);
                      }}
                      className="p-2.5 text-xs hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div className="truncate pr-4">
                        <span className="font-semibold text-slate-800">{o.weergaveNaam}</span>
                        {o.extraInfo && <span className="text-slate-400 ml-1 text-[10px]">({o.extraInfo})</span>}
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${o.objectType === 'gebouwen' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'}`}>
                        {o.objectType}
                      </span>
                    </div>
                  ))
                )}
                {objectenView.filter(o => o.weergaveNaam.toLowerCase().includes(zoekTermObject.toLowerCase())).length > 50 && (
                  <div className="p-1.5 bg-slate-50 text-[10px] text-slate-400 text-center italic border-t">
                    Resultaten beperkt tot eerste 50 items. Verfijn je zoekterm...
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* STAP 2: METHODE KIEZEN */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
        <button
          type="button"
          onClick={() => { setInvoerType('set'); setGeselecteerdeParameterId(''); }}
          className={`py-1.5 text-xs font-medium rounded-md transition-colors ${invoerType === 'set' ? 'bg-white text-blue-600 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
        >
          ⚙️ Per Parameter-set
        </button>
        <button
          type="button"
          onClick={() => { setInvoerType('adhoc'); setGeselecteerdeSetId(''); }}
          className={`py-1.5 text-xs font-medium rounded-md transition-colors ${invoerType === 'adhoc' ? 'bg-white text-blue-600 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
        >
          ⚡ Losse Ad-hoc meting
        </button>
      </div>

      {/* STAP 3: PARAMETER OF SET KIEZEN */}
      {invoerType === 'set' ? (
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">⚙️ Selecteer Parameter-set</label>
          <select
            value={geselecteerdeSetId}
            onChange={e => setGeselecteerdeSetId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white"
            required={invoerType === 'set'}
          >
            <option value="">-- Kies een set (bijv. Meterstanden of Inspectie) --</option>
            {sets.map(s => <option key={s.id} value={s.id}>{s.naam}</option>)}
          </select>
        </div>
      ) : (
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">⚡ Selecteer Enkele Parameter</label>
          <select
            value={geselecteerdeParameterId}
            onChange={e => setGeselecteerdeParameterId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white"
            required={invoerType === 'adhoc'}
          >
            <option value="">-- Kies de specifieke parameter --</option>
            {parameters.map(p => <option key={p.id} value={p.id}>{p.naam}</option>)}
          </select>
        </div>
      )}

      {/* OPTIONEEL: HANDMATIG TIJDSTIP */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">📅 Tijdstip van waarneming (Optioneel)</label>
        <input
          type="datetime-local"
          value={gekozenTijdstip}
          onChange={e => setGekozenTijdstip(e.target.value)}
          className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-xs text-slate-600 bg-white"
        />
        <span className="text-[10px] text-slate-400 block mt-0.5">Leeg laten gebruikt de huidige datum/tijd (NU).</span>
      </div>

      {/* SUB-TABS VOOR INVOER VS HISTORISCH OVERZICHT */}
      {actieveVelden.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex gap-2 border-b border-slate-200 pb-px">
            <button
              type="button"
              onClick={() => setActiefSubTab('invoer')}
              className={`px-4 py-2 text-xs font-semibold rounded-t-md transition-colors border ${
                actiefSubTab === 'invoer'
                  ? 'bg-slate-50 border-slate-200 border-b-transparent text-blue-600'
                  : 'bg-white border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              📥 Nieuwe Gegevens Invoeren
            </button>
            <button
              type="button"
              onClick={() => setActiefSubTab('overzicht')}
              className={`px-4 py-2 text-xs font-semibold rounded-t-md transition-colors border ${
                actiefSubTab === 'overzicht'
                  ? 'bg-slate-50 border-slate-200 border-b-transparent text-blue-600'
                  : 'bg-white border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              📊 Historisch Overzicht (Reeks)
            </button>
          </div>

          {/* SUB-TAB: INVOER */}
          {actiefSubTab === 'invoer' && (
            <div className="bg-slate-50 p-3 md:p-4 rounded-b-lg border border-slate-200 space-y-4">
              <div className="space-y-3">
                {actieveVelden.map((veld, index) => {
                  const hist = historieMap[veld.parameterId];
                  const huidigeInvoer = formWaarden[veld.parameterId] || '';

                  return (
                    <div key={veld.parameterId} className="flex flex-col space-y-1 bg-white p-2.5 rounded border border-slate-100 shadow-xs">
                      <div className="flex justify-between items-baseline gap-2">
                        <label className="text-xs font-bold text-slate-700 truncate">
                          {veld.label}
                          {veld.eenheid && <span className="text-slate-400 font-normal italic ml-1">({veld.eenheid})</span>}
                          {veld.verplicht && <span className="text-red-500 ml-0.5">*</span>}
                        </label>
                        {hist ? (
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200/50 shrink-0" title={`Geregistreerd op: ${new Date(hist.datumTijd).toLocaleString()}`}>
                            Vorige: <strong className="text-slate-700 font-semibold">{hist.waarde} {veld.eenheid || ''}</strong>
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic shrink-0">Geen historie</span>
                        )}
                      </div>
                      
                      <input
                        id={`param-input-${index}`}
                        type="text"
                        value={huidigeInvoer}
                        onChange={e => handleInputChange(veld.parameterId, e.target.value)}
                        onKeyDown={e => handleKeyDown(e, index)}
                        placeholder={veld.placeholder || (veld.eenheid ? `Bijv. in ${veld.eenheid}` : 'Waarde...')}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  );
                })}
              </div>

              <button
                id="btn-submit-meting"
                type="submit"
                disabled={isPending}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-md text-xs shadow-sm transition-colors disabled:opacity-50"
              >
                {isPending ? '⏳ Opslaan...' : '📥 Waarneming(en) Opslaan'}
              </button>
            </div>
          )}

          {/* SUB-TAB: HISTORISCHE REEKS (GEKANTELD & HORIZONTAAL SCROLLBAAR) */}
          {actiefSubTab === 'overzicht' && (
            <div className="bg-slate-50 p-3 md:p-4 rounded-b-lg border border-slate-200">
              {historischeMatrix.length === 0 ? (
                <div className="bg-white p-8 rounded border border-slate-200 text-center italic text-slate-400 text-xs">
                  Nieuw object: er zijn nog geen metingen bekend voor deze set.
                </div>
              ) : (
                /* WIDGET MET HORIZONTALE SCROLL */
                <div className="w-full overflow-x-auto shadow-xs rounded border border-slate-200 bg-white custom-scrollbar">
                  <table className="w-full text-left text-xs border-collapse table-fixed min-w-[600px]">
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        {/* Eerste kolom is de parameter-naam, deze staat vast */}
                        <th className="px-3 py-2.5 border-r border-slate-200 w-48 bg-slate-100 sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                          📋 Parameter
                        </th>
                        {/* Elke historische meting/datum krijgt nu een kolom naar rechts */}
                        {historischeMatrix.map((rij) => (
                          <th 
                            key={rij.sessieId || rij.datumTijd} 
                            className="px-3 py-2.5 border-r border-slate-200 text-center font-mono text-[10px] w-32 lowercase whitespace-nowrap"
                            title={`Sessie-ID: ${rij.sessieId}`}
                          >
                            {new Date(rij.datumTijd).toLocaleString('nl-NL', { 
                              day: '2-digit', 
                              month: '2-digit', 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-700">
                      {actieveVelden.map((veld) => (
                        <tr key={veld.parameterId} className="hover:bg-slate-50/60 transition-colors">
                          {/* Parameter label (verticaal onder elkaar, net als bij invoer) */}
                          <td className="px-3 py-2.5 font-semibold text-slate-800 border-r border-slate-200 truncate sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                            {veld.label} {veld.eenheid && <span className="text-slate-400 font-normal italic text-[10px]">({veld.eenheid})</span>}
                          </td>
                          
                          {/* Loop door de kolommen (datums) heen om de waarde van deze specifieke parameter te tonen */}
                          {historischeMatrix.map((rij) => {
                            const meting = rij.waarden[veld.parameterId];
                            return (
                              <td
                                key={rij.sessieId || rij.datumTijd}
                                onDoubleClick={() => handleCelDubbelKlik(rij, veld, meting)}
                                className={`px-3 py-2.5 border-r border-slate-200 text-center font-medium cursor-pointer select-none transition-colors ${
                                  meting 
                                    ? 'text-slate-800 hover:bg-amber-50 hover:text-amber-800' 
                                    : 'text-slate-300 italic text-[10px] bg-slate-50/30 hover:bg-blue-50 hover:text-blue-600'
                                }`}
                                title={meting ? "Dubbelklik om aan te passen" : "Dubbelklik om in te vullen"}
                              >
                                {meting ? meting.waarde : '-'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <span className="text-[10px] text-slate-400 block mt-2 italic">💡 Tip: De parameters staan nu verticaal onder elkaar. Scroll horizontaal om oudere metingen te bekijken. Dubbelklik op een cel voor snelle wijziging/invoer.</span>
            </div>
          )}
        </div>
      )}
    </form>
  );
}