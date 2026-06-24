// src/app/modules/basistabellen/page.tsx
import { db } from '@/db';
import { beheerMetadata } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import GenericForm, { MetadataField } from '@/components/GenericForm';
import RecordLijst from '@/components/RecordLijst';
import { sql } from 'drizzle-orm';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ tabel?: string; editId?: string }>;
}

export default async function BasistabellenPage({ searchParams }: Props) {
  const { tabel, editId } = await searchParams;
  const doelTabel = tabel || 'gebouwen';

  // 1. Haal alle unieke tabellen op
  const uniekeTabellenResult = await db
    .select({ tabelNaam: beheerMetadata.tabelNaam, tabelLabel: beheerMetadata.tabelLabel })
    .from(beheerMetadata)
    .groupBy(beheerMetadata.tabelNaam);

  // 2. Haal de formulier-velden op
  const formDefinition = await db
    .select()
    .from(beheerMetadata)
    .where(eq(beheerMetadata.tabelNaam, doelTabel))
    .orderBy(asc(beheerMetadata.volgnummer));

  const lijstKolommen = formDefinition
    .filter(f => f.toonInLijst)
    .map(f => ({ veldId: f.veldId, veldLabel: f.veldLabel }));

  // 3. Dynamisch alle bestaande records ophalen uit de doeltabel via db.run()
  let bestaandeRecords: Record<string, any>[] = [];
  let actueelEditRecord: Record<string, any> | null = null;

  try {
    // We selecteren ALLE kolommen van de tabel voor het geval we er een moeten editen
    const queryResult = await db.run(sql.raw(`SELECT * FROM "${doelTabel}"`));
    bestaandeRecords = JSON.parse(JSON.stringify(queryResult.rows));

    // Als we aan het editen zijn, zoek het specifieke record uit de array
    if (editId) {
      actueelEditRecord = bestaandeRecords.find(r => r.id === editId) || null;
    }
  } catch (e) {
    console.error("Kon records niet ophalen:", e);
  }

  // 4. Server Action om data op te slaan (werkt nu voor INSERT én UPDATE)
  async function handleInsertOrUpdateRecord(formData: Record<string, any>, activeEditId?: string | null) {
    'use server';

    // Zoek dit gedeelte op in src/app/modules/basistabellen/page.tsx

    if (activeEditId) {
      // UPDATE MECHANISME

      // 1. Zorg dat we 'id' NIET proberen te updaten in de SET clause
      const updateData = { ...formData };
      delete updateData.id;

      // 2. Bouw de SET string: "straat" = ?, "nummer" = ?
      const setStatements = Object.keys(updateData).map(key => `"${key}" = ?`).join(', ');

      // 3. Voeg de parameters samen: EERST de formulierwaarden, ALS LAATSTE het id voor de WHERE clause
      const values = [...Object.values(updateData), activeEditId];

      try {
        // We praten hier rechtstreeks tegen de onderliggende Turso/SQLite-driver via db.$client.execute.
        // Dit accepteert exact 1 object-argument, waardoor TypeScript 100% tevreden is.
        await db.$client.execute({
          sql: `
      UPDATE "${doelTabel}" 
      SET ${setStatements}
      WHERE "id" = ?
    `,
          args: values
        });

        revalidatePath('/modules/basistabellen');
      } catch (error) {
        console.error('Fout bij updaten:', error);
        throw new Error('Kon het record niet updaten.');
      }
    } else {
      // INSERT MECHANISME (Oude vertrouwde code)
      const newId = crypto.randomUUID();
      const columns = ['id', ...Object.keys(formData)];
      const values = [newId, ...Object.values(formData)];
      const columnNamesStr = columns.map(c => `"${c}"`).join(', ');

      try {
        await db.run(sql`
          INSERT INTO ${sql.raw(`"${doelTabel}"`)} (${sql.raw(columnNamesStr)}) 
          VALUES (${sql.join(values, sql`, `)})
        `);
        revalidatePath('/modules/basistabellen');
      } catch (error) {
        console.error('Fout bij opslaan:', error);
        throw new Error('Kon het record niet opslaan.');
      }
    }
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 px-4">
      {/* Tab-navigatie */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-px">
        {uniekeTabellenResult.map((t) => {
          const isSelected = t.tabelNaam === doelTabel;
          return (
            <Link
              key={t.tabelNaam}
              href={`/modules/basistabellen?tabel=${t.tabelNaam}`}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px border ${isSelected ? 'bg-white border-slate-200 border-b-white text-blue-600' : 'bg-slate-50 border-transparent text-slate-500 hover:text-slate-700'
                }`}
            >
              {t.tabelLabel}
            </Link>
          );
        })}
      </div>

      {formDefinition.length === 0 ? (
        <div className="p-6 bg-yellow-50 text-yellow-700 rounded-md border text-sm">
          Geen metadata gevonden voor tabel {doelTabel}.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">

          {/* Kolom 1: Het Formulier (luistert nu naar editId via key en initialData) */}
          <div>
            <GenericForm
              key={`${doelTabel}-${editId || 'new'}`} // Forceert her-render bij switch tussen nieuw/edit
              tabelNaam={doelTabel}
              fields={formDefinition as MetadataField[]}
              onSubmit={handleInsertOrUpdateRecord}
              initialData={actueelEditRecord}
            />
          </div>

          {/* Kolom 2: De Live Recordlijst */}
          <div>
            {lijstKolommen.length > 0 ? (
              <RecordLijst
                key={`${doelTabel}-lijst`}
                tabelNaam={doelTabel}
                kolommen={lijstKolommen}
                records={bestaandeRecords}
              />
            ) : (
              <div className="p-6 bg-slate-50 text-slate-500 border rounded-lg text-sm italic">
                Er zijn geen kolommen gemarkeerd voor de overzichtslijst van deze tabel (toon_in_lijst).
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}