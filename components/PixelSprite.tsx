"use client";

import { useEffect, useState } from "react";
import styles from "./PixelSprite.module.css";

const ROWS_BASE = [
  "..HHHH..",
  ".HHHHHH.",
  ".HSSSSH.",
  ".SSEESS.",
  ".SSSSSS.",
  "GBBBBBBG",
  ".BBBBBB.",
  "ABBBBBBA",
  ".BBBBBB.",
  "..BBBB..",
  ".LLLLLL.",
];
const LEG_A = "LL....LL";
const LEG_B = ".LL..LL.";

export type SpritePalette = Record<string, string>;

function buildFrame(rows: string[], palette: SpritePalette) {
  const cols = rows[0].length;
  const cells: React.ReactNode[] = [];
  rows.forEach((row, ri) =>
    row.split("").forEach((ch, ci) => {
      cells.push(<i key={`${ri}-${ci}`} style={{ background: palette[ch] || "transparent" }} />);
    })
  );
  return (
    <div
      className={styles.pxgrid}
      style={{ gridTemplateColumns: `repeat(${cols}, 3px)`, gridTemplateRows: `repeat(${rows.length}, 3px)` }}
    >
      {cells}
    </div>
  );
}

type Props = {
  palette: SpritePalette;
  rowOverrides?: Record<number, string>;
  big?: boolean;
  flipped?: boolean;
};

export default function PixelSprite({ palette, rowOverrides, big, flipped }: Props) {
  const [frameA, setFrameA] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setFrameA((f) => !f), 420 + Math.random() * 160);
    return () => clearInterval(id);
  }, []);

  const rows = rowOverrides
    ? ROWS_BASE.map((r, i) => rowOverrides[i] ?? r)
    : ROWS_BASE;

  const frameRows = frameA ? [...rows, LEG_A] : [...rows, LEG_B];

  return (
    <div className={`${styles.wrap} ${big ? styles.big : ""}`}>
      <div className={styles.bounce}>
        <div className={`${styles.facewrap} ${flipped ? styles.flip : ""}`}>
          {buildFrame(frameRows, palette)}
        </div>
      </div>
      <div className={styles.shadow} />
    </div>
  );
}
