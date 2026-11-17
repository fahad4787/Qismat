import type { Metadata, Viewport } from "next";
import { SiteHead, SiteScripts } from "@/components/SiteHead";
import { SITE_URL } from "@/lib/site";

const TITLE = "Qismat: free prize draws in Pakistan";
const DESCRIPTION =
  "Watch a short ad, get a ticket and enter free draws for a motorbike, a smartphone or mobile load. No payment, ever. Get the app for Android.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: "%s · Qismat" },
  description: DESCRIPTION,
  applicationName: "Qismat",
  keywords: [
    "free prize draw Pakistan",
    "win motorbike Pakistan",
    "free mobile load",
    "lucky draw app",
    "Qismat app",
  ],
  // Turn on once the real domain is live: alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Qismat",
    title: TITLE,
    description: "Watch a short ad, get a ticket, enter free draws. No payment, ever.",
    images: [{ url: "/share.jpg", width: 1200, height: 630, alt: "Qismat, free prize draws" }],
    locale: "en_PK",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/share.jpg"] },
  icons: { icon: { url: "/favicon.svg", type: "image/svg+xml" } },
  other: { "site-kind": "software", "page-type": "software" },
};

export const viewport: Viewport = {
  themeColor: "#04100b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-type="software"
      data-radius="round"
      data-buttons="tonal"
      data-motion=""
      suppressHydrationWarning
    >
      <SiteHead />
      <body suppressHydrationWarning>
        {children}
        <SiteScripts />
      </body>
    </html>
  );
}
