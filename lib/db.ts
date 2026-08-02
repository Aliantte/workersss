import { neon } from "@neondatabase/serverless";

let _sql: ReturnType<typeof neon> | null = null;

// @vercel/postgres is deprecated; Vercel's Neon integration (Storage tab → Postgres)
// usually sets DATABASE_URL/POSTGRES_URL, but a custom variable prefix on the
// connection can result in nb_DATABASE_URL / nb_POSTGRES_URL instead — check all
// of them, lazily, so a missing env var doesn't crash the module at import time.
function getClient() {
  if (!_sql) {
    const connectionString =
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.nb_DATABASE_URL ||
      process.env.nb_POSTGRES_URL;
    if (!connectionString) {
      throw new Error(
        "Missing DATABASE_URL. Add a Postgres (Neon) integration in your Vercel project's Storage tab."
      );
    }
    _sql = neon(connectionString, {
      fullResults: true,
      // Next.js patches the global fetch() to cache responses by default in
      // Route Handlers. The Neon driver talks to its Data API over fetch()
      // internally, and `export const dynamic = "force-dynamic"` on a route
      // does NOT reliably stop Next from caching a third-party library's own
      // fetch calls — that needs to be told explicitly, per-request.
      fetchOptions: { cache: "no-store" },
    });
  }
  return _sql;
}

export function sql<T = any>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<{ rows: T[] }> {
  return getClient()(strings, ...values) as unknown as Promise<{ rows: T[] }>;
}

let schemaReady: Promise<void> | null = null;

/** Idempotent — safe to call at the top of every route, no manual migration step needed. */
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS ideas (
        id SERIAL PRIMARY KEY,
        batch_id TEXT NOT NULL,
        category TEXT NOT NULL,
        concept TEXT NOT NULL,
        keywords TEXT NOT NULL DEFAULT '',
        trend_rationale TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'new',
        reject_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS assets (
        id SERIAL PRIMARY KEY,
        idea_id INTEGER NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        url TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS listing_copy (
        idea_id INTEGER PRIMARY KEY REFERENCES ideas(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        tags TEXT NOT NULL,
        description TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        employee TEXT NOT NULL,
        summary TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS meeting_notes (
        id SERIAL PRIMARY KEY,
        batch_id TEXT NOT NULL,
        notes TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
      await sql`CREATE INDEX IF NOT EXISTS ideas_status_idx ON ideas (status)`;
      await sql`CREATE INDEX IF NOT EXISTS ideas_batch_idx ON ideas (batch_id)`;
    })();
  }
  return schemaReady;
}
