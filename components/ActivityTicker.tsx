import type { FeedItem } from "@/lib/types";
import styles from "./ActivityTicker.module.css";

function formatLine(item: FeedItem): string {
  if (item.station === "research") {
    return `RESEARCH — "${item.title}" (${item.niche})`;
  }
  return `STUDIO — painting ${item.theme === "storm" ? "a storm landscape" : "an anime scene"}`;
}

export default function ActivityTicker({ items }: { items: FeedItem[] }) {
  const lines = items.slice(0, 12).map(formatLine);
  const text = lines.length > 0 ? lines.join("     ·     ") : "Waiting on the first shift to clock in…";

  return (
    <div className={styles.ticker}>
      <span className={styles.liveTag}>
        <span className={styles.liveDot} />
        Live
      </span>
      <div className={styles.track}>
        <span className={styles.line}>{text}</span>
        <span className={styles.line} aria-hidden="true">
          {text}
        </span>
      </div>
    </div>
  );
}
