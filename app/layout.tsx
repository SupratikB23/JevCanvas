import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JevCanvas — Decide. Generate. Render.",
  description: "Jev decides structure, diffusion creates visuals, json-render renders.",
};

export default function RootLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">{children}</body>
    </html>
  );
}
