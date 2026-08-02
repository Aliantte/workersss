"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import NavTabs from "@/components/NavTabs";
import { CATEGORY_LABEL, type Report } from "@/lib/types";
import styles from "./crew.module.css";

type CrewData = {
  label: string;
  title: string;
  reports: Report[];
  items: any[];
};

const EMPTY: CrewData = { label: "", title: "", reports: [], items: [] };

const ROLE_DESC: Record<string, string> = {
  research: "Etsy digital-product ideas, on schedule.",
  studio: "Runs the sync meeting, then renders designs for whatever survives it.",
  editor: "Writes listing copy for every rendered design, does a QA pass.",
  packager: "Verifies design + copy both exist, sends the bundle up for review.",
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function CrewPage() {
  const params = useParams();
  const role = String(params.role);
  const [data, setData] = useState<CrewData>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/crew/${role}`, { cache: "no-store" });
        const json = await res.json();
        if (!cancelled) setData(json);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const id = setInterval(load, 20_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [role]);

  return (
    <div className={styles.page}>
      <NavTabs />
      <h1 className={styles.title}>{data.title || "…"}</h1>
      <p className={styles.subtitle}>{data.label ? `${data.label} — ${ROLE_DESC[role] ?? ""}` : ""}</p>

      <div className={styles.columns}>
        <section>
          <h2 className={styles.sectionHeading}>Activity log</h2>
          {!loading && data.reports.length === 0 && (
            <p className={styles.empty}>No cycles logged yet.</p>
          )}
          <div className={styles.logList}>
            {data.reports.map((r) => (
              <div key={r.id} className={styles.logRow}>
                <span className={styles.logTime}>{timeAgo(r.created_at)}</span>
                <span>{r.summary}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className={styles.sectionHeading}>Recent work</h2>
          {!loading && data.items.length === 0 && (
            <p className={styles.empty}>Nothing here yet.</p>
          )}
          <div className={styles.itemList}>
            {data.items.map((item, i) => (
              <div key={item.id ?? item.idea_id ?? i} className={styles.itemRow}>
                {role === "studio" && item.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt={item.concept} className={styles.itemThumb} />
                )}
                <div className={styles.itemBody}>
                  <span className={styles.itemCategory}>
                    {item.category ? CATEGORY_LABEL[item.category as keyof typeof CATEGORY_LABEL] : ""}
                  </span>
                  <p className={styles.itemConcept}>
                    {role === "editor" ? item.title : item.concept}
                  </p>
                  {item.status && <span className={styles.itemStatus}>{item.status}</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
