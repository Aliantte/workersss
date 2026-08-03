"use client";

import { useEffect, useState } from "react";
import NavTabs from "@/components/NavTabs";
import type { IdeaWithBundle, PostWithBundle } from "@/lib/types";
import { CATEGORY_LABEL } from "@/lib/types";
import { NICHE_LABEL, type SocialNiche } from "@/lib/socialCategories";
import styles from "./review.module.css";

type Kind = "etsy" | "social";

export default function ReviewPage() {
  const [etsyItems, setEtsyItems] = useState<IdeaWithBundle[]>([]);
  const [socialItems, setSocialItems] = useState<PostWithBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [reasonDrafts, setReasonDrafts] = useState<Record<string, string>>({});
  const [openReasonFor, setOpenReasonFor] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/review/queue", { cache: "no-store" });
      const data = await res.json();
      setEtsyItems(data.etsyItems ?? []);
      setSocialItems(data.socialItems ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 20_000);
    return () => clearInterval(id);
  }, []);

  async function approve(id: number, kind: Kind) {
    if (kind === "etsy") setEtsyItems((prev) => prev.filter((i) => i.id !== id));
    else setSocialItems((prev) => prev.filter((i) => i.id !== id));
    await fetch("/api/review/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ideaId: id, kind }),
    });
  }

  async function reject(id: number, kind: Kind) {
    const key = `${kind}-${id}`;
    const reason = reasonDrafts[key] || "";
    if (kind === "etsy") setEtsyItems((prev) => prev.filter((i) => i.id !== id));
    else setSocialItems((prev) => prev.filter((i) => i.id !== id));
    setOpenReasonFor(null);
    await fetch("/api/review/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ideaId: id, reason, kind }),
    });
  }

  function ReasonRow({ id, kind }: { id: number; kind: Kind }) {
    const key = `${kind}-${id}`;
    return (
      <div className={styles.reasonRow}>
        <input
          className={styles.reasonInput}
          placeholder="Reason (optional)"
          value={reasonDrafts[key] || ""}
          onChange={(e) => setReasonDrafts((prev) => ({ ...prev, [key]: e.target.value }))}
        />
        <button className={styles.confirmReject} onClick={() => reject(id, kind)}>
          Confirm reject
        </button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <NavTabs />
      <h1 className={styles.title}>Review Queue</h1>
      <p className={styles.subtitle}>
        Everything the crew has packaged and is waiting on your call. Approve moves it to the
        library; reject archives it with a reason, nothing gets deleted.
      </p>

      <h2 className={styles.sectionDivider}>🛍️ Etsy Shop</h2>
      {!loading && etsyItems.length === 0 && (
        <p className={styles.empty}>Nothing waiting right now — check back after the next cycle.</p>
      )}
      <div className={styles.grid}>
        {etsyItems.map((item) => {
          const key = `etsy-${item.id}`;
          return (
            <div key={key} className={styles.card}>
              {item.design_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.design_url} alt={item.concept} className={styles.image} />
              ) : (
                <div className={styles.imagePlaceholder}>No design</div>
              )}
              <div className={styles.body}>
                <span className={styles.category}>{CATEGORY_LABEL[item.category]}</span>
                <h3 className={styles.itemTitle}>{item.title || item.concept}</h3>
                {item.suggested_price != null && (
                  <p className={styles.price}>
                    Suggested: ${Number(item.suggested_price).toFixed(2)}
                    {item.price_range && <span className={styles.priceRange}> (market: {item.price_range})</span>}
                  </p>
                )}
                <p className={styles.tags}>{item.tags}</p>
                <p className={styles.desc}>{item.description}</p>

                <div className={styles.actions}>
                  <button className={styles.approve} onClick={() => approve(item.id, "etsy")}>
                    Approve
                  </button>
                  <button
                    className={styles.reject}
                    onClick={() => setOpenReasonFor(openReasonFor === key ? null : key)}
                  >
                    Reject
                  </button>
                </div>

                {openReasonFor === key && <ReasonRow id={item.id} kind="etsy" />}
              </div>
            </div>
          );
        })}
      </div>

      <h2 className={styles.sectionDivider}>📱 Social Content</h2>
      {!loading && socialItems.length === 0 && (
        <p className={styles.empty}>Nothing waiting right now — check back after the next cycle.</p>
      )}
      <div className={styles.grid}>
        {socialItems.map((item) => {
          const key = `social-${item.id}`;
          return (
            <div key={key} className={styles.card}>
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

                <div className={styles.actions}>
                  <button className={styles.approve} onClick={() => approve(item.id, "social")}>
                    Approve
                  </button>
                  <button
                    className={styles.reject}
                    onClick={() => setOpenReasonFor(openReasonFor === key ? null : key)}
                  >
                    Reject
                  </button>
                </div>

                {openReasonFor === key && <ReasonRow id={item.id} kind="social" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
