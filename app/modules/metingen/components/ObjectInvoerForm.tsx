'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import { getParametersVoorSet, getLaatsteMetingenVoorObject, saveAdHocMetingen } from '../actions';

interface ObjectViewRow { objectId: string; objectType: string; weergaveNaam: string; extraInfo: string | null; }
interface ParameterSet { id: string; naam: string; }
interface Parameter { id: string; naam: string; }

interface ActiefVeld {
  parameterId: string;
  label: string;
  verplicht: boolean;
  placeholder: string;
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
  const [geselecteerdObject, setGeselecteerdObject] = useState<ObjectViewRow | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Invoer type states
  const [invoerType, setInvoerType] = useState<'set' | 'adhoc'>('set');
  const [geselecteerdeSetId, setGeselecteerdeSetId] = useState('');
  const [geselecteerdeParameterId, setGeselecteerdeParameterId] = useState('');

  // Tijdstip van de meting
  const [gekozenTijdstip, setGekozenTijdstip] = useState('');

  // Formuliervelden en Historie
  const [actieveVelden, setActieveVelden] = useState<ActiefVeld[]>([]);
  const [historieMap, setHistorieMap] = useState<Record<string, { waarde: string; datumTijd: string }>>({});
  const [formWaarden, setFormWaarden] = useState<Record<string, string>>({});

  // Sluit de dropdown als je buiten de zoeker klikt
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setToonObjectDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter de objectenlijst live op basis van de zoekterm (LIMIT 50 voor performance)
  const gefilterdeObjecten = objectenView
    .filter(o => {
      const term = zoekTermObject.toLowerCase();
      return (
        o.weergaveNaam.toLowerCase().includes(term) ||
        (o.extraInfo && o.extraInfo.toLowerCase().includes(term)) ||
        o.objectType.toLowerCase().includes(term)
      );
    })
    .slice(0, 50); // <-- Harde limiet voor een overzichtelijke UI

  // Bepaal welke velden getoond moeten worden
  useEffect(() => {
    setFormWaarden({});
    if (invoerType === 'set' && geselecteerdeSetId) {
      getParametersVoorSet(geselecteerdeSetId).then((regels) => {
        const velden = regels.map(r => {
          const stamParam = parameters.find(p => p.id === r.parameterId);
          return {
            parameterId: r.parameterId,
            label: r.label || stamParam?.naam || 'Onbekend',
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
        verplicht: false,
        placeholder: 'Voer waarde in...'
      }]);
    } else {
      setActieveVelden([]);
    }
  }, [invoerType, geselecteerdeSetId, geselecteerdeParameterId, parameters]);

  // Haal historie op zodra object of actieve velden wijzigen
  useEffect(() => {
    if (!geselecteerdObject || actieveVelden.length === 0) {
      setHistorieMap({});
      return;
    }
    const paramIds = actieveVelden.map(v => v.parameterId);
    getLaatsteMetingenVoorObject(geselecteerdObject.objectId, paramIds).then((data) => {
      setHistorieMap(data);
    });
  }, [geselecteerdObject, actieveVelden]);

  const handleInputChange = (paramId: string, waarde: string) => {
    setFormWaarden(prev => ({ ...prev, [paramId]: waarde }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!geselecteerdObject || actieveVelden.length === 0) return;

    for (const veld of actieveVelden) {
      if (veld.verplicht && (!formWaarden[veld.parameterId] || formWaarden[veld.parameterId].trim() === '')) {
        alert(`Het veld "${veld.label}" is verplicht.`);
        return;
      }
    }

    const payload = actieveVelden.map(v => ({
      parameterId: v.parameterId,
      waarde: formWaarden[v.parameterId] || ''
    }));

    startTransition(async () => {
      const result = await saveAdHocMetingen(
        geselecteerdObject.objectId,
        geselecteerdObject.objectType,
        gekozenTijdstip,
        payload
      );

      if (result.success) {
        alert(result.message);
        setFormWaarden({});
        const paramIds = actieveVelden.map(v => v.parameterId);
        const data = await getLaatsteMetingenVoorObject(geselecteerdObject.objectId, paramIds);
        setHistorieMap(data);
      } else {
        alert('Fout: ' + result.message);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-white p-4 md:p-6 rounded-lg border border-slate-200 shadow-sm space-y-5">
      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
        📝 Object-Gerichte Invoer
      </h3>

      {/* STAP 1: LIVE SEARCH OBJECT AUTOCOMPLETE */}
      <div className="relative" ref={dropdownRef}>
        <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">📍 1. Selecteer Object (Gebouw of Persoon)</label>
        
        {geselecteerdObject ? (
          // Geselecteerde status (klik op de 'x' om opnieuw te zoeken)
          <div className="flex items-center justify-between p-2.5 border border-blue-300 bg-blue-50/50 rounded-md text-sm">
            <div className="min-w-0">
              <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase mr-2 ${geselecteerdObject.objectType === 'gebouwen' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'}`}>
                {geselecteerdObject.objectType}
              </span>
              <strong className="text-slate-800 font-semibold">{geselecteerdObject.weergaveNaam}</strong>
              {geselecteerdObject.extraInfo && <span className="text-xs text-slate-500 block md:inline md:ml-2">({geselecteerdObject.extraInfo})</span>}
            </div>
            <button
              type="button"
              onClick={() => { setGeselecteerdObject(null); setZoekTermObject(''); setHistorieMap({}); }}
              className="text-slate-400 hover:text-red-500 font-bold px-2 text-base"
            >
              ×
            </button>
          </div>
        ) : (
          // Actieve zoekbalk
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
                        setGeselecteerdObject(o);
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
        <span className="text-[10px] text-slate-400 block mt-0.5">Leeg laten betekent dat de huidige datum/tijd (NU) automatisch wordt opgeslagen.</span>
      </div>

      {/* DYNAMISCHE INVOERVELDEN MET LAATSTE HISTORIE */}
      {actieveVelden.length > 0 && (
        <div className="bg-slate-50 p-3 md:p-4 rounded-lg border border-slate-200 space-y-4">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex justify-between">
            <span>In te voeren parameters</span>
            {geselecteerdObject && <span className="text-[10px] text-slate-400 font-normal normal-case">Context voor: {geselecteerdObject.weergaveNaam}</span>}
          </h4>

          <div className="space-y-3">
            {actieveVelden.map((veld) => {
              const hist = historieMap[veld.parameterId];
              const huidigeInvoer = formWaarden[veld.parameterId] || '';

              return (
                <div key={veld.parameterId} className="flex flex-col space-y-1 bg-white p-2.5 rounded border border-slate-100 shadow-xs">
                  <div className="flex justify-between items-baseline gap-2">
                    <label className="text-xs font-bold text-slate-700 truncate">
                      {veld.label} {veld.verplicht && <span className="text-red-500">*</span>}
                    </label>
                    {hist ? (
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200/50 shrink-0" title={`Geregistreerd op: ${new Date(hist.datumTijd).toLocaleString()}`}>
                        Vorige: <strong className="text-slate-700 font-semibold">{hist.waarde}</strong>
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic shrink-0">Geen historie</span>
                    )}
                  </div>
                  
                  <input
                    type="text"
                    value={huidigeInvoer}
                    onChange={e => handleInputChange(veld.parameterId, e.target.value)}
                    placeholder={veld.placeholder}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
              );
            })}
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-md text-xs shadow-sm transition-colors disabled:opacity-50"
          >
            {isPending ? '⏳ Opslaan...' : '📥 Waarneming(en) Opslaan'}
          </button>
        </div>
      )}
    </form>
  );
}