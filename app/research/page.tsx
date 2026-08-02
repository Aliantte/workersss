"use client";

import { useEffect, useState } from "react";
import NavTabs from "@/components/NavTabs";
import BotFigure from "@/components/BotFigure";
import FeedConveyor from "@/components/FeedConveyor";
import { useFeed } from "@/lib/useFeed";
import { nextRunLabel, RESEARCH_HOURS } from "@/lib/schedule";
import styles from "../page.module.css";
import zoneStyles from "../zone.module.css";

export default function ResearchPage() {
  const { items, loading } = useFeed();
  const researchItems = items.filter((i) => i.station === "research");
  const [next, setNext] = useState<string | null>(null);

  useEffect(() => {
    function update() {
      setNext(nextRunLabel(RESEARCH_HOURS));
    }
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <main className={styles.main}>
      <NavTabs />

      <div className={zoneStyles.hero}>
        <BotFigure variant="research" size="lg" />
        <div>
          <span className={zoneStyles.eyebrow}>Market scout</span>
          <h1 className={styles.title}>Research Desk</h1>
          <p className={styles.subtitle}>
            Scans for new Etsy niches every 4 hours, 8 ideas a run, rotating through a different
            product category each time (home decor, jewelry, digital downloads, pet products,
            wedding, seasonal, stationery, craft supplies) so it doesn&apos;t just circle the same
            ground.
          </p>
          <span className={zoneStyles.next}>Next batch in {next ?? "—"}</span>
        </div>
      </div>

      <section className={styles.recent}>
        <h2 className={styles.beltHeading}>
          {loading ? "Reading the belt…" : `${researchItems.length} ideas on record`}
        </h2>
        <FeedConveyor items={researchItems} />
      </section>
    </main>
  );
}
