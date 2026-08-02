import Link from "next/link";
import BotFigure from "./BotFigure";
import styles from "./FloorRoom.module.css";

type Variant = "boss" | "research" | "studio";

type Props = {
  variant: Variant;
  title: string;
  subtitle: string;
  href?: string;
};

function Door() {
  return (
    <>
      <rect x="378" y="26" width="16" height="98" rx="2" className={styles.door} />
      <circle cx="386" cy="40" r="2.4" className={styles.doorLight} />
    </>
  );
}

function RoomBackdrop({ variant }: { variant: Variant }) {
  if (variant === "boss") {
    return (
      <svg viewBox="0 0 400 150" className={styles.backdrop} preserveAspectRatio="none">
        <rect x="0" y="0" width="400" height="150" className={styles.wall} />
        <rect x="16" y="14" width="16" height="34" className={styles.prop} />
        <rect x="36" y="14" width="16" height="34" className={styles.prop} />
        <circle cx="24" cy="20" r="1.6" className={styles.propLightBrass} />
        <circle cx="44" cy="20" r="1.6" className={styles.propLightBrass} />
        <rect x="100" y="112" width="220" height="10" rx="2" className={styles.table} />
        {[122, 152, 182, 212, 242, 272].map((x, i) => (
          <rect
            key={x}
            x={x}
            y={i % 2 === 0 ? 94 : 128}
            width="14"
            height="16"
            rx="2"
            className={styles.chair}
          />
        ))}
        <Door />
      </svg>
    );
  }

  if (variant === "research") {
    return (
      <svg viewBox="0 0 400 150" className={styles.backdrop} preserveAspectRatio="none">
        <rect x="0" y="0" width="400" height="150" className={styles.wall} />
        <rect x="20" y="18" width="94" height="12" className={styles.prop} />
        <rect x="20" y="36" width="94" height="12" className={styles.prop} />
        {[28, 42, 56, 70, 84, 98].map((x) => (
          <rect key={x} x={x} y={19} width="8" height="10" className={styles.propAccentBrass} />
        ))}
        <rect x="190" y="106" width="150" height="10" rx="2" className={styles.table} />
        <rect x="200" y="116" width="8" height="20" className={styles.legShadow} />
        <rect x="322" y="116" width="8" height="20" className={styles.legShadow} />
        <rect x="220" y="82" width="36" height="24" rx="2" className={styles.prop} />
        <rect x="270" y="92" width="24" height="14" className={styles.propAccentBrass} />
        <rect x="352" y="118" width="16" height="14" className={styles.pot} />
        <circle cx="360" cy="110" r="10" className={styles.leaf} />
        <Door />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 400 150" className={styles.backdrop} preserveAspectRatio="none">
      <rect x="0" y="0" width="400" height="150" className={styles.wall} />
      <line x1="55" y1="128" x2="35" y2="52" className={styles.easelLeg} />
      <line x1="90" y1="128" x2="110" y2="52" className={styles.easelLeg} />
      <rect x="28" y="32" width="90" height="72" rx="2" className={styles.canvas} />
      <rect x="200" y="26" width="150" height="10" className={styles.prop} />
      {[212, 232, 252, 272, 292, 312, 332].map((x) => (
        <circle key={x} cx={x} cy={42} r="5" className={styles.paintDot} />
      ))}
      <rect x="250" y="110" width="30" height="8" rx="2" className={styles.prop} />
      <rect x="258" y="118" width="4" height="16" className={styles.legShadow} />
      <rect x="274" y="118" width="4" height="16" className={styles.legShadow} />
      <Door />
    </svg>
  );
}

const BOT_POSITION: Record<Variant, string> = {
  boss: styles.botBoss,
  research: styles.botResearch,
  studio: styles.botStudio,
};

export default function FloorRoom({ variant, title, subtitle, href }: Props) {
  const body = (
    <div className={`${styles.floor} ${styles[variant]}`}>
      <div className={styles.room}>
        <RoomBackdrop variant={variant} />
        <div className={`${styles.botSlot} ${BOT_POSITION[variant]}`}>
          <BotFigure variant={variant} size="sm" />
        </div>
      </div>
      <div className={styles.plate}>
        <span className={styles.plateLabel}>{title}</span>
        <span className={styles.plateSub}>{subtitle}</span>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className={styles.floorLink}>
        {body}
      </Link>
    );
  }
  return body;
}
