# The Trap — Night Shift Etsy Pipeline

A five-stage automated pipeline for an Etsy digital-products shop, with a review queue where
you make the final call. Visualized as a neon "lair" — five rooms, each with its own worker,
wandering sprites, a supervisor doing rounds, and a live activity ticker.

## The crew

| Room | Who | Job |
|---|---|---|
| Research Lab | **Aliantte** | Every 4h, generates 6 digital-product ideas (wall art, mug/tumbler wraps, phone wallpapers, digital planners, sticker sheets — rotates by hour) |
| Studio | **Pin Laden** | Runs a quick "sync meeting" on the new batch (flags anything infeasible), then renders a design for everything that survives it |
| Editor | **Ally Al** | Writes Etsy-style title/tags/description for each rendered design |
| Packaging Bay | **Boxley** | Verifies design + copy both exist, bundles the idea and sends it to review |
| Boardroom | **Big Al** (you) | Approve or reject each packaged idea at `/review` — approved items land in `/library`, rejected ones are archived with a reason, nothing is deleted |
| — | **Alvin** | Roams all five rooms, logs a deterministic end-of-cycle summary (no LLM call — it's just counts) that feeds the ticker |

## Pipeline flow (one cycle, every 2 hours, 7am-9pm EDT)

```
:00  Aliantte generates a new batch of ideas          → status: new
:15  Pin Laden runs the sync meeting, then renders     → status: image-ready
     designs for whatever wasn't flagged
:35  Ally Al writes listing copy                       → status: ready-to-package
:50  Boxley bundles and sends to review                → status: pending-review
:55  Alvin logs the cycle summary
 —   You approve/reject at /review                     → status: approved / archived
```

That's 8 cycles/day (7, 9, 11, 13, 15, 17, 19, 21 EDT), roughly $3-4/month in Anthropic spend at current pricing. Cron times in `vercel.json` are fixed UTC — they'll drift by an hour relative to EDT/EST when daylight saving changes, since Vercel doesn't auto-adjust for that.

Each stage is its own Vercel Cron job (see `vercel.json`), staggered so there's real work
waiting when the next one runs.

## Mockups — deferred

The Packaging Bay doesn't generate product mockups (design-on-a-mug, art-on-a-wall) yet —
that was intentionally deferred. Approved items today have a raw design + listing copy, no
mockup images. The Packager route is where that logic would slot in later.

## Setup

1. **Install dependencies**
   ```
   npm install
   ```

2. **Get an Anthropic API key** at [console.anthropic.com](https://console.anthropic.com/).

3. **Get a Postgres database.** Easiest path: after your first Vercel deploy, go to your
   project's Storage tab → add a **Postgres (Neon)** integration. It injects `DATABASE_URL`
   automatically. Tables are created automatically on first request — no manual migration.

4. **Get Blob storage.** Same Storage tab → add a **Blob** store. Injects
   `BLOB_READ_WRITE_TOKEN` automatically.

5. **Copy `.env.example` to `.env.local`** and fill in what you have for local dev.

6. **Run locally**
   ```
   npm run dev
   ```
   Trigger a full cycle manually to test:
   ```
   curl http://localhost:3000/api/cron/research
   curl http://localhost:3000/api/cron/studio
   curl http://localhost:3000/api/cron/editor
   curl http://localhost:3000/api/cron/packager
   curl http://localhost:3000/api/cron/alvin
   ```
   Then check `/review` for packaged items.

## Deploying

1. Push to GitHub, import into Vercel, add your domain.
2. Add `ANTHROPIC_API_KEY` in Environment Variables.
3. Add the Postgres (Neon) and Blob integrations from the Storage tab.
4. Deploy. Vercel reads `vercel.json` and registers the five cron jobs automatically — visible
   under the project's Cron Jobs tab, with a manual "Run" option for testing.

## Data model

- **ideas** — id, batch_id, category, concept, keywords, trend_rationale, status, reject_reason, created_at
- **assets** — idea_id, type, url, created_at
- **listing_copy** — idea_id, title, tags, description, created_at
- **reports** — employee, summary, created_at (feeds the ticker)
- **meeting_notes** — batch_id, notes, created_at (the sync step's output)

`status` moves through: `new` → (`flagged-skip` or) `image-ready` → `ready-to-package` →
`pending-review` → `approved` or `archived`.
