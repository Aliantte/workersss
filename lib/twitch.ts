import { getSetting, setSetting } from "./settings";

export type TwitchClip = {
  title: string;
  broadcasterName: string;
  gameName: string;
  clipUrl: string;
  thumbnailUrl: string;
  viewCount: number;
};

async function getAppAccessToken(): Promise<string | null> {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  // Cached in the settings table (not env vars) since it's a short-lived
  // token that needs refreshing, not a stable credential.
  const cachedToken = await getSetting("twitch_access_token");
  const cachedExpiry = await getSetting("twitch_token_expires_at");
  if (cachedToken && cachedExpiry && Number(cachedExpiry) > Date.now() + 60_000) {
    return cachedToken;
  }

  try {
    const res = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
      { method: "POST" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const token: string = data.access_token;
    const expiresAt = Date.now() + (data.expires_in ?? 3600) * 1000;

    await setSetting("twitch_access_token", token, "auto-refreshed app access token");
    await setSetting("twitch_token_expires_at", String(expiresAt), "auto-refreshed app access token");

    return token;
  } catch {
    return null;
  }
}

async function twitchGet(path: string, token: string): Promise<any | null> {
  const clientId = process.env.TWITCH_CLIENT_ID!;
  try {
    const res = await fetch(`https://api.twitch.tv/helix${path}`, {
      headers: { Authorization: `Bearer ${token}`, "Client-Id": clientId },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/** Top trending clips across the currently most-popular games — real data, no AI involved. */
export async function getTrendingClips(limit = 5): Promise<TwitchClip[] | null> {
  const token = await getAppAccessToken();
  if (!token) return null;

  const gamesData = await twitchGet("/games/top?first=3", token);
  const games: { id: string; name: string }[] = gamesData?.data ?? [];
  if (games.length === 0) return null;

  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const all: TwitchClip[] = [];

  for (const game of games) {
    const clipsData = await twitchGet(
      `/clips?game_id=${game.id}&first=5&started_at=${since}`,
      token
    );
    const clips: any[] = clipsData?.data ?? [];
    for (const c of clips) {
      all.push({
        title: c.title,
        broadcasterName: c.broadcaster_name,
        gameName: game.name,
        clipUrl: c.url,
        thumbnailUrl: c.thumbnail_url,
        viewCount: c.view_count ?? 0,
      });
    }
  }

  if (all.length === 0) return null;

  all.sort((a, b) => b.viewCount - a.viewCount);
  return all.slice(0, limit);
}
