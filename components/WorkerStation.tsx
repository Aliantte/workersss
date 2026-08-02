import styles from "./WorkerStation.module.css";

type Props = {
  label: string;
  role: string;
  accent: "brass" | "teal";
  schedule: string[];
};

export default function WorkerStation({ label, role, accent, schedule }: Props) {
  return (
    <div className={`${styles.station} ${styles[accent]}`}>
      <div className={styles.bot}>
        <svg viewBox="0 0 64 64" className={styles.botSvg} aria-hidden="true">
          <rect x="14" y="22" width="36" height="28" rx="6" className={styles.botBody} />
          <rect x="24" y="10" width="16" height="14" rx="4" className={styles.botHead} />
          <circle cx="30" cy="17" r="2.2" className={styles.botEye} />
          <circle cx="38" cy="17" r="2.2" className={styles.botEye} />
          <rect x="20" y="30" width="8" height="4" rx="2" className={styles.botPanelLine} />
          <rect x="36" y="30" width="8" height="4" rx="2" className={styles.botPanelLine} />
          <rect x="20" y="38" width="24" height="4" rx="2" className={styles.botPanelLine} />
          <circle cx="32" cy="6" r="2" className={styles.botLamp} />
        </svg>
      </div>
      <div className={styles.meta}>
        <span className={styles.eyebrow}>{role}</span>
        <h2 className={styles.title}>{label}</h2>
        <ul className={styles.schedule}>
          {schedule.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
