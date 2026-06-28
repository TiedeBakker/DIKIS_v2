// src/app/modules/metingen/actions.ts
'use server';

import { db } from '@/db';
import { metingen, setRegels } from '@/db/schema';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';


// 1. Haal de parameters van een set op, netjes op volgnummer
export async function getParametersVoorSet(setId: string) {
  return await db
    .select()
    .from(setRegels)
    .where(eq(setRegels.setId, setId))
    .orderBy(setRegels.volgnr);
}

// 2. NIEUW: Haal de ALLERLAATSTE meting op per parameter voor een specifiek object
export async function getLaatsteMetingenVoorObject(objectId: string, parameterIds: string[]) {
  if (parameterIds.length === 0) return {};

  // We halen de metingen op voor dit object en deze parameters
  const resultaten = await db
    .select()
    .from(metingen)
    .where(
      and(
        eq(metingen.objectId, objectId),
        inArray(metingen.parameterId, parameterIds)
      )
    )
    .orderBy(desc(metingen.datumTijd));

  // Omdat een object meerdere metingen in het verleden kan hebben, 
  // groeperen we ze in het geheugen en pakken we per parameter de nieuwste.
  const laatsteMetingenMap: Record<string, { waarde: string; datumTijd: string }> = {};
  
  // Doordat we gesorteerd hebben op desc(datumTijd), is de eerste die we tegenkomen per parameter de nieuwste
  for (const meting of resultaten) {
    if (!laatsteMetingenMap[meting.parameterId]) {
      laatsteMetingenMap[meting.parameterId] = {
        waarde: meting.waarde,
        datumTijd: meting.datumTijd
      };
    }
  }

  return laatsteMetingenMap;
}

// 3. NIEUW: Sla ad-hoc of set-metingen op voor één object op een gekozen tijdstip
export async function saveAdHocMetingen(
  objectId: string,
  objectType: string,
  gekozenTijdstip: string,
  metingenLijst: { parameterId: string; waarde: string }[]
) {
  // Filter lege waarden eruit
  const actieveInvoer = metingenLijst.filter(m => m.waarde.trim() !== '');
  if (actieveInvoer.length === 0) {
    return { success: false, message: 'Geen ingevulde waarden om op te slaan.' };
  }

  const sessieId = crypto.randomUUID();
  // Gebruik de handmatige datum/tijd, of val terug op NU als er niks is ingevuld
  const timestamp = gekozenTijdstip ? new Date(gekozenTijdstip).toISOString() : new Date().toISOString();

  const teInserteren = actieveInvoer.map(m => ({
    id: crypto.randomUUID(),
    sessieId,
    objectId,
    objectType,
    parameterId: m.parameterId,
    waarde: m.waarde,
    datumTijd: timestamp
  }));

  await db.insert(metingen).values(teInserteren);
  
  revalidatePath('/modules/metingen');
  return { 
    success: true, 
    message: `${teInserteren.length} meting(en) opgeslagen onder Sessie-ID: ${sessieId.substring(0,8)}...` 
  };
}
// Sla een complete batch aan metingen in één keer op (Transactie-veilig)
export async function saveBatchMetingen(
  metingenLijst: { 
    objectId: string; 
    objectType: string; 
    parameterId: string; 
    waarde: string; 
  }[]
) {
  if (metingenLijst.length === 0) return { success: false, message: 'Geen gegevens om op te slaan.' };

  const sessieId = crypto.randomUUID();
  const nu = new Date().toISOString(); // SQLite accepteert ISO strings voor timestamps uitstekend

  // Filter lege waarden eruit, we slaan alleen ingevulde data op
  const teInserteren = metingenLijst
    .filter(m => m.waarde.trim() !== '')
    .map(m => ({
      id: crypto.randomUUID(),
      sessieId,
      objectId: m.objectId,
      objectType: m.objectType,
      parameterId: m.parameterId,
      waarde: m.waarde,
      datumTijd: nu
    }));

  if (teInserteren.length === 0) {
    return { success: false, message: 'Alle ingevoerde velden waren leeg.' };
  }

  await db.insert(metingen).values(teInserteren);
  
  revalidatePath('/modules/metingen');
  return { success: true, message: `${teInserteren.length} metingen succesvol opgeslagen onder sessie ${sessieId.substring(0,8)}...` };
}
// Haal de complete historie op voor één object en een specifieke set aan parameters
export async function getHistorischeMatrixVoorObject(objectId: string, parameterIds: string[]) {
  if (parameterIds.length === 0) return [];

  // Haal alle metingen op die matchen met dit object en deze parameters
  const resultaten = await db
    .select()
    .from(metingen)
    .where(
      and(
        eq(metingen.objectId, objectId),
        inArray(metingen.parameterId, parameterIds)
      )
    )
    .orderBy(desc(metingen.datumTijd));

  // We groeperen de resultaten per unieke datumTijd / sessieId zodat we rijen krijgen
  const rijenMap: Record<string, { datumTijd: string; sessieId: string; waarden: Record<string, { id: string; waarde: string }> }> = {};

  for (const m of resultaten) {
    // We gebruiken datumTijd (of sessieId) als unieke sleutel voor een rij
    const sleutel = m.sessieId || m.datumTijd; 
    if (!rijenMap[sleutel]) {
      rijenMap[sleutel] = {
        datumTijd: m.datumTijd,
        sessieId: m.sessieId,
        waarden: {}
      };
    }
    // Sla de meting_id en de waarde op onder de parameter_id
    rijenMap[sleutel].waarden[m.parameterId] = {
      id: m.id,
      waarde: m.waarde
    };
  }

  // Converteer naar een array gesorteerd op nieuwste datum eerst
  return Object.values(rijenMap).sort((a, b) => new Date(b.datumTijd).getTime() - new Date(a.datumTijd).getTime());
}
// 1. Update een bestaande meetwaarde (dubbelklik op een ingevulde cel)
export async function updateMetingWaarde(metingId: string, nieuweWaarde: string) {
  try {
    await db
      .update(metingen)
      .set({ waarde: nieuweWaarde })
      .where(eq(metingen.id, metingId));

    return { success: true, message: 'Waarde succesvol gewijzigd!' };
  } catch (error) {
    console.error('Fout bij updaten meting:', error);
    return { success: false, message: 'Kon de waarde niet aanpassen in de database.' };
  }
}

// 2. Voeg een meting toe aan een bestaande sessie/rij (dubbelklik op een lege '-' cel)
export async function addMetingToBestaandeSessie(payload: {
  sessieId: string;
  objectId: string;
  objectType: string;
  datumTijd: string;
  parameterId: string;
  waarde: string;
}) {
  try {
    await db.insert(metingen).values({
      id: crypto.randomUUID(),
      sessieId: payload.sessieId,
      objectId: payload.objectId,
      objectType: payload.objectType,
      parameterId: payload.parameterId,
      waarde: payload.waarde,
      datumTijd: payload.datumTijd // Neemt de exacte historische tijd over
    });

    return { success: true, message: 'Waarde succesvol toegevoegd aan deze reeks!' };
  } catch (error) {
    console.error('Fout bij toevoegen aan sessie:', error);
    return { success: false, message: 'Kon de waarde niet toevoegen.' };
  }
}