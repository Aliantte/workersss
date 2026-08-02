"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./NavTabs.module.css";

const TABS = [
  { href: "/", label: "Ecosystem" },
  { href: "/research", label: "Research Desk" },
  { href: "/studio", label: "Studio" },
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
