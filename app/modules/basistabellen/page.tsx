// src/app/modules/basistabellen/page.tsx
import { db } from '@/db';
import { beheerMetadata } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import GenericForm, { MetadataField } from '@/components/GenericForm';
import { sql } from 'drizzle-orm';
import Link from 'next/link';

interface Props {
  searchParams: Promise<{ tabel?: string }>;
}

export default async function BasistabellenPage({ searchParams }: Props) {
  // 1. Haal de geselecteerde tabel uit de URL (bijv. ?tabel=personen), standaard naar 'gebouwen'
  const { tabel } = await searchParams;
  const doelTabel = tabel || 'gebouwen';

  // 2. Haal ALLE unieke tabellen op die in beheer_metadata staan voor de menuknoppen
  const uniekeTabellenResult = await db
    .select({ 
      tabelNaam: beheerMetadata.tabelNaam, 
      tabelLabel: beheerMetadata.tabelLabel 
    })
    .from(beheerMetadata)
    .groupBy(beheerMetadata.tabelNaam);

  // 3. Haal de specifieke formulier-definitie op voor de gekozen tabel
  const formDefinition = await db
    .select()
    .from(beheerMetadata)
    .where(eq(beheerMetadata.tabelNaam, doelTabel))
    .orderBy(asc(beheerMetadata.volgnummer));

  // 4. De Server Action om de data op te slaan
  async function handleInsertRecord(formData: Record<string, any>) {
    'use server';
    
    const newId = crypto.randomUUID();
    const columns = ['id', ...Object.keys(formData)];
    const values = [newId, ...Object.values(formData)];
    const columnNamesStr = columns.map(c => `"${c}"`).join(', ');

    try {
      await db.run(sql`
        INSERT INTO ${sql.raw(`"${doelTabel}"`)} (${sql.raw(columnNamesStr)}) 
        VALUES (${sql.join(values, sql`, `)})
      `);
      console.log(`Succesvol record toegevoegd aan ${doelTabel}`);
    } catch (error) {
      console.error('Fout bij opslaan:', error);
      throw new Error('Kon het record nicht opslaan.');
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Dynamische Tab-navigatie op basis van de aanwezige metadata */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-px">
        {uniekeTabellenResult.map((t) => {
          const isSelected = t.tabelNaam === doelTabel;
          return (
            <Link
              key={t.tabelNaam}
              href={`/modules/basistabellen?tabel=${t.tabelNaam}`}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px border ${
                isSelected
                  ? 'bg-white border-slate-200 border-b-white text-blue-600'
                  : 'bg-slate-50 border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              {t.tabelLabel}
            </Link>
          );
        })}
      </div>

      {formDefinition.length === 0 ? (
        <div className="p-6 bg-yellow-50 text-yellow-700 rounded-md border border-yellow-200 text-sm">
          Geen metadata gevonden voor tabel <strong>{doelTabel}</strong>.
        </div>
      ) : (
        <GenericForm 
          key={doelTabel} // Reset de interne staat van het formulier bij wisselen van tabel
          tabelNaam={doelTabel} 
          fields={formDefinition as MetadataField[]} 
          onSubmit={handleInsertRecord} 
        />
      )}
    </div>
  );
}