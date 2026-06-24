// import { drizzle } from 'drizzle-orm/libsql';
// import { createClient } from '@libsql/client';
// import * as schema from './schema';

// // Tijdens de Vercel build-fase zijn deze variabelen soms niet direct beschikbaar op module-niveau.
// // Een fallback naar een lege string voorkomt de URL_INVALID crash tijdens het bouwen.
// const databaseUrl = process.env.TURSO_DATABASE_URL || "libsql://dummy-url-for-build.turso.io";
// const authToken = process.env.TURSO_AUTH_TOKEN || "dummy-token";

// const client = createClient({
//   url: databaseUrl,
//   authToken: authToken,
// });

// export const db = drizzle(client, { schema });



// import { drizzle } from "drizzle-orm/libsql";
// import { createClient } from "@libsql/client";
// import * as schema from "./schema";

// const client = createClient({
//   url: process.env.TURSO_CONNECTION_URL!,
//   authToken: process.env.TURSO_AUTH_TOKEN,
// });

// export const db = drizzle(client, { schema });
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const client = createClient({
  url: process.env.TURSO_CONNECTION_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
  
  // Nu mét de juiste TypeScript-types om de compiler blij te maken
  fetch: (input: RequestInfo | URL, init?: RequestInit) => {
    return fetch(input, {
      ...init,
      cache: "no-store",
    });
  },
});

export const db = drizzle(client, { schema });