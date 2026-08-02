"use client";

import { useEffect, useState } from "react";
import NavTabs from "@/components/NavTabs";
import type { IdeaWithBundle } from "@/lib/types";
import { CATEGORY_LABEL } from "@/lib/types";
import styles from "./review.module.css";

export default function ReviewPage() {
  const [items, setItems] = useState<IdeaWithBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [reasonDrafts, setReasonDrafts] = useState<Record<number, string>>({});
  const [openReasonFor, setOpenReasonFor] = useState<number | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/review/queue", { cache: "no-store" });
      const data = await res.json();
      setItems(data.items ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 20_000);
    return () => clearInterval(id);
  }, []);

  async function approve(ideaId: number) {
    setItems((prev) => prev.filter((i) => i.id !== ideaId));
    await fetch("/api/review/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ideaId }),
    });
  }

  async function reject(ideaId: number) {
    const reason = reasonDrafts[ideaId] || "";
    setItems((prev) => prev.filter((i) => i.id !== ideaId));
    setOpenReasonFor(null);
    await fetch("/api/review/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ideaId, reason }),
    });
  }

  return (
    <div className={styles.page}>
      <NavTabs />
      <h1 className={styles.title}>Review Queue</h1>
      <p className={styles.subtitle}>
        Everything the crew has packaged and is waiting on your call. Approve moves it to the
        library; reject archives it with a reason, nothing gets deleted.
      </p>

      {!loading && items.length === 0 && (
        <p className={styles.empty}>Nothing waiting right now — check back after the next cycle.</p>
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

              <div className={styles.actions}>
                <button className={styles.approve} onClick={() => approve(item.id)}>
                  Approve
                </button>
                <button
                  className={styles.reject}
                  onClick={() =>
                    setOpenReasonFor(openReasonFor === item.id ? null : item.id)
                  }
                >
                  Reject
                </button>
              </div>

              {openReasonFor === item.id && (
                <div className={styles.reasonRow}>
                  <input
                    className={styles.reasonInput}
                    placeholder="Reason (optional)"
                    value={reasonDrafts[item.id] || ""}
                    onChange={(e) =>
                      setReasonDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))
                    }
                  />
                  <button className={styles.confirmReject} onClick={() => reject(item.id)}>
                    Confirm reject
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
