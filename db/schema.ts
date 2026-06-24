// src/db/schema.ts
import { sql } from "drizzle-orm";
import { text, sqliteTable, real, integer, sqliteView } from "drizzle-orm/sqlite-core";

// ==========================================
// 1. MOEDERTABELLEN (Stamgegevens)
// ==========================================

export const personen = sqliteTable("personen", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  voornamen: text("voornamen").notNull(),
  tussenvoegsel: text("tussenvoegsel"),
  achternaam: text("achternaam").notNull(),
  geboortedatum: text("geboortedatum"), 
  datumOverlijden: text("datum_overlijden"),
  telefoonnummer: text('telefoonnummer'),
});

export const gebouwen = sqliteTable("gebouwen", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  straat: text("straat").notNull(),
  nummer: text("nummer").notNull(),
  plaats: text("plaats").notNull(),
  korteAanduiding: text("korte_aanduiding"),
  postcode: text("postcode"),
  xCoordinaat: real("x_coordinaat"), 
  yCoordinaat: real("y_coordinaat"),
});

export const eenheden = sqliteTable("eenheden", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  naam: text("naam").notNull(),
  symbool: text("symbool"),
});

// NIEUW: Vervanger van de hardcoded Enum voor maximale flexibiliteit
export const parametertypen = sqliteTable("parametertypen", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  code: text("code").notNull().unique(), // bijv. "numeriek", "tekst", "keuzelijst"
  omschrijving: text("omschrijving").notNull(),
});

// ==========================================
// 2. DYNAMISCHE KEUZELIJSTEN
// ==========================================

export const keuzelijsten = sqliteTable("keuzelijsten", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  naam: text("naam").notNull(),
  toelichting: text("toelichting"),
});

export const keuzelijstOpties = sqliteTable("keuzelijst_opties", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  keuzelijstId: text("keuzelijst_id").notNull().references(() => keuzelijsten.id, { onDelete: "restrict" }),
  waarde: text("waarde").notNull(),
  volgnr: integer("volgnr").notNull().default(1),
});

// ==========================================
// 3. PARAMETERS
// ==========================================

export const parameters = sqliteTable("parameters", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  naam: text("naam").notNull(),
  toelichting: text("toelichting"),
  parametertypeId: text("parametertype_id").notNull().references(() => parametertypen.id),
  eenheidId: text("eenheid_id").references(() => eenheden.id),
  keuzelijstId: text("keuzelijst_id").references(() => keuzelijsten.id),
});

// ==========================================
// 4. FORMULIER ENGINE & GROEPEN
// ==========================================

export const parameterSets = sqliteTable("parameter_sets", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  naam: text("naam").notNull(),
  toelichting: text("toelichting"),
});

export const setRegels = sqliteTable("set_regels", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  setId: text("set_id").notNull().references(() => parameterSets.id, { onDelete: "cascade" }),
  parameterId: text("parameter_id").notNull().references(() => parameters.id, { onDelete: "cascade" }),
  label: text("label"), 
  verplicht: integer("verplicht", { mode: "boolean" }).notNull().default(false),
  placeholder: text("placeholder"), // Toegevoegd n.a.v. suggestie formulier-engine
  volgnr: integer("volgnr").notNull().default(1),
});

export const groepen = sqliteTable("groepen", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  naam: text("naam").notNull(),
  toelichting: text("toelichting"),
  standaardSetId: text("standaard_set_id").references(() => parameterSets.id),
});

export const groepObjecten = sqliteTable("groep_objecten", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  groepId: text("groep_id").notNull().references(() => groepen.id, { onDelete: "cascade" }),
  objectId: text("object_id").notNull(),
  objectType: text("object_type").notNull(), // Snelheid/naslag: tabelnaam (bijv. 'gebouwen')
});

// ==========================================
// 5. INVOER TABELLEN (De Universele Waarneming)
// ==========================================

export const metingen = sqliteTable("metingen", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessieId: text("sessie_id").notNull(), 
  objectId: text("object_id").notNull(), // UUID is leidend bij offline synchronisatie
  objectType: text("object_type"),      // Optionele tabelnaam voor snelle indexering
  parameterId: text("parameter_id").notNull().references(() => parameters.id),
  waarde: text("waarde").notNull(),       // Slikt alle invoer als string, casten gebeurt bij analyse
  datumTijd: text("datum_tijd").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export const logboek = sqliteTable("logboek", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  categorie: text("categorie").notNull(),
  titel: text("titel").notNull(),
  inhoud: text("inhoud").notNull(),
  interpretatie: text("interpretatie"),
});

// ==========================================
// 6. BEHEER & UI METADATA (De Generieke Formuliersturing)
// ==========================================

export const beheerMetadata = sqliteTable("beheer_metadata", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tabelNaam: text("tabel_naam").notNull(),
  tabelLabel: text("tabel_label").notNull(),
  veldId: text("veld_id").notNull(),
  veldLabel: text("veld_label").notNull(),
  veldType: text("veld_type").notNull(), // Rendert als input, select, textarea, etc.
  volgnummer: integer("volgnummer").notNull(),
  verplicht: integer('verplicht', { mode: 'boolean' }).default(false),
  toelichting: text("toelichting"),
  lookupTabel: text("lookup_tabel"), 
});

// ==========================================
// 7. SQL VIEWS
// ==========================================

// export const vBeschikbareObjecten = sqliteView("v_beschikbare_objecten", {
//   objectId: text("object_id").notNull(),
//   objectType: text("object_type").notNull(),
//   weergaveNaam: text("weergave_naam").notNull(),
//   extraInfo: text("extra_info"),
// }).existing();