"use client";

import { useEffect, useState } from "react";
import NavTabs from "@/components/NavTabs";
import type { IdeaWithBundle } from "@/lib/types";
import { CATEGORY_LABEL } from "@/lib/types";
import styles from "../review/review.module.css";

export default function LibraryPage() {
  const [items, setItems] = useState<IdeaWithBundle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/library", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) setItems(data.items ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={styles.page}>
      <NavTabs />
      <h1 className={styles.title}>Library</h1>
      <p className={styles.subtitle}>Everything approved, with its finished design and listing copy.</p>

      {!loading && items.length === 0 && (
        <p className={styles.empty}>Nothing approved yet — approve something in the Review Queue.</p>
      )}

      <div className={styles.grid}>
        {items.map((item) => (
          <div key={item.id} className={styles.card}>
            {item.design_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.design_url} alt={item.concept} className={styles.image} />
            ) : (
              <div className={styles.imagePlaceholder}>No design</div>
            )}
            <div className={styles.body}>
              <span className={styles.category}>{CATEGORY_LABEL[item.category]}</span>
              <h3 className={styles.itemTitle}>{item.title || item.concept}</h3>
              <p className={styles.tags}>{item.tags}</p>
              <p className={styles.desc}>{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
