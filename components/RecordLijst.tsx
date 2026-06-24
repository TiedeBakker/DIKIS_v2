// src/components/RecordLijst.tsx
'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Kolom {
  veldId: string;
  veldLabel: string;
}

interface RecordLijstProps {
  tabelNaam: string;
  kolommen: Kolom[];
  records: Record<string, any>[];
}

export default function RecordLijst({ tabelNaam, kolommen, records }: RecordLijstProps) {
  const [zoekTerm, setZoekTerm] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  const gefilterdeRecords = records.filter((record) =>
    kolommen.some((kolom) => {
      const waarde = record[kolom.veldId];
      return waarde ? String(waarde).toLowerCase().includes(zoekTerm.toLowerCase()) : false;
    })
  );

  // Navigeer naar dezelfde pagina maar mét het editId in de URL
  const handleRowDoubleClick = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('editId', id);
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col h-full space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-2">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Aanwezige gegevens</h3>
          <p className="text-xs text-slate-400 italic">Dubbelklik op een rij om deze te bewerken</p>
        </div>
        
        <input
          type="text"
          placeholder={`Filter ${tabelNaam}...`}
          value={zoekTerm}
          onChange={(e) => setZoekTerm(e.target.value)}
          className="px-3 py-1.5 text-sm border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 max-w-xs w-full"
        />
      </div>

      {/* PUNT 1: Vaste maximale hoogte met verticale scroll */}
      <div className="overflow-x-auto border rounded-md max-h-[520px] overflow-y-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm table-fixed">
          <thead className="bg-slate-50 text-slate-700 font-medium sticky top-0 bg-white z-10 shadow-sm">
            <tr>
              {kolommen.map((k) => (
                <th key={k.veldId} className="px-4 py-2 text-left bg-slate-50">{k.veldLabel}</th>
              ))}
            </tr>
          </thead>
          
          <tbody className="divide-y divide-slate-200 text-slate-600">
            {gefilterdeRecords.length === 0 ? (
              <tr>
                <td colSpan={kolommen.length} className="px-4 py-8 text-center text-slate-400 italic">
                  Geen records gevonden.
                </td>
              </tr>
            ) : (
              gefilterdeRecords.map((record) => (
                <tr 
                  key={record.id} 
                  onDoubleClick={() => handleRowDoubleClick(record.id)} // PUNT 2: Dubbelklik trigger
                  className="hover:bg-blue-50 cursor-pointer transition-colors select-none"
                  title="Dubbelklik om te bewerken"
                >
                  {kolommen.map((k) => (
                    <td key={k.veldId} className="px-4 py-2 truncate">
                      {record[k.veldId] || <span className="text-slate-300">-</span>}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}