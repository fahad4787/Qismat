import type { Metadata, Viewport } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Qismat admin",
  robots: { index: false, follow: false },
  icons: { icon: { url: "/favicon.svg", type: "image/svg+xml" } },
};

export const viewport: Viewport = { themeColor: "#f5f6f3" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Funnel+Display:wght@400;500&family=Funnel+Sans:wght@400;500;600&display=swap"
        />
      </head>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
