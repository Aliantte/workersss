"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./NavTabs.module.css";

const TABS = [
  { href: "/", label: "The Trap" },
  { href: "/review", label: "Review Queue" },
  { href: "/library", label: "Library" },
  { href: "/meeting", label: "Team Meeting" },
];

export default function NavTabs() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav}>
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`${styles.tab} ${pathname === tab.href ? styles.active : ""}`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
