import styles from "./BotFigure.module.css";

type Variant = "research" | "studio" | "boss";

type Props = {
  variant: Variant;
  working?: boolean;
  size?: "sm" | "lg";
};

export default function BotFigure({ variant, working = true, size = "sm" }: Props) {
  return (
    <div className={`${styles.wrap} ${styles[variant]} ${size === "lg" ? styles.lg : ""}`}>
      <svg viewBox="0 0 100 120" className={styles.svg} aria-hidden="true">
        {variant === "boss" && <ellipse cx="50" cy="112" rx="34" ry="6" className={styles.dais} />}

        <g className={`${styles.bot} ${working ? styles.bobbing : ""}`}>
          {/* body */}
          <rect x="30" y="46" width="40" height="46" rx="8" className={styles.body} />
          {/* head */}
          <rect x="38" y="24" width="24" height="22" rx="6" className={styles.head} />
          <circle cx="46" cy="34" r="3" className={`${styles.eye} ${working ? styles.blink : ""}`} />
          <circle cx="54" cy="34" r="3" className={`${styles.eye} ${working ? styles.blink : ""}`} />
          <circle cx="50" cy="16" r="3" className={`${styles.lamp} ${working ? styles.pulse : ""}`} />
          <line x1="50" y1="19" x2="50" y2="24" className={styles.antenna} />
          {/* panel lines */}
          <rect x="36" y="58" width="10" height="5" rx="2" className={styles.panel} />
          <rect x="54" y="58" width="10" height="5" rx="2" className={styles.panel} />
          <rect x="36" y="70" width="28" height="5" rx="2" className={styles.panel} />

          {variant === "boss" && (
            <>
              <line x1="34" y1="20" x2="30" y2="10" className={styles.antenna} />
              <circle cx="30" cy="9" r="2.5" className={styles.lamp} />
              {/* clipboard */}
              <rect x="8" y="58" width="16" height="20" rx="2" className={styles.accessory} />
              <line x1="11" y1="64" x2="21" y2="64" className={styles.accessoryLine} />
              <line x1="11" y1="69" x2="21" y2="69" className={styles.accessoryLine} />
              <line x1="11" y1="74" x2="17" y2="74" className={styles.accessoryLine} />
            </>
          )}

          {variant === "research" && (
            <g className={working ? styles.sweep : ""} style={{ transformOrigin: "78px 70px" }}>
              <circle cx="78" cy="70" r="10" className={styles.accessoryOutline} />
              <line x1="85" y1="77" x2="92" y2="84" className={styles.accessoryLine} />
            </g>
          )}
          {variant === "research" && (
            <>
              <rect x="10" y="82" width="18" height="14" rx="1" className={styles.accessory} />
              <line x1="12" y1="86" x2="26" y2="86" className={styles.accessoryLine} />
              <line x1="12" y1="90" x2="26" y2="90" className={styles.accessoryLine} />
            </>
          )}

          {variant === "studio" && (
            <>
              <line x1="10" y1="98" x2="26" y2="70" className={styles.accessoryLine} />
              <rect x="4" y="60" width="24" height="30" rx="1" className={styles.accessory} />
              <circle
                cx="16"
                cy="75"
                r="2.5"
                className={`${styles.dab} ${working ? styles.dabMove : ""}`}
              />
              <line x1="72" y1="72" x2="88" y2="58" className={styles.brush} />
              <circle cx="88" cy="58" r="2.5" className={styles.brushTip} />
            </>
          )}
        </g>
      </svg>
    </div>
  );
}
