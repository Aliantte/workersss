"use client";

import { useEffect, useState } from "react";
import NavTabs from "@/components/NavTabs";
import BotFigure from "@/components/BotFigure";
import FeedConveyor from "@/components/FeedConveyor";
import { useFeed } from "@/lib/useFeed";
import { nextRunLabel, STORM_HOURS, ANIME_HOURS } from "@/lib/schedule";
import styles from "../page.module.css";
import zoneStyles from "../zone.module.css";

export default function StudioPage() {
  const { items, loading } = useFeed();
  const studioItems = items.filter((i) => i.station === "studio");
  const [labels, setLabels] = useState<{ storm: string; anime: string } | null>(null);

  useEffect(() => {
    function update() {
      setLabels({ storm: nextRunLabel(STORM_HOURS), anime: nextRunLabel(ANIME_HOURS) });
    }
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <main className={styles.main}>
      <NavTabs />

      <div className={zoneStyles.hero}>
        <BotFigure variant="studio" size="lg" />
        <div>
          <span className={zoneStyles.eyebrow}>Image generator</span>
          <h1 className={styles.title}>Studio</h1>
          <p className={styles.subtitle}>
            Paints on a timer — storm landscapes and anime portraits/action shots, built from a
            combinatorial prompt (subject × weather or action × mood) so it doesn&apos;t repeat
            itself at this frequency.
          </p>
          <span className={zoneStyles.next}>
            Storm in {labels?.storm ?? "—"} · Anime in {labels?.anime ?? "—"}
          </span>
        </div>
      </div>

      <section className={styles.recent}>
        <h2 className={styles.beltHeading}>
          {loading ? "Reading the belt…" : `${studioItems.length} images on record`}
        </h2>
        <FeedConveyor items={studioItems} />
      </section>
    </main>
  );
}
