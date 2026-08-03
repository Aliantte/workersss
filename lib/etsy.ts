// Etsy Open API v3 — findAllListingsActive is a public, read-only endpoint
// that only needs an API key (no OAuth user flow), so this is genuinely free
// to use once you've registered an app at developer.etsy.com. Gracefully
// returns null if the keys aren't configured or the call fails, so research
// still works (just without real-market grounding) if this isn't set up yet.

export type EtsyGrounding = {
  titles: string[];
  totalCount: number;
  avgPrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
};

type EtsyListing = {
  title?: string;
  price?: { amount?: number; divisor?: number; currency_code?: string };
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
    const results: EtsyListing[] = data.results || [];

    const titles: string[] = results.map((r) => r.title).filter(Boolean) as string[];
    if (titles.length === 0) return null;

    const prices: number[] = results
      .map((r) => {
        const amount = r.price?.amount;
        const divisor = r.price?.divisor;
        if (typeof amount !== "number" || typeof divisor !== "number" || divisor === 0) return null;
        return amount / divisor;
      })
      .filter((p): p is number => p !== null);

    const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : null;
    const minPrice = prices.length > 0 ? Math.min(...prices) : null;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : null;

    return { titles, totalCount: data.count ?? titles.length, avgPrice, minPrice, maxPrice };
  } catch {
    return null;
  }
}
