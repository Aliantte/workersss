import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Night Shift — The Trap",
  description: "A five-person crew running an Etsy digital-products shop while you sleep.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="scanlines" />
        <div className="vignette" />
        {children}
      </body>
    </html>
  );
}
