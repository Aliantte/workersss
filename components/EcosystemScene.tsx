import Link from "next/link";
import BotFigure from "./BotFigure";
import styles from "./EcosystemScene.module.css";

type Props = {
  researchNextRun: string;
  stormNextRun: string;
  animeNextRun: string;
};

export default function EcosystemScene({ researchNextRun, stormNextRun, animeNextRun }: Props) {
  return (
    <div className={styles.floor}>
      <div className={styles.bossRow}>
        <BotFigure variant="boss" size="lg" />
        <div className={styles.bossNote}>
          <span className={styles.bossTag}>Shift lead</span>
          <p>Dispatches both desks on schedule and keeps the belt moving. Doesn&apos;t do the work itself.</p>
        </div>
      </div>

      <div className={styles.zones}>
        <Link href="/research" className={`${styles.zone} ${styles.researchZone}`}>
          <span className={styles.zoneLabel}>Research Desk</span>
          <BotFigure variant="research" size="lg" />
          <span className={styles.zoneNext}>Next batch in {researchNextRun}</span>
        </Link>

        <Link href="/studio" className={`${styles.zone} ${styles.studioZone}`}>
          <span className={styles.zoneLabel}>Studio</span>
          <BotFigure variant="studio" size="lg" />
          <span className={styles.zoneNext}>
            Storm in {stormNextRun} · Anime in {animeNextRun}
          </span>
        </Link>
      </div>
    </div>
  );
}
