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
      // Added after the table already existed in production — ALTER with
      // IF NOT EXISTS so this stays safe to re-run on a fresh install too.
      await sql`ALTER TABLE ideas ADD COLUMN IF NOT EXISTS suggested_price NUMERIC`;
      await sql`ALTER TABLE ideas ADD COLUMN IF NOT EXISTS price_range TEXT`;
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

      // --- Social content factory — separate tables, same database, so it's
      // fully distinct from the Etsy shop's data (no shared status pipeline,
      // no shared category system) while costing nothing extra to host.
      await sql`CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        batch_id TEXT NOT NULL,
        niche TEXT NOT NULL,
        hook TEXT NOT NULL,
        style TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'new',
        reject_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
      // For niches sourced from a real external post (Twitch clips, etc) —
      // lets Designer skip AI generation and Copywriter credit accurately.
      await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS source_url TEXT`;
      await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS thumbnail_url TEXT`;
      await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS source_credit TEXT`;
      await sql`CREATE TABLE IF NOT EXISTS post_assets (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        platform TEXT NOT NULL,
        url TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (post_id, platform)
      )`;
      await sql`CREATE TABLE IF NOT EXISTS post_copy (
        post_id INTEGER PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
        caption TEXT NOT NULL,
        hashtags TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
      await sql`CREATE INDEX IF NOT EXISTS posts_status_idx ON posts (status)`;

      // --- Team meeting — a recurring roundtable across BOTH business lines ---
      await sql`CREATE TABLE IF NOT EXISTS team_meetings (
        id SERIAL PRIMARY KEY,
        discussion TEXT NOT NULL,
        suggestions TEXT NOT NULL,
        adjustments TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
      await sql`ALTER TABLE team_meetings ADD COLUMN IF NOT EXISTS adjustments TEXT`;

      // --- Self-tuning settings — the crew's adjustable knobs, plus a log of
      // what changed and why. Boardroom is the only thing that writes here,
      // and only within hard-coded bounds — see lib/settings.ts.
      await sql`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        reason TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;

      // Per-run outcome counts, used to measure real failure rates rather
      // than guessing from summary text.
      await sql`CREATE TABLE IF NOT EXISTS run_metrics (
        id SERIAL PRIMARY KEY,
        employee TEXT NOT NULL,
        rendered INTEGER NOT NULL DEFAULT 0,
        failed INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;

      // --- Product mockups — composited from real reference photos, not AI-generated ---
      await sql`CREATE TABLE IF NOT EXISTS mockups (
        id SERIAL PRIMARY KEY,
        idea_id INTEGER NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
        template_name TEXT NOT NULL,
        url TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (idea_id, template_name)
      )`;
    })();
  }
  return schemaReady;
}
