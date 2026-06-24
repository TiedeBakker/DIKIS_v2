// src/components/GenericForm.tsx
'use client';

import React, { useState } from 'react';

export interface MetadataField {
  id: string;
  tabelNaam: string;
  veldId: string;
  veldLabel: string;
  veldType: string; // bijv. "text", "number", "textarea", "boolean", "select"
  verplicht: boolean | null;
  toelichting: string | null;
  lookupTabel: string | null;
}

interface GenericFormProps {
  tabelNaam: string;
  fields: MetadataField[];
  onSubmit: (formData: Record<string, any>) => void;
}

export default function GenericForm({ tabelNaam, fields, onSubmit }: GenericFormProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (veldId: string, value: any) => {
    setFormData((prev) => ({ ...prev, [veldId]: value }));
    // Wis eventuele foutmelding zodra er getypt wordt
    if (errors[veldId]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[veldId];
        return newErrors;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    // Eenvoudige validatie op basis van de metadata 'verplicht'
    fields.forEach((field) => {
      if (field.verplicht && !formData[field.veldId]) {
        newErrors[field.veldId] = `${field.veldLabel} is verplicht.`;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900 border-b pb-2 mb-4 capitalize">
        Nieuw record: {tabelNaam}
      </h2>
      
      {fields.map((field) => {
        const hasError = !!errors[field.veldId];

        return (
          <div key={field.veldId} className="flex flex-col gap-1.5">
            <label htmlFor={field.veldId} className="text-sm font-semibold text-slate-700 flex items-center gap-1">
              {field.veldLabel}
              {field.verplicht && <span className="text-red-500">*</span>}
            </label>

            {/* Renderen op basis van veldType uit de metadata */}
            {field.veldType === 'textarea' ? (
              <textarea
                id={field.veldId}
                rows={3}
                className={`w-full px-3 py-2 border rounded-md text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  hasError ? 'border-red-500 bg-red-50' : 'border-slate-300'
                }`}
                placeholder={field.toelichting || ''}
                value={formData[field.veldId] || ''}
                onChange={(e) => handleChange(field.veldId, e.target.value)}
              />
            ) : field.veldType === 'boolean' ? (
              <div className="flex items-center h-10">
                <input
                  id={field.veldId}
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  checked={!!formData[field.veldId]}
                  onChange={(e) => handleChange(field.veldId, e.target.checked)}
                />
                {field.toelichting && (
                  <span className="ml-2 text-xs text-slate-500">{field.toelichting}</span>
                )}
              </div>
            ) : (
              // Default: text, number, date, etc.
              <input
                id={field.veldId}
                type={field.veldType === 'number' ? 'number' : 'text'}
                className={`w-full h-10 px-3 border rounded-md text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  hasError ? 'border-red-500 bg-red-50' : 'border-slate-300'
                }`}
                placeholder={field.toelichting || ''}
                value={formData[field.veldId] || ''}
                onChange={(e) => handleChange(field.veldId, e.target.value)}
              />
            )}

            {hasError && <p className="text-xs font-medium text-red-600">{errors[field.veldId]}</p>}
          </div>
        );
      })}

      <div className="pt-4 flex justify-end">
        <button
          type="submit"
          className="px-4 h-10 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-md shadow transition-colors"
        >
          Opslaan
        </button>
      </div>
    </form>
  );
}