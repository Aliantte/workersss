# Worker Bots

Two automated workers running on a schedule, feeding a live "conveyor belt" dashboard:

- **Research Desk** — calls Claude to generate new Etsy niche ideas, twice a day.
- **Studio** — calls the free Pollinations.ai image API to generate a storm landscape
  in the morning and an anime portrait/action shot at night.

Both are triggered by Vercel Cron Jobs (see `vercel.json`) and write to a shared Redis
feed that the dashboard polls every 30 seconds.

## Schedule (tuned for Vercel Pro)

This is set up for the **Pro** plan, which removes the once-per-day cap Hobby has and
gives per-minute precision:

- **Research Desk** — every 4 hours (`0 0,4,8,12,16,20 * * *`), 8 ideas per run,
  48 ideas/day. Each run is handed a different category lens (home decor, jewelry,
  digital downloads, pet products, wedding, seasonal, stationery, craft supplies),
  rotating by hour, so the ideas don't converge on the same handful of niches.
- **Studio** — an image roughly every 3 hours: storms at 02/08/14/20 UTC, anime
  portraits/action at 05/11/17/23 UTC. Both use combinatorial prompt building
  (subject × weather/action × mood, picked independently) instead of a fixed list,
  so at this frequency you won't see the same prompt twice for a long time.

If you're actually on Hobby, note the once-per-day-per-job cap: split each of these
into separate single-time cron entries instead (still allowed, just define more jobs)
or drop the frequency. Want it even busier than this? Cron entries are cheap — add
more time slots to `vercel.json`, keeping an eye on your Anthropic API spend and
Pollinations' anonymous rate limit (register for a free token if you push past
roughly 1 image request per 15 seconds).

## Setup

1. **Install dependencies**
   ```
   npm install
   ```

2. **Get an Anthropic API key** at [console.anthropic.com](https://console.anthropic.com/)
   for the Research Desk worker.

3. **Get a free Redis DB** — easiest path is adding the Upstash integration from your
   Vercel project's Storage tab after your first deploy (it injects the env vars for
   you automatically). For local dev, create one free at
   [console.upstash.com](https://console.upstash.com/) and copy the REST URL + token.

4. **Copy `.env.example` to `.env.local`** and fill in the values.

5. **Run locally**
   ```
   npm run dev
   ```
   Visit `http://localhost:3000`. It'll show an empty belt until a worker runs — trigger
   one manually:
   ```
   curl http://localhost:3000/api/cron/etsy-ideas
   curl "http://localhost:3000/api/cron/generate-image?theme=storm"
   ```

## Deploying to your domain

1. Push this to a GitHub repo, import it into Vercel, and add your domain in the
   project's Domains settings.
2. Add the `ANTHROPIC_API_KEY` env var in the Vercel project settings.
3. Add the Upstash Redis integration (Storage tab → Browse Marketplace → Upstash) —
   it wires up `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` for you.
4. Deploy. Vercel reads `vercel.json` and registers the four cron jobs automatically —
   you'll see them listed under the project's Cron Jobs tab, along with a manual
   "Run now" button for testing without waiting for the schedule.

## Extending it

- **More/faster image drops**: add more entries to `vercel.json`, or upgrade to Pro
  for per-minute cron precision.
- **Real image permanence**: Pollinations URLs are hotlinked, not stored — for a
  project you care about long-term, download the bytes in `generate-image/route.ts`
  and upload to Vercel Blob storage instead, then store that URL.
- **Smarter research**: give the Research Desk worker web search access (Anthropic's
  web search tool, or your own scraping) so ideas are grounded in real current trends
  instead of the model's own knowledge.
- **More stations**: the pattern is: a cron route that does work, pushes a `FeedItem`
  via `pushFeedItem()`, and a new card style in `FeedConveyor.tsx`.
