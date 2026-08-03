"use client";

import { useEffect, useState } from "react";
import NavTabs from "@/components/NavTabs";
import type { TeamMeeting } from "@/lib/types";
import styles from "./meeting.module.css";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function MeetingPage() {
  const [meetings, setMeetings] = useState<TeamMeeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/meeting", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) setMeetings(data.meetings ?? []);
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
      <h1 className={styles.title}>Team Meeting</h1>
      <p className={styles.subtitle}>
        The whole crew, both business lines, checking in on how things are actually going —
        grounded in real recent activity, not filler.
      </p>

      {!loading && meetings.length === 0 && (
        <p className={styles.empty}>No meetings held yet — check back after the next one.</p>
      )}

      <div className={styles.list}>
        {meetings.map((m) => (
          <div key={m.id} className={styles.card}>
            <span className={styles.time}>{timeAgo(m.created_at)}</span>
            <h3 className={styles.sectionHeading}>Discussion</h3>
            <p className={styles.text}>{m.discussion}</p>
            <h3 className={styles.sectionHeading}>Suggestions for you</h3>
            <p className={styles.text}>{m.suggestions}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
