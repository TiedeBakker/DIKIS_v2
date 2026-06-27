// src/app/modules/beheer/actions.ts
'use server';

import { db } from '@/db';
import { parameterSets, setRegels, groepen, groepObjecten } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

// ==========================================
// ACTIONS FOR PARAMETER SETS
// ==========================================

export async function saveParameterSet(id: string | null, data: { naam: string; toelichting: string }) {
  if (id) {
    await db.update(parameterSets).set(data).where(eq(parameterSets.id, id));
  } else {
    await db.insert(parameterSets).values({ ...data, id: crypto.randomUUID() });
  }
  revalidatePath('/modules/beheer');
}

export async function saveSetRegels(setId: string, regels: { parameterId: string; verplicht: boolean; volgnr: number; label?: string; placeholder?: string }[]) {
  await db.delete(setRegels).where(eq(setRegels.setId, setId));
  
  if (regels.length > 0) {
    const values = regels.map(r => ({
      id: crypto.randomUUID(),
      setId,
      parameterId: r.parameterId,
      verplicht: r.verplicht,
      volgnr: r.volgnr, // <-- Aangepast naar volgnr conform schema
      label: r.label || null,
      placeholder: r.placeholder || null
    }));
    await db.insert(setRegels).values(values);
  }
  revalidatePath('/modules/beheer');
}

// ==========================================
// ACTIONS FOR GROEPEN
// ==========================================

export async function saveGroep(id: string | null, data: { naam: string; toelichting: string; standaardSetId?: string | null }) {
  const finalData = {
    naam: data.naam,
    toelichting: data.toelichting,
    standaardSetId: data.standaardSetId || null
  };

  if (id) {
    await db.update(groepen).set(finalData).where(eq(groepen.id, id));
  } else {
    await db.insert(groepen).values({ ...finalData, id: crypto.randomUUID() });
  }
  revalidatePath('/modules/beheer');
}

export async function saveGroepObjecten(groepId: string, objecten: { objectId: string; objectType: string }[]) {
  // Wis oude koppelingen en voeg nieuwe toe
  await db.delete(groepObjecten).where(eq(groepObjecten.groepId, groepId));
  
  if (objecten.length > 0) {
    const values = objecten.map(o => ({
      id: crypto.randomUUID(),
      groepId,
      objectId: o.objectId,
      objectType: o.objectType
    }));
    await db.insert(groepObjecten).values(values);
  }
  revalidatePath('/modules/beheer');
}

// Voeg dit toe onderaan je src/app/modules/beheer/actions.ts
export async function getSetRegels(setId: string) {
  // <-- Aangepast naar setRegels.volgnr conform schema
  return await db.select().from(setRegels).where(eq(setRegels.setId, setId)).orderBy(setRegels.volgnr); 
}

export async function getGroepObjecten(groepId: string) {
  return await db.select().from(groepObjecten).where(eq(groepObjecten.groepId, groepId));
}