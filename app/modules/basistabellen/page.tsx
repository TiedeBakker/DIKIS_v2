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

  // 1. Haal alle unieke basistabellen op voor de tab-navigatie
  const uniekeTabellenResult = await db
    .select({ tabelNaam: beheerMetadata.tabelNaam, tabelLabel: beheerMetadata.tabelLabel })
    .from(beheerMetadata)
    .groupBy(beheerMetadata.tabelNaam);

  // 2. Haal de velddefinities op voor de huidige actieve tabel
  const formDefinition = await db
    .select()
    .from(beheerMetadata)
    .where(eq(beheerMetadata.tabelNaam, doelTabel))
    .orderBy(asc(beheerMetadata.volgnummer));

  const lijstKolommen = formDefinition
    .filter(f => f.toonInLijst)
    .map(f => ({ veldId: f.veldId, veldLabel: f.veldLabel }));

  // 3. Dynamisch alle bestaande records van de doeltabel ophalen (PURE DATABASE DATA)
  let bestaandeRecords: Record<string, any>[] = [];

  try {
    const queryResult = await db.run(sql.raw(`SELECT * FROM "${doelTabel}"`));
    bestaandeRecords = JSON.parse(JSON.stringify(queryResult.rows));
  } catch (e) {
    console.error("Kon records niet ophalen:", e);
  }

  const dynamischeLookups: Record<string, { id: string; label: string }[]> = {};
  const selectVelden = formDefinition.filter(f => f.veldType?.toLowerCase() === 'select');

  for (const veld of selectVelden) {
    const keuzelijstId = veld.lookupTabel;

    if (keuzelijstId) {
      try {
        // We halen nu puur de tekstWAARDE op. Die gebruiken we als ID én als Label!
        const optiesResult = await db.$client.execute({
          sql: `SELECT waarde FROM "keuzelijst_opties" WHERE "keuzelijst_id" = ? ORDER BY "volgnr" ASC`,
          args: [keuzelijstId]
        });

        dynamischeLookups[veld.veldId] = optiesResult.rows.map(row => ({
          id: String(row.waarde),    // Waarde is de ID (bijv. "C")
          label: String(row.waarde)  // Waarde is het Label (bijv. "C")
        }));
      } catch (err) {
        console.error(`Fout bij het laden van keuzelijst: ${keuzelijstId}`, err);
      }
    }
  }
  const verrijkteRecords = bestaandeRecords.map(record => {
    const nieuwRecord = { ...record };

    // Alleen nog de booleans netjes vertalen voor het oog
    formDefinition.forEach(veld => {
      if (veld.veldType?.toLowerCase() === 'boolean') {
        const waarde = record[veld.veldId];
        if (waarde === 1 || waarde === '1') nieuwRecord[veld.veldId] = 'Ja';
        if (waarde === 0 || waarde === '0') nieuwRecord[veld.veldId] = 'Nee';
      }
    });

    return nieuwRecord;
  });
  // =========================================================================
  // BEPAAL HET RECORDFORMAT VOOR HET FORMULIER (Met behoud van PURE UUID's!)
  // =========================================================================
  let actueelEditRecord: Record<string, any> | null = null;
  if (editId) {
    const puurRecord = bestaandeRecords.find(r => r.id === editId);
    if (puurRecord) {
      // Maak een diepe kopie zodat mutaties in de form-state de lijst niet infecteren
      actueelEditRecord = JSON.parse(JSON.stringify(puurRecord));
    }
  }
  // =========================================================================

  // 4. Server Action om data op te slaan (INSERT óf UPDATE via de rauwe client)
  async function handleInsertOrUpdateRecord(formData: Record<string, any>, activeEditId?: string | null) {
    'use server';

    if (activeEditId) {
      const updateData = { ...formData };
      delete updateData.id;

      const setStatements = Object.keys(updateData).map(key => `"${key}" = ?`).join(', ');
      const values = [...Object.values(updateData), activeEditId];

      try {
        await db.$client.execute({
          sql: `UPDATE "${doelTabel}" SET ${setStatements} WHERE "id" = ?`,
          args: values
        });
        revalidatePath('/modules/basistabellen');
      } catch (error) {
        console.error('Fout bij updaten:', error);
        throw new Error('Kon het record niet updaten.');
      }
    } else {
      // GENERIEKE ID-BEHANDELING
      const heeftEigenId = 'id' in formData && formData.id && String(formData.id).trim() !== '';
      const finalId = heeftEigenId ? String(formData.id).trim() : crypto.randomUUID();

      const geschoondeData = { ...formData };
      delete geschoondeData.id;

      const columns = ['id', ...Object.keys(geschoondeData)];
      const values = [finalId, ...Object.values(geschoondeData)];
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
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px border ${isSelected
                ? 'bg-white border-slate-200 border-b-white text-blue-600'
                : 'bg-slate-50 border-transparent text-slate-500 hover:text-slate-700'
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

          {/* Kolom 1: Het Formulier (Krijgt de pure UUID's via actueelEditRecord) */}
          <div>
            <GenericForm
              key={`${doelTabel}-${editId || 'new'}`}
              tabelNaam={doelTabel}
              fields={formDefinition as MetadataField[]}
              onSubmit={handleInsertOrUpdateRecord}
              initialData={actueelEditRecord}
              lookups={dynamischeLookups}
            />
          </div>

          {/* Kolom 2: De Live Recordlijst (Krijgt de menselijk leesbare verrijkteRecords) */}
          <div className="xl:sticky xl:top-6 max-h-[calc(90vh-120px)] overflow-y-auto rounded-lg border border-slate-200 bg-white">
            {lijstKolommen.length > 0 ? (
              <RecordLijst
                key={`${doelTabel}-lijst`}
                tabelNaam={doelTabel}
                kolommen={lijstKolommen}
                records={verrijkteRecords}
              />
            ) : (
              <div className="p-6 text-slate-500 text-sm italic">
                Er zijn geen kolommen gemarkeerd voor de overzichtslijst van deze tabel (toon_in_lijst).
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}