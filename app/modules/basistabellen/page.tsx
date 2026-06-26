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

  // 3. Dynamisch alle bestaande records van de doeltabel ophalen
  let bestaandeRecords: Record<string, any>[] = [];
  let actueelEditRecord: Record<string, any> | null = null;

  try {
    const queryResult = await db.run(sql.raw(`SELECT * FROM "${doelTabel}"`));
    bestaandeRecords = JSON.parse(JSON.stringify(queryResult.rows));

    if (editId) {
      actueelEditRecord = bestaandeRecords.find(r => r.id === editId) || null;
    }
  } catch (e) {
    console.error("Kon records niet ophalen:", e);
  }

  // =========================================================================
  // UNIFORME LOOKUPS (Haalt nu zowel ID als Waarde op!)
  // =========================================================================
  // We veranderen het type tijdelijk naar any of breiden GenericForm zo meteen uit
  const dynamischeLookups: Record<string, { id: string; label: string }[]> = {};
  const selectVelden = formDefinition.filter(f => f.veldType?.toLowerCase() === 'select');

  for (const veld of selectVelden) {
    const keuzelijstId = veld.lookupTabel; // Bijv. 'eenheden' of 'parametertypen'

    if (keuzelijstId) {
      try {
        // We halen nu bewust de 'id' ÉN de 'waarde' op uit keuzelijst_opties
        const optiesResult = await db.$client.execute({
          sql: `
          SELECT id, waarde 
          FROM "keuzelijst_opties" 
          WHERE "keuzelijst_id" = ? 
          ORDER BY "volgnr" ASC
        `,
          args: [keuzelijstId]
        });

        dynamischeLookups[veld.veldId] = optiesResult.rows.map(row => ({
          id: String(row.id),
          label: String(row.waarde)
        }));
      } catch (err) {
        console.error(`Fout bij het laden van keuzelijst: ${keuzelijstId}`, err);
      }
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
      // GENERIEKE ID-BEHANDELING:
      // Als de gebruiker zelf een ID heeft ingevuld (bijv. bij keuzelijsten), 
      // gebruiken we die. Anders genereren we een UUID.
      const heeftEigenId = 'id' in formData && formData.id && String(formData.id).trim() !== '';
      const finalId = heeftEigenId ? String(formData.id).trim() : crypto.randomUUID();

      // Filter de eventuele id uit formData om dubbelingen te voorkomen
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

// =========================================================================
  // VERRIJK RECORDS VOOR DE RECORDLIJST (Gecorrigeerd!)
  // =========================================================================
  const verrijkteRecords = bestaandeRecords.map(record => {
    const nieuwRecord = { ...record };
    
    selectVelden.forEach(veld => {
      const huidigeIdInRecord = record[veld.veldId];
      
      if (huidigeIdInRecord) {
        // Nu netjes aan elkaar geschreven en type-safe gecast
        const optiesVoorVeld = (dynamischeLookups[veld.veldId] || []) as { id: string; label: string }[];
        const gevondenOptie = optiesVoorVeld.find(o => o.id === String(huidigeIdInRecord));
        
        if (gevondenOptie) {
          nieuwRecord[veld.veldId] = gevondenOptie.label;
        }
      }
    });
    
    return nieuwRecord;
  });
  // =========================================================================

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

          {/* Kolom 1: Het Formulier */}
          <div>
            <GenericForm
              key={`${doelTabel}-${editId || 'new'}`}
              tabelNaam={doelTabel}
              fields={formDefinition as MetadataField[]}
              onSubmit={handleInsertOrUpdateRecord}
              initialData={actueelEditRecord}
              lookups={dynamischeLookups} // <-- Geef de vers geladen lookups mee!
            />
          </div>

          {/* Kolom 2: De Live Recordlijst */}
          <div>
            {lijstKolommen.length > 0 ? (
              <RecordLijst
                key={`${doelTabel}-lijst`}
                tabelNaam={doelTabel}
                kolommen={lijstKolommen}
                records={verrijkteRecords} // <-- Verander 'bestaandeRecords' naar 'verrijkteRecords'
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