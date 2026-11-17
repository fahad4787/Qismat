import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Chrome";
import { Footer } from "@/components/Footer";
import { SiteHead, SiteScripts } from "@/components/SiteHead";

// Built to out/404.html. Hostinger serves it for any missing URL (see public/.htaccess).
export const metadata: Metadata = {
  title: "Page not found · Qismat",
  robots: { index: false },
};

export default function GlobalNotFound() {
  return (
    <html lang="en" data-type="software" data-radius="round" data-buttons="tonal" data-motion="" suppressHydrationWarning>
      <SiteHead />
      <body suppressHydrationWarning>
        <Nav base="/" />
        <main id="top" className="legal notfound">
          <div className="wrap">
            <p className="notfound__code">404</p>
            <h1>This page is not here.</h1>
            <p>The link may be old, or the address has a typo. The draws are still on.</p>
            <p className="notfound__actions">
              <Link className="btn btn--primary" href="/">
                Back to home
              </Link>
              <Link className="btn btn--secondary" href="/#faq">
                Read the questions
              </Link>
            </p>
          </div>
        </main>
        <Footer base="/" />
        <SiteScripts />
      </body>
    </html>
  );
}
