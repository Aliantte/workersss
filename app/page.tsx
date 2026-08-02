"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import NavTabs from "@/components/NavTabs";
import { secondsUntilNextCycle, formatCountdown } from "@/lib/nextRun";
import type { Idea, Report, MeetingNotes } from "@/lib/types";
import styles from "./page.module.css";

type PipelineData = {
  queues: { studio: Idea[]; editor: Idea[]; packager: Idea[] };
  reports: Report[];
  latestMeetingNotes: MeetingNotes | null;
  counts: Record<string, number>;
};

const EMPTY_DATA: PipelineData = {
  queues: { studio: [], editor: [], packager: [] },
  reports: [],
  latestMeetingNotes: null,
  counts: {},
};

const ALVIN_PHRASES = [
  "good hustle in here",
  "thanks for the grind",
  "checking in on the crew",
  "keep it moving",
  "solid numbers today",
  "proud of this crew",
  "making the rounds",
];

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function TodoPanel({ label, items }: { label: string; items: Idea[] }) {
  return (
    <div className={styles.todo}>
      <span className={styles.todoCount}>{items.length}</span> {label}
      {items.slice(0, 3).map((i) => (
        <div key={i.id}>· {i.concept.slice(0, 28)}</div>
      ))}
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState<PipelineData>(EMPTY_DATA);
  const [countdown, setCountdown] = useState("--:--:--");

  const mapRef = useRef<HTMLDivElement>(null);
  const roomRefs = {
    boss: useRef<HTMLDivElement>(null),
    research: useRef<HTMLDivElement>(null),
    studio: useRef<HTMLDivElement>(null),
    editor: useRef<HTMLDivElement>(null),
    packager: useRef<HTMLDivElement>(null),
  };

  const [botPos, setBotPos] = useState<Record<string, { left: string; top: string }>>({
    boss: { left: "50%", top: "34%" },
    research: { left: "45%", top: "38%" },
    studio: { left: "55%", top: "60%" },
    editor: { left: "48%", top: "35%" },
    packager: { left: "50%", top: "55%" },
  });

  const [alvinPos, setAlvinPos] = useState({ left: 0, top: 0 });
  const [alvinBubble, setAlvinBubble] = useState("");
  const [alvinVisible, setAlvinVisible] = useState(false);

  // Poll pipeline data
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/pipeline", { cache: "no-store" });
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        /* leave last-known data in place */
      }
    }
    load();
    const id = setInterval(load, 20_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Countdown
  useEffect(() => {
    function tick() {
      setCountdown(formatCountdown(secondsUntilNextCycle()));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Bot wandering, one independent interval per station
  useEffect(() => {
    const ranges: Record<string, { xr: [number, number]; yr: [number, number] }> = {
      boss: { xr: [25, 75], yr: [22, 45] },
      research: { xr: [15, 75], yr: [22, 55] },
      studio: { xr: [15, 80], yr: [18, 55] },
      editor: { xr: [20, 78], yr: [20, 45] },
      packager: { xr: [20, 78], yr: [22, 50] },
    };
    const timers = Object.entries(ranges).map(([key, r], i) => {
      function wander() {
        setBotPos((prev) => ({
          ...prev,
          [key]: { left: `${rand(...r.xr)}%`, top: `${rand(...r.yr)}%` },
        }));
      }
      return setInterval(wander, 2600 + i * 400 + Math.random() * 1200);
    });
    return () => timers.forEach(clearInterval);
  }, []);

  // Alvin's rounds
  useEffect(() => {
    const stationIds: (keyof typeof roomRefs)[] = ["boss", "research", "studio", "editor", "packager"];
    let idx = 0;
    let cancelled = false;

    function centerOf(el: HTMLDivElement) {
      const r = el.getBoundingClientRect();
      const c = mapRef.current!.getBoundingClientRect();
      return { x: r.left + r.width / 2 - c.left, y: r.top + r.height / 2 - c.top };
    }

    function rounds() {
      if (cancelled) return;
      if (typeof window !== "undefined" && window.innerWidth <= 640) {
        setTimeout(rounds, 4200);
        return;
      }
      const target = roomRefs[stationIds[idx]].current;
      if (target && mapRef.current) {
        const pos = centerOf(target);
        setAlvinPos({ left: pos.x, top: pos.y });
        setAlvinBubble(ALVIN_PHRASES[Math.floor(Math.random() * ALVIN_PHRASES.length)]);
        setAlvinVisible(true);
        setTimeout(() => setAlvinVisible(false), 2800);
      }
      idx = (idx + 1) % stationIds.length;
      setTimeout(rounds, 4400);
    }

    const start = setTimeout(rounds, 600);
    return () => {
      cancelled = true;
      clearTimeout(start);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingReview = data.counts["pending-review"] ?? 0;
  const approvedTotal = data.counts["approved"] ?? 0;

  const tickerText =
    data.reports.length > 0
      ? data.reports.map((r) => `${r.employee.toUpperCase()} :: ${r.summary}`).join("     ·     ")
      : "SYSTEM :: waiting on the first cycle to run…";

  return (
    <div className={styles.scene}>
      <NavTabs />

      <div className={styles.hudTop}>
        <div className={styles.hudLeft}>
          <span className={styles.hudTitle}>NIGHT SHIFT</span>
          <span className={styles.hudStat}>
            NEXT CYCLE <b>{countdown}</b>
          </span>
        </div>
        <div className={styles.hudRight}>
          <span className={styles.hudStat}>
            <span className={styles.liveDot} /> <b>{pendingReview}</b> AWAITING REVIEW
          </span>
          <span className={styles.hudStat}>
            LIBRARY <b>{approvedTotal}</b>
          </span>
        </div>
      </div>

      <h1 className={styles.pagehead}>THE TRAP</h1>
      <p className={styles.subhead}>five-person crew running an Etsy shop while you sleep</p>

      {data.latestMeetingNotes && (
        <p className={styles.subhead} style={{ maxWidth: 700, margin: "0 auto 12px" }}>
          <em>Latest sync — {data.latestMeetingNotes.batch_id}:</em> {data.latestMeetingNotes.notes}
        </p>
      )}

      <div className={styles.map} ref={mapRef}>
        <div
          className={`${styles.room} ${styles.boss} ${styles.bossSlot}`}
          ref={roomRefs.boss}
        >
          <Link href="/review" className={styles.roomFloor} aria-label="Go to review queue" />
          <div className={styles.bossDesk} />
          <div className={styles.bossChair} />
          <div className={styles.cash} style={{ bottom: "48px", left: "42%" }} />
          <div className={styles.cash} style={{ bottom: "52px", left: "48%" }} />
          <div className={styles.frame} />
          <div
            className={styles.bot}
            style={{ color: "var(--gold)", background: "var(--gold)", ...botPos.boss }}
          >
            <div className={styles.botTag}>BIG AL</div>
          </div>
          <div className={styles.roomLabel}>
            Big Al <small>BOSS — TAP FOR REVIEW QUEUE</small>
          </div>
          <div className={styles.roomDesc}>
            Approves or rejects everything that reaches the review queue
          </div>
        </div>

        <div className={styles.hallwayH} />

        <div
          className={`${styles.room} ${styles.research} ${styles.researchSlot}`}
          ref={roomRefs.research}
        >
          <Link href="/crew/research" className={styles.roomFloor} aria-label="Go to Research Lab" />
          <div className={styles.desk} />
          <div className={`${styles.monitor} ${styles.m1}`}>
            <div className={styles.monitorLine} />
          </div>
          <div className={`${styles.monitor} ${styles.m2}`}>
            <div className={styles.monitorLine} />
          </div>
          <div className={`${styles.monitor} ${styles.m3}`}>
            <div className={styles.monitorLine} />
          </div>
          <div
            className={styles.bot}
            style={{ color: "var(--hud-green)", background: "var(--hud-green)", ...botPos.research }}
          >
            <div className={styles.botTag}>ALIANTTE</div>
          </div>
          <div className={styles.roomLabel}>
            Aliantte <small>RESEARCH LAB</small>
          </div>
          <div className={styles.roomDesc}>Etsy digital-product ideas, every 4h</div>
        </div>

        <div className={`${styles.hallwayV} ${styles.hallwayV1}`} />

        <div
          className={`${styles.room} ${styles.studio} ${styles.studioSlot}`}
          ref={roomRefs.studio}
        >
          <Link href="/crew/studio" className={styles.roomFloor} aria-label="Go to Studio" />
          <div className={styles.easel} />
          <div className={styles.canvas}>
            <div
              className={styles.paintSplat}
              style={{ width: 14, height: 14, background: "var(--neon-pink)", top: 6, left: 8 }}
            />
            <div
              className={styles.paintSplat}
              style={{ width: 9, height: 9, background: "var(--gold)", top: 14, left: 24 }}
            />
          </div>
          <div className={styles.drip} />
          <TodoPanel label="TO RENDER" items={data.queues.studio} />
          <div
            className={styles.bot}
            style={{ color: "var(--neon-purple)", background: "var(--neon-purple)", ...botPos.studio }}
          >
            <div className={styles.botTag}>PIN LADEN</div>
          </div>
          <div className={styles.roomLabel}>
            Pin Laden <small>STUDIO</small>
          </div>
          <div className={styles.roomDesc}>Renders designs for whatever survives the sync</div>
        </div>

        <div className={styles.hallwayH} />

        <div
          className={`${styles.room} ${styles.editor} ${styles.editorSlot}`}
          ref={roomRefs.editor}
        >
          <Link href="/crew/editor" className={styles.roomFloor} aria-label="Go to Editor" />
          <div className={styles.headphones} />
          <div className={styles.timeline}>
            <div className={styles.timelineClip} style={{ left: 6 }} />
            <div className={styles.timelineClip} style={{ left: 34 }} />
            <div className={styles.timelineClip} style={{ left: 70 }} />
          </div>
          <div className={styles.editDesk} />
          <TodoPanel label="TO WRITE" items={data.queues.editor} />
          <div
            className={styles.bot}
            style={{ color: "var(--neon-cyan)", background: "var(--neon-cyan)", ...botPos.editor }}
          >
            <div className={styles.botTag}>ALLY AL</div>
          </div>
          <div className={styles.roomLabel}>
            Ally Al <small>EDITOR</small>
          </div>
          <div className={styles.roomDesc}>Writes listing copy, QA before it ships</div>
        </div>

        <div className={`${styles.hallwayV} ${styles.hallwayV2}`} />

        <div
          className={`${styles.room} ${styles.packager} ${styles.packagerSlot}`}
          ref={roomRefs.packager}
        >
          <Link href="/crew/packager" className={styles.roomFloor} aria-label="Go to Packaging Bay" />
          <div className={styles.crate} style={{ width: 34, height: 26, bottom: 40, left: 24 }}>
            <div className={styles.tapeLine} />
          </div>
          <div className={styles.crate} style={{ width: 26, height: 20, bottom: 42, left: 62 }}>
            <div className={styles.tapeLine} />
          </div>
          <div className={styles.outTray} />
          <TodoPanel label="TO PACKAGE" items={data.queues.packager} />
          <div
            className={styles.bot}
            style={{ color: "var(--neon-pink)", background: "var(--neon-pink)", ...botPos.packager }}
          >
            <div className={styles.botTag}>BOXLEY</div>
          </div>
          <div className={styles.roomLabel}>
            Boxley <small>PACKAGING BAY</small>
          </div>
          <div className={styles.roomDesc}>Bundles design + copy, sends it up to Big Al</div>
        </div>

        <div
          className={styles.alvin}
          style={{ left: alvinPos.left, top: alvinPos.top }}
        >
          <div className={styles.alvinTag}>ALVIN</div>
          <div className={`${styles.alvinBubble} ${alvinVisible ? styles.alvinBubbleShow : ""}`}>
            {alvinBubble}
          </div>
        </div>
      </div>

      <div className={styles.tickerWrap}>
        <div className={styles.tickerTrack}>
          <span className={styles.tickerLine}>{tickerText}</span>
          <span className={styles.tickerLine} aria-hidden="true">
            {tickerText}
          </span>
        </div>
      </div>
    </div>
  );
}
