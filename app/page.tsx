"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import NavTabs from "@/components/NavTabs";
import PixelSprite from "@/components/PixelSprite";
import { SPRITES } from "@/lib/spritePalettes";
import { secondsUntilNextCycle, formatCountdown } from "@/lib/nextRun";
import type { Idea, Report } from "@/lib/types";
import styles from "./page.module.css";

type PipelineData = {
  queues: { studio: Idea[]; editor: Idea[]; packager: Idea[] };
  socialQueueCounts: { designer: number; copywriter: number };
  reports: Report[];
  counts: Record<string, number>;
};

const EMPTY_DATA: PipelineData = {
  queues: { studio: [], editor: [], packager: [] },
  socialQueueCounts: { designer: 0, copywriter: 0 },
  reports: [],
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

type ZoneKey = "boss" | "research" | "studio" | "editor" | "packager" | "scout" | "designer" | "copywriter";

const ZONES: {
  key: ZoneKey;
  name: string;
  role: string;
  color: string;
  textColor: string;
  href: string;
  big?: boolean;
}[] = [
  { key: "boss", name: "Big Al", role: "BOSS", color: "var(--gold)", textColor: "#2a1400", href: "/review", big: true },
  { key: "research", name: "Aliantte", role: "RESEARCH LAB", color: "var(--hud-green)", textColor: "#04160d", href: "/crew/research" },
  { key: "studio", name: "Pin Laden", role: "STUDIO", color: "var(--neon-purple)", textColor: "#170428", href: "/crew/studio" },
  { key: "editor", name: "Ally Al", role: "EDITOR", color: "var(--neon-cyan)", textColor: "#00222b", href: "/crew/editor" },
  { key: "packager", name: "Boxley", role: "PACKAGING", color: "var(--neon-pink)", textColor: "#2b0016", href: "/crew/packager" },
  { key: "scout", name: "Scout", role: "SOCIAL RESEARCH", color: "#ff8a3d", textColor: "#241300", href: "/crew/scout" },
  { key: "designer", name: "Designer", role: "SOCIAL STUDIO", color: "#ff6bcb", textColor: "#2b0022", href: "/crew/designer" },
  { key: "copywriter", name: "Copywriter", role: "SOCIAL COPY", color: "#2dd4bf", textColor: "#00201c", href: "/crew/copywriter" },
];

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export default function Home() {
  const [data, setData] = useState<PipelineData>(EMPTY_DATA);
  const [countdown, setCountdown] = useState("--:--:--");
  const [isDayShift, setIsDayShift] = useState<boolean | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const zoneRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  const [botPos, setBotPos] = useState<Record<string, { left: string; top: string }>>(
    Object.fromEntries(ZONES.map((z) => [z.key, { left: "50%", top: "55%" }]))
  );
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});

  const [alvinPos, setAlvinPos] = useState({ left: 0, top: 0 });
  const [alvinBubble, setAlvinBubble] = useState("");
  const [alvinVisible, setAlvinVisible] = useState(false);

  // Day (7am-9pm) vs Night (9:01pm-6:59am) shift, based on the viewer's local time
  useEffect(() => {
    function computeShift() {
      const hour = new Date().getHours();
      setIsDayShift(hour >= 7 && hour < 21);
    }
    computeShift();
    const id = setInterval(computeShift, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/pipeline", { cache: "no-store" });
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        /* keep last-known data */
      }
    }
    load();
    const id = setInterval(load, 20_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    function tick() {
      setCountdown(formatCountdown(secondsUntilNextCycle()));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Each sprite wanders within its own zone card
  useEffect(() => {
    const timers = ZONES.map((zone, i) => {
      function wander() {
        setBotPos((prev) => {
          const newLeft = rand(20, 75);
          const prevLeftStr = prev[zone.key]?.left ?? "50%";
          const prevLeft = parseFloat(prevLeftStr);
          setFlipped((f) => ({ ...f, [zone.key]: newLeft < prevLeft }));
          return { ...prev, [zone.key]: { left: `${newLeft}%`, top: `${rand(50, 70)}%` } };
        });
      }
      return setInterval(wander, 2600 + i * 350 + Math.random() * 1200);
    });
    return () => timers.forEach(clearInterval);
  }, []);

  // Alvin's rounds — measures real card positions, works regardless of grid vs stacked layout
  useEffect(() => {
    let idx = 0;
    let cancelled = false;

    function centerOf(el: HTMLAnchorElement) {
      const r = el.getBoundingClientRect();
      const c = mapRef.current!.getBoundingClientRect();
      return { x: r.left + r.width / 2 - c.left, y: r.top + r.height / 2 - c.top };
    }

    function rounds() {
      if (cancelled) return;
      const key = ZONES[idx].key;
      const target = zoneRefs.current[key];
      if (target && mapRef.current) {
        const pos = centerOf(target);
        setAlvinPos({ left: pos.x, top: pos.y });
        setAlvinBubble(ALVIN_PHRASES[Math.floor(Math.random() * ALVIN_PHRASES.length)]);
        setAlvinVisible(true);
        setTimeout(() => setAlvinVisible(false), 2800);
      }
      idx = (idx + 1) % ZONES.length;
      setTimeout(rounds, 3600);
    }

    const start = setTimeout(rounds, 600);
    return () => {
      cancelled = true;
      clearTimeout(start);
    };
  }, []);

  const pendingReview = data.counts["pending-review"] ?? 0;
  const approvedTotal = data.counts["approved"] ?? 0;

  const queueCount = useMemo(
    () => ({
      studio: data.queues.studio.length,
      editor: data.queues.editor.length,
      packager: data.queues.packager.length,
      designer: data.socialQueueCounts.designer,
      copywriter: data.socialQueueCounts.copywriter,
    }),
    [data]
  );

  const tickerText =
    data.reports.length > 0
      ? data.reports.map((r) => `${r.employee.toUpperCase()} :: ${r.summary}`).join("     ·     ")
      : "SYSTEM :: waiting on the first cycle to run…";

  return (
    <div className={`${styles.scene} ${isDayShift === false ? styles.night : styles.day}`}>
      <NavTabs />

      <div className={styles.hudTop}>
        <div className={styles.hudLeft}>
          <span className={styles.hudTitle}>{isDayShift === false ? "NIGHT SHIFT" : "DAY SHIFT"}</span>
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

      <div className={styles.map} ref={mapRef}>
        {ZONES.map((zone) => {
          const sprite = SPRITES[zone.key];
          const count =
            zone.key === "studio"
              ? queueCount.studio
              : zone.key === "editor"
              ? queueCount.editor
              : zone.key === "packager"
              ? queueCount.packager
              : zone.key === "designer"
              ? queueCount.designer
              : zone.key === "copywriter"
              ? queueCount.copywriter
              : null;

          return (
            <Link
              key={zone.key}
              href={zone.href}
              ref={(el) => {
                zoneRefs.current[zone.key] = el;
              }}
              className={`${styles.zoneCard} ${zone.big ? styles.zoneBig : ""}`}
              style={{ ["--zone-color" as string]: zone.color } as React.CSSProperties}
            >
              <div
                className={styles.zoneLabel}
                style={{ background: zone.color, color: zone.textColor }}
              >
                {zone.name}
                <small>{zone.role}</small>
              </div>
              {count !== null && <span className={styles.zoneCount}>{count}</span>}
              <div
                className={styles.spriteSlot}
                style={{ left: botPos[zone.key]?.left, top: botPos[zone.key]?.top }}
              >
                <PixelSprite
                  palette={sprite.palette}
                  rowOverrides={sprite.rowOverrides}
                  big={zone.big}
                  flipped={flipped[zone.key]}
                />
              </div>
            </Link>
          );
        })}

        <div className={styles.alvin} style={{ left: alvinPos.left, top: alvinPos.top }}>
          <PixelSprite palette={SPRITES.alvin.palette} rowOverrides={SPRITES.alvin.rowOverrides} />
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
