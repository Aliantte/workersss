import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Night Shift — Worker Bots",
  description: "Two automated workers, running on a schedule: one mines Etsy niche ideas, one paints on a timer.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
