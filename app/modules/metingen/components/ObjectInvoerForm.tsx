'use client';

import { useState, useEffect, useTransition } from 'react';
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

  // Selectie van het object en type invoer (Ad-hoc vs Set)
  const [geselecteerdObjectSleutel, setGeselecteerdObjectSleutel] = useState(''); // Formaat: "type|id"
  const [invoerType, setInvoerType] = useState<'set' | 'adhoc'>('set');
  const [geselecteerdeSetId, setGeselecteerdeSetId] = useState('');
  const [geselecteerdeParameterId, setGeselecteerdeParameterId] = useState('');

  // Tijdstip van de meting (Default leeg = NU op de server)
  const [gekozenTijdstip, setGekozenTijdstip] = useState('');

  // Formuliervelden en Historische Referentiedata
  const [actieveVelden, setActieveVelden] = useState<ActiefVeld[]>([]);
  const [historieMap, setHistorieMap] = useState<Record<string, { waarde: string; datumTijd: string }>>({});
  const [formWaarden, setFormWaarden] = useState<Record<string, string>>({});

  // Ontleed de samengestelde object-sleutel
  const getGeselecteerdObject = () => {
    if (!geselecteerdObjectSleutel) return null;
    const [objectType, objectId] = geselecteerdObjectSleutel.split('|');
    return objectenView.find(o => o.objectId === objectId && o.objectType === objectType) || null;
  };

  // Effect 1: Bepaal welke velden getoond moeten worden (op basis van Set of Ad-hoc)
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

  // Effect 2: Zodra het object én de actieve velden bekend zijn -> Haal de allerlaatste historie op!
  useEffect(() => {
    const actieveObject = getGeselecteerdObject();
    if (!actieveObject || actieveVelden.length === 0) {
      setHistorieMap({});
      return;
    }

    const paramIds = actieveVelden.map(v => v.parameterId);
    getLaatsteMetingenVoorObject(actieveObject.objectId, paramIds).then((data) => {
      setHistorieMap(data);
    });
  }, [geselecteerdObjectSleutel, actieveVelden]);

  const handleInputChange = (paramId: string, waarde: string) => {
    setFormWaarden(prev => ({ ...prev, [paramId]: waarde }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const actieveObject = getGeselecteerdObject();
    if (!actieveObject || actieveVelden.length === 0) return;

    // Validatie van verplichte velden
    for (const veld of actieveVelden) {
      if (veld.verplicht && (!formWaarden[veld.parameterId] || formWaarden[veld.parameterId].trim() === '')) {
        alert(`Het veld "${veld.label}" is verplicht.`);
        return;
      }
    }

    // Formateer invoer voor de server actie
    const payload = actieveVelden.map(v => ({
      parameterId: v.parameterId,
      waarde: formWaarden[v.parameterId] || ''
    }));

    startTransition(async () => {
      const result = await saveAdHocMetingen(
        actieveObject.objectId,
        actieveObject.objectType,
        gekozenTijdstip,
        payload
      );

      if (result.success) {
        alert(result.message);
        setFormWaarden({}); // Formulier leegmaken
        
        // Ververs de historie direct zodat de zojuist ingevoerde waarden de 'vorige' waarden worden
        const paramIds = actieveVelden.map(v => v.parameterId);
        const data = await getLaatsteMetingenVoorObject(actieveObject.objectId, paramIds);
        setHistorieMap(data);
      } else {
        alert('Fout: ' + result.message);
      }
    });
  };

  const actieveObject = getGeselecteerdObject();

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-white p-4 md:p-6 rounded-lg border border-slate-200 shadow-sm space-y-5">
      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
        📝 Object-Gerichte Invoer
      </h3>

      {/* STAP 1: KIES OBJECT */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">📍 1. Selecteer Object (Gebouw of Persoon)</label>
        <select
          value={geselecteerdObjectSleutel}
          onChange={e => { setGeselecteerdObjectSleutel(e.target.value); setHistorieMap({}); }}
          className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:ring-1 focus:ring-blue-500"
          required
        >
          <option value="">-- Zoek of selecteer een object uit de database --</option>
          {objectenView.map(o => (
            <option key={`${o.objectType}|${o.objectId}`} value={`${o.objectType}|${o.objectId}`}>
              [{o.objectType.toUpperCase()}] {o.weergaveNaam} {o.extraInfo ? `(${o.extraInfo})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* STAP 2: METHODE KIEZEN */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
        <button
          type="button"
          onClick={() => { setInvoerType('set'); setGeselecteerdeParameterId(''); }}
          className={`py-1.5 text-xs font-medium rounded-md transition-colors ${invoerType === 'set' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          ⚙️ Per Parameter-set (Format B)
        </button>
        <button
          type="button"
          onClick={() => { setInvoerType('adhoc'); setGeselecteerdeSetId(''); }}
          className={`py-1.5 text-xs font-medium rounded-md transition-colors ${invoerType === 'adhoc' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          ⚡ Losse Ad-hoc meting (Format A)
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
        <span className="text-[10px] text-slate-400 block mt-0.5">Leeg laten betekent dat de huidige datum en tijd (NU) automatisch worden opgeslagen.</span>
      </div>

      {/* DYNAMISCHE INVOERVELDEN MET LAATSTE HISTORIE */}
      {actieveVelden.length > 0 && (
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex justify-between">
            <span>In te voeren parameters</span>
            {actieveObject && <span className="text-[10px] text-slate-400 font-normal normal-case">Context voor: {actieveObject.weergaveNaam}</span>}
          </h4>

          <div className="space-y-3.5">
            {actieveVelden.map((veld) => {
              const hist = historieMap[veld.parameterId];
              const huidigeInvoer = formWaarden[veld.parameterId] || '';

              return (
                <div key={veld.parameterId} className="flex flex-col space-y-1 bg-white p-2.5 rounded border border-slate-100 shadow-2xs">
                  <div className="flex justify-between items-baseline">
                    <label className="text-xs font-bold text-slate-700">
                      {veld.label} {veld.verplicht && <span className="text-red-500">*</span>}
                    </label>
                    {/* HISTORISCHE CONTEXT LABEL */}
                    {hist ? (
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200/50" title={`Geregistreerd op: ${new Date(hist.datumTijd).toLocaleString()}`}>
                        Vorige waarde: <strong className="text-slate-700 font-semibold">{hist.waarde}</strong>
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Nog geen eerdere meting</span>
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