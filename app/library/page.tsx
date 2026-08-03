"use client";

import { useEffect, useState } from "react";
import NavTabs from "@/components/NavTabs";
import type { IdeaWithBundle, PostWithBundle } from "@/lib/types";
import { CATEGORY_LABEL } from "@/lib/types";
import { NICHE_LABEL, type SocialNiche } from "@/lib/socialCategories";
import styles from "../review/review.module.css";

export default function LibraryPage() {
  const [etsyItems, setEtsyItems] = useState<IdeaWithBundle[]>([]);
  const [socialItems, setSocialItems] = useState<PostWithBundle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/library", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) {
          setEtsyItems(data.etsyItems ?? []);
          setSocialItems(data.socialItems ?? []);
        }
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
      <p className={styles.subtitle}>Everything approved, with its finished assets and copy.</p>

      <h2 className={styles.sectionDivider}>🛍️ Etsy Shop</h2>
      {!loading && etsyItems.length === 0 && (
        <p className={styles.empty}>Nothing approved yet — approve something in the Review Queue.</p>
      )}
      <div className={styles.grid}>
        {etsyItems.map((item) => (
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

      <h2 className={styles.sectionDivider}>📱 Social Content</h2>
      {!loading && socialItems.length === 0 && (
        <p className={styles.empty}>Nothing approved yet — approve something in the Review Queue.</p>
      )}
      <div className={styles.grid}>
        {socialItems.map((item) => (
          <div key={item.id} className={styles.card}>
            <div className={styles.dualImage}>
              {item.instagram_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.instagram_url} alt={item.hook} className={styles.halfImage} />
              ) : (
                <div className={styles.imagePlaceholderHalf}>No IG</div>
              )}
              {item.tiktok_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.tiktok_url} alt={item.hook} className={styles.halfImage} />
              ) : (
                <div className={styles.imagePlaceholderHalf}>No TikTok</div>
              )}
            </div>
            <div className={styles.body}>
              <span className={styles.category}>
                {NICHE_LABEL[item.niche as SocialNiche] ?? item.niche}
              </span>
              <h3 className={styles.itemTitle}>{item.hook}</h3>
              <p className={styles.tags}>{item.hashtags}</p>
              <p className={styles.desc}>{item.caption}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
