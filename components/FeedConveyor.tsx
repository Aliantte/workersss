import type { FeedItem } from "@/lib/types";
import styles from "./FeedConveyor.module.css";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function FeedConveyor({ items }: { items: FeedItem[] }) {
  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No output yet. The belt starts moving once a cron job fires — trigger one manually to test, or wait for the next scheduled run.</p>
      </div>
    );
  }

  return (
    <div className={styles.belt}>
      {items.map((item, i) => (
        <div
          key={item.id}
          className={`${styles.card} ${item.station === "research" ? styles.research : styles.studio}`}
          style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
        >
          {item.station === "research" ? (
            <>
              <span className={styles.tag}>Research desk</span>
              <h3 className={styles.cardTitle}>{item.title}</h3>
              <p className={styles.niche}>{item.niche}</p>
              <p className={styles.reasoning}>{item.reasoning}</p>
            </>
          ) : (
            <>
              <span className={styles.tag}>{item.theme === "storm" ? "Studio — storm" : "Studio — anime"}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.imageUrl} alt={item.prompt} className={styles.image} loading="lazy" />
              <p className={styles.prompt}>{item.prompt}</p>
            </>
          )}
          <span className={styles.time}>{timeAgo(item.createdAt)}</span>
        </div>
      ))}
    </div>
  );
}
