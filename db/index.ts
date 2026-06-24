// src/db/index.ts
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

// We gebruiken hier TURSO_CONNECTION_URL zoals in je succesvolle prototype!
// De fallback voorkomt de crash tijdens 'next build' op Vercel
const databaseUrl = process.env.TURSO_CONNECTION_URL || "libsql://dummy-url-for-build.turso.io";
const authToken = process.env.TURSO_AUTH_TOKEN || "dummy-token";

const client = createClient({
  url: databaseUrl,
  authToken: authToken,
  
  // De gouden greep uit het prototype: dwing Next.js om de database NOOIT te cachen
  fetch: (input: RequestInfo | URL, init?: RequestInit) => {
    return fetch(input, {
      ...init,
      cache: "no-store",
    });
  },
});

export const db = drizzle(client, { schema });