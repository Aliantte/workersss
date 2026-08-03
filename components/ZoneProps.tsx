import styles from "./ZoneProps.module.css";

type Props = { zoneKey: string; accentColor: string };

export default function ZoneProps({ zoneKey, accentColor }: Props) {
  const common = { className: styles.svg, viewBox: "0 0 200 90", preserveAspectRatio: "xMidYMax meet" };

  switch (zoneKey) {
    case "boss":
      return (
        <svg {...common}>
          <rect x="60" y="58" width="80" height="14" rx="2" className={styles.prop} />
          <rect x="90" y="42" width="20" height="20" rx="3" className={styles.prop} />
          <rect x="70" y="50" width="10" height="6" rx="1" fill="#3fae44" stroke="#1c4a1f" strokeWidth="1" />
          <rect x="76" y="47" width="10" height="6" rx="1" fill="#3fae44" stroke="#1c4a1f" strokeWidth="1" />
        </svg>
      );
    case "research":
      return (
        <svg {...common}>
          <rect x="40" y="60" width="120" height="10" rx="2" className={styles.prop} />
          {[55, 90, 125].map((x, i) => (
            <g key={x}>
              <rect x={x} y="34" width="24" height="18" rx="2" className={styles.monitor} />
              <rect x={x + 2} y={36 + i} width="20" height="2" className={styles.scanLine} style={{ animationDelay: `${i * 0.4}s` }} />
            </g>
          ))}
        </svg>
      );
    case "studio":
      return (
        <svg {...common}>
          <line x1="90" y1="76" x2="80" y2="30" stroke="#4a3a5a" strokeWidth="3" />
          <line x1="120" y1="76" x2="130" y2="30" stroke="#4a3a5a" strokeWidth="3" />
          <rect x="70" y="20" width="60" height="46" rx="2" className={styles.canvas} />
          <circle cx="88" cy="35" r="8" fill={accentColor} opacity="0.85" />
          <circle cx="110" cy="48" r="5" fill="#ffd23f" opacity="0.85" />
        </svg>
      );
    case "editor":
      return (
        <svg {...common}>
          <rect x="50" y="50" width="100" height="14" rx="2" className={styles.timeline} />
          {[58, 82, 106, 130].map((x) => (
            <rect key={x} x={x} y="52" width="10" height="10" rx="1" fill={accentColor} opacity="0.65" />
          ))}
          <path
            d="M140 20 a14 14 0 0 1 28 0 v10 h-6 v-10 a8 8 0 0 0 -16 0 v10 h-6z"
            fill="none"
            stroke={accentColor}
            strokeWidth="3"
            opacity="0.75"
          />
        </svg>
      );
    case "packager":
      return (
        <svg {...common}>
          <rect x="55" y="42" width="46" height="34" rx="2" className={styles.crate} />
          <line x1="55" y1="59" x2="101" y2="59" stroke={accentColor} strokeWidth="2" opacity="0.6" />
          <rect x="108" y="52" width="34" height="24" rx="2" className={styles.crate} />
          <line x1="108" y1="64" x2="142" y2="64" stroke={accentColor} strokeWidth="2" opacity="0.6" />
        </svg>
      );
    case "scout":
      return (
        <svg {...common}>
          <rect x="70" y="26" width="60" height="42" rx="4" className={styles.monitor} />
          <polyline
            points="78,58 90,44 100,52 112,32 122,40"
            fill="none"
            stroke={accentColor}
            strokeWidth="2.5"
            opacity="0.85"
          />
          <circle cx="122" cy="40" r="2.5" fill={accentColor} />
        </svg>
      );
    case "designer":
      return (
        <svg {...common}>
          <rect x="80" y="18" width="40" height="58" rx="6" className={styles.monitor} />
          <rect x="86" y="26" width="28" height="34" rx="2" fill="#1a0a14" />
          <circle cx="94" cy="34" r="4" fill="#ffd23f" opacity="0.85" />
          <path d="M87 58 l10 -12 l6 6 l9 -10 v16 z" fill={accentColor} opacity="0.75" />
        </svg>
      );
    case "copywriter":
      return (
        <svg {...common}>
          <rect x="55" y="26" width="90" height="38" rx="8" className={styles.monitor} />
          <path d="M75 64 l-8 12 l16 -6 z" className={styles.monitor} />
          {[34, 42, 50].map((y, i) => (
            <line key={y} x1="65" y1={y} x2={130 - i * 14} y2={y} stroke={accentColor} strokeWidth="2.5" opacity="0.75" />
          ))}
        </svg>
      );
    default:
      return null;
  }
}
