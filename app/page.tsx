"use client";

import { useEffect, useState } from "react";
import WorkerStation from "@/components/WorkerStation";
import FeedConveyor from "@/components/FeedConveyor";
import type { FeedItem } from "@/lib/types";
import styles from "./page.module.css";

export default function Home() {
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
    const interval = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>Night shift · automated</span>
        <h1 className={styles.title}>Worker Bots</h1>
        <p className={styles.subtitle}>
          Two stations on the clock. One mines new Etsy niches, one paints on a timer. Everything below
          landed here on its own — nobody&apos;s pressing a button.
        </p>
      </header>

      <section className={styles.stations}>
        <WorkerStation
          label="Research Desk"
          role="Market scout"
          accent="brass"
          schedule={["Every 4 hours", "8 ideas/run, rotating category"]}
        />
        <WorkerStation
          label="Studio"
          role="Image generator"
          accent="teal"
          schedule={["Storms: 02, 08, 14, 20 UTC", "Anime: 05, 11, 17, 23 UTC"]}
        />
      </section>

      <section>
        <h2 className={styles.beltHeading}>{loading ? "Reading the belt…" : `${items.length} on the belt`}</h2>
        <FeedConveyor items={items} />
      </section>
    </main>
  );
}
