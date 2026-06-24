// src/components/GenericForm.tsx
'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export interface MetadataField {
  id: string;
  veldId: string;
  veldLabel: string;
  veldType: string;
  verplicht: boolean | number;
  toelichting?: string | null;
}

interface GenericFormProps {
  tabelNaam: string;
  fields: MetadataField[];
  onSubmit: (formData: Record<string, any>, editId?: string | null) => Promise<void>;
  initialData?: Record<string, any> | null;
}

export default function GenericForm({ tabelNaam, fields, onSubmit, initialData }: GenericFormProps) {
  const [isPending, startTransition] = useTransition();
  const [succes, setSucces] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [onthoudGegevens, setOnthoudGegevens] = useState(false);
  const [isGewijzigdNaOpslaan, setIsGewijzigdNaOpslaan] = useState(true);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditing = !!initialData; // Zijn we aan het editen?

  // Local state voor de input-waarden zodat we ze kunnen vullen bij bewerken
  const [formValues, setFormValues] = useState<Record<string, any>>({});

  // Zodra initialData verandert (door dubbelklik), vul de velden
  useEffect(() => {
    if (initialData) {
      setFormValues(initialData);
      setIsGewijzigdNaOpslaan(false); // Blokkeer tot er écht iets aan gepast is
    } else {
      setFormValues({});
      setIsGewijzigdNaOpslaan(true);
    }
  }, [initialData]);

  const handleInputChange = (veldId: string, value: any) => {
    setFormValues(prev => ({ ...prev, [veldId]: value }));
    if (!isGewijzigdNaOpslaan) {
      setIsGewijzigdNaOpslaan(true);
    }
  };

  const handleCancelEdit = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('editId');
    router.push(`?${params.toString()}`);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSucces(false);
    setFout(null);

    startTransition(async () => {
      try {
        const editId = searchParams.get('editId');
        await onSubmit(formValues, editId);
        setSucces(true);
        
        if (!onthoudGegevens && !isEditing) {
          setFormValues({});
          setIsGewijzigdNaOpslaan(true);
        } else if (isEditing) {
          // Na succesvol editen, sluit de edit-modus en ververs
          handleCancelEdit();
        } else {
          setIsGewijzigdNaOpslaan(false);
        }
        
        setTimeout(() => setSucces(false), 4000);
      } catch (err) {
        setFout('Er is iets misgegaan bij het opslaan.');
      }
    });
  };

  const isKnopGeblokkeerd = isPending || !isGewijzigdNaOpslaan;

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg border border-slate-200 space-y-4 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-800 border-b pb-2 mb-4">
        {isEditing ? (
          <span>Record bewerken in: <span className="text-orange-600 capitalize">{tabelNaam}</span></span>
        ) : (
          <span>Nieuw record toevoegen aan: <span className="text-blue-600 capitalize">{tabelNaam}</span></span>
        )}
      </h2>

      {succes && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm font-medium">
          ✓ Succesvol opgeslagen!
        </div>
      )}

      {fout && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm font-medium">
          ✕ {fout}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map((field) => (
          <div key={field.id} className="flex flex-col space-y-1">
            <label htmlFor={field.veldId} className="text-sm font-medium text-slate-700">
              {field.veldLabel} {Boolean(field.verplicht) && <span className="text-red-500">*</span>}
            </label>
            <input
              type={field.veldType === 'number' ? 'number' : 'text'}
              id={field.veldId}
              name={field.veldId}
              value={formValues[field.veldId] ?? ''}
              onChange={(e) => handleInputChange(field.veldId, e.target.value)}
              required={Boolean(field.verplicht)}
              disabled={isPending}
              className="px-3 py-2 border border-slate-300 rounded-md shadow-sm text-sm"
            />
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 border-t gap-4">
        {!isEditing ? (
          <label className="inline-flex items-center space-x-2 text-sm text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={onthoudGegevens}
              onChange={(e) => setOnthoudGegevens(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 h-4 w-4"
            />
            <span>Gegevens onthouden</span>
          </label>
        ) : (
          <button
            type="button"
            onClick={handleCancelEdit}
            className="text-sm text-slate-500 hover:text-slate-700 underline"
          >
            Annuleren / Nieuw record invoeren
          </button>
        )}

        <button
          type="submit"
          disabled={isKnopGeblokkeerd}
          className={`px-5 py-2 text-white text-sm font-medium rounded-md shadow-sm disabled:bg-slate-200 disabled:text-slate-400 ${
            isEditing ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isPending ? 'Bezig...' : isEditing ? 'Wijzigingen opslaan' : 'Opslaan'}
        </button>
      </div>
    </form>
  );
}