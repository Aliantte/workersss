"use client";

import { useEffect, useState } from "react";
import NavTabs from "@/components/NavTabs";
import EcosystemScene from "@/components/EcosystemScene";
import FeedConveyor from "@/components/FeedConveyor";
import { useFeed } from "@/lib/useFeed";
import { nextRunLabel, RESEARCH_HOURS, STORM_HOURS, ANIME_HOURS } from "@/lib/schedule";
import styles from "./page.module.css";

export default function Home() {
  const { items, loading } = useFeed();
  const [labels, setLabels] = useState<{ research: string; storm: string; anime: string } | null>(
    null
  );

  useEffect(() => {
    function update() {
      setLabels({
        research: nextRunLabel(RESEARCH_HOURS),
        storm: nextRunLabel(STORM_HOURS),
        anime: nextRunLabel(ANIME_HOURS),
      });
    }
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <main className={styles.main}>
      <NavTabs />
      <header className={styles.header}>
        <span className={styles.eyebrow}>Night shift · automated</span>
        <h1 className={styles.title}>Worker Bots</h1>
        <p className={styles.subtitle}>
          The whole floor at a glance — the shift lead up top, two desks doing the actual work
          below. Click into either one for its live feed.
        </p>
      </header>

      <EcosystemScene
        researchNextRun={labels?.research ?? "—"}
        stormNextRun={labels?.storm ?? "—"}
        animeNextRun={labels?.anime ?? "—"}
      />

      <section className={styles.recent}>
        <h2 className={styles.beltHeading}>
          {loading ? "Reading the belt…" : `${items.length} most recent, combined`}
        </h2>
        <FeedConveyor items={items.slice(0, 12)} />
      </section>
    </main>
  );
}
