// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// Zorg dat de omgevingsvariabelen uit .env.local goed worden ingelezen
dotenv.config({ path: '.env.local' });

export default defineConfig({
  schema: './db/schema.ts', // Het pad naar je zojuist gemaakte schema
  out: './drizzle',             // De map waar Drizzle eventuele migratiebestanden opslaat
  dialect: 'turso',             // GEWIJZIGD: In nieuwere versies gebruik je 'turso' i.p.v. 'libsql'
  dbCredentials: {              // GEWIJZIGD: url en authToken staan nu hier direct in
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
});