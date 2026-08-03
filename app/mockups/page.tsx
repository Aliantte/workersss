"use client";

import { useEffect, useState } from "react";
import NavTabs from "@/components/NavTabs";
import type { MockupWithIdea } from "@/lib/types";
import styles from "./mockups.module.css";

export default function MockupsPage() {
  const [mockups, setMockups] = useState<MockupWithIdea[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/mockups", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) setMockups(data.mockups ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = mockups.reduce<Record<number, MockupWithIdea[]>>((acc, m) => {
    (acc[m.idea_id] ??= []).push(m);
    return acc;
  }, {});

  return (
    <div className={styles.page}>
      <NavTabs />
      <h1 className={styles.title}>Mockups</h1>
      <p className={styles.subtitle}>
        Real product photos, real designs composited onto them — not another AI generation
        guessing where things go.
      </p>

      {!loading && Object.keys(grouped).length === 0 && (
        <p className={styles.empty}>
          Nothing yet — mockups generate automatically for tumbler wrap designs once rendered.
        </p>
      )}

      <div className={styles.groups}>
        {Object.entries(grouped).map(([ideaId, shots]) => (
          <div key={ideaId} className={styles.group}>
            <h3 className={styles.concept}>{shots[0].concept}</h3>
            <div className={styles.shotsRow}>
              {shots.map((m) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={m.id} src={m.url} alt={m.template_name} className={styles.shot} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
