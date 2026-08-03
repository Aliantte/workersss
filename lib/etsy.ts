// Etsy Open API v3 — findAllListingsActive is a public, read-only endpoint
// that only needs an API key (no OAuth user flow), so this is genuinely free
// to use once you've registered an app at developer.etsy.com. Gracefully
// returns null if the keys aren't configured or the call fails, so research
// still works (just without real-market grounding) if this isn't set up yet.

export type EtsyGrounding = {
  titles: string[];
  totalCount: number;
};

export async function searchEtsyListings(keywords: string, limit = 10): Promise<EtsyGrounding | null> {
  const keystring = process.env.ETSY_KEYSTRING;
  const sharedSecret = process.env.ETSY_SHARED_SECRET;
  if (!keystring || !sharedSecret) return null;

  const params = new URLSearchParams({
    keywords,
    limit: String(limit),
    sort_on: "score",
    sort_order: "desc",
  });

  try {
    const res = await fetch(`https://openapi.etsy.com/v3/application/listings/active?${params}`, {
      headers: { "x-api-key": `${keystring}:${sharedSecret}` },
    });
    if (!res.ok) return null;

    const data = await res.json();
    const titles: string[] = (data.results || [])
      .map((r: { title?: string }) => r.title)
      .filter(Boolean);

    if (titles.length === 0) return null;

    return { titles, totalCount: data.count ?? titles.length };
  } catch {
    return null;
  }
}
