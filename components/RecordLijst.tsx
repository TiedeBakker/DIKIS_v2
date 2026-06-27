// src/components/RecordLijst.tsx
'use client';

import { useState, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // State voor Sorteren en Filteren
  const [filterQuery, setFilterQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Afhandeling van de klik op een kolomkop
  const handleSort = (veldId: string) => {
    if (sortKey === veldId) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(veldId);
      setSortDirection('asc');
    }
  };

  // 1. Filter de records eerst op basis van de zoekopdracht
  const gefilterdeRecords = useMemo(() => {
    if (!filterQuery.trim()) return records;

    const query = filterQuery.toLowerCase().trim();
    return records.filter((record) => {
      return kolommen.some((kolom) => {
        const waarde = record[kolom.veldId];
        if (waarde === null || waarde === undefined) return false;
        return String(waarde).toLowerCase().includes(query);
      });
    });
  }, [records, filterQuery, kolommen]);

  // 2. Sorteer vervolgens de gefilterde records in het geheugen
  const gesorteerdeRecords = useMemo(() => {
    if (!sortKey) return gefilterdeRecords;

    return [...gefilterdeRecords].sort((a, b) => {
      const valA = a[sortKey] === null || a[sortKey] === undefined ? '' : String(a[sortKey]).toLowerCase();
      const valB = b[sortKey] === null || b[sortKey] === undefined ? '' : String(b[sortKey]).toLowerCase();

      // Numerieke sortering check
      const numA = Number(valA);
      const numB = Number(valB);
      if (!isNaN(numA) && !isNaN(numB) && valA !== '' && valB !== '') {
        return sortDirection === 'asc' ? numA - numB : numB - numA;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [gefilterdeRecords, sortKey, sortDirection]);

  // Activeer edit-modus via dubbelklik
  const handleRowDoubleClick = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('editId', id);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
      {/* Header met titel en record-counter */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
        <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">
          Overzicht: {tabelNaam}
        </h3>
        <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-full font-medium">
          {gesorteerdeRecords.length} van {records.length} records
        </span>
      </div>

      {/* IN GEËRE HERSTELD: De Filterbalk */}
      <div className="p-3 bg-white border-b border-slate-100">
        <input
          type="text"
          placeholder={`Doorzoek ${tabelNaam}...`}
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-400"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600 border-collapse">
          <thead className="bg-slate-100 text-xs text-slate-700 font-medium uppercase tracking-wider border-b border-slate-200">
            <tr>
              {kolommen.map((kolom) => {
                const isActief = sortKey === kolom.veldId;
                return (
                  <th
                    key={kolom.veldId}
                    onClick={() => handleSort(kolom.veldId)}
                    className="px-4 py-3 cursor-pointer hover:bg-slate-200 transition-colors select-none group"
                  >
                    <div className="flex items-center gap-1.5">
                      {kolom.veldLabel}
                      <span className={`text-slate-400 group-hover:text-slate-600 transition-opacity ${isActief ? 'opacity-100 text-blue-600' : 'opacity-40'}`}>
                        {isActief ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-150">
            {gesorteerdeRecords.length === 0 ? (
              <tr>
                <td colSpan={kolommen.length} className="px-4 py-8 text-center text-slate-400 italic">
                  Geen gegevens gevonden.
                </td>
              </tr>
            ) : (
              gesorteerdeRecords.map((record) => (
                <tr
                  key={record.id}
                  onDoubleClick={() => handleRowDoubleClick(record.id)}
                  title="Dubbelklik om te bewerken"
                  className="hover:bg-slate-50 cursor-pointer transition-colors select-none"
                >
                  {kolommen.map((kolom) => (
                    <td key={kolom.veldId} className="px-4 py-3 max-w-xs truncate font-medium text-slate-700">
                      {record[kolom.veldId] === true ? 'Ja' :
                        record[kolom.veldId] === false ? 'Nee' :
                          String(record[kolom.veldId] ?? '')}
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