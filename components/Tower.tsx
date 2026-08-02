import FloorRoom from "./FloorRoom";
import styles from "./Tower.module.css";

type Props = {
  researchNextRun: string;
  stormNextRun: string;
  animeNextRun: string;
};

export default function Tower({ researchNextRun, stormNextRun, animeNextRun }: Props) {
  return (
    <div className={styles.tower}>
      <svg viewBox="0 0 400 60" className={styles.rooftop} preserveAspectRatio="none">
        <rect x="0" y="0" width="400" height="60" className={styles.rooftopWall} />
        <rect x="26" y="20" width="34" height="22" className={styles.rooftopBox} />
        <line x1="150" y1="48" x2="188" y2="16" className={styles.dishArm} />
        <ellipse
          cx="188"
          cy="16"
          rx="22"
          ry="9"
          className={styles.dish}
          transform="rotate(-18 188 16)"
        />
        <line x1="330" y1="48" x2="330" y2="8" className={styles.antennaPole} />
        <circle cx="330" cy="6" r="3" className={styles.antennaLight} />
      </svg>

      <div className={styles.shaftColumn}>
        <div className={styles.shaftLine} />
        <div className={styles.car} />
      </div>

      <FloorRoom variant="boss" title="Boardroom — Shift Lead" subtitle="Dispatches both desks" />
      <FloorRoom
        variant="research"
        title="Research Desk"
        subtitle={`Next batch in ${researchNextRun}`}
        href="/research"
      />
      <FloorRoom
        variant="studio"
        title="Studio"
        subtitle={`Storm ${stormNextRun} · Anime ${animeNextRun}`}
        href="/studio"
      />
    </div>
  );
}
