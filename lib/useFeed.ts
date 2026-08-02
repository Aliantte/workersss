"use client";

import { useEffect, useState } from "react";
import type { FeedItem } from "./types";

export function useFeed(intervalMs = 30_000) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/feed", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) setItems(data.items ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const id = setInterval(load, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [intervalMs]);

  return { items, loading };
}
