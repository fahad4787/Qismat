import Script from "next/script";

const PALETTE = `:root {
  --p-bg: #04100b; --p-surface: #0a1d15; --p-ink: #fff7e0; --p-muted: #8dae9e;
  --p-accent: #f7c548; --p-accent-ink: #04100b; --p-action: #f7c548; --p-action-ink: #04100b;
  --p-inv-bg: #fff7e0; --p-inv-surface: #eae4cf; --p-inv-ink: #04100b; --p-inv-muted: #565d52;
  --p-inv-accent: #04100b; --p-inv-accent-ink: #fff7e0; --p-inv-action: #04100b; --p-inv-action-ink: #fff7e0;
  --font-display: "Funnel Display", system-ui, sans-serif; --font-text: "Funnel Sans", system-ui, sans-serif;
  --font-mono: "DM Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
  --display-weight: 400; --display-tracking: -0.03em; --display-tracking-xl: -0.04em; --ly-scale: 0.98;
}`;

const KIT_CSS = [
  "/assets/system.css",
  "/assets/ui/cards.css",
  "/assets/motion/motion.css",
  "/assets/backgrounds/backgrounds.css",
  "/assets/layout/layout.css",
  "/assets/icons/icon.css",
];

/** Fonts, the kit's stylesheets and boot scripts, shared by every site page and the 404 page. */
export function SiteHead() {
  return (
    <head>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Funnel+Display:wght@300..800&family=Funnel+Sans:ital,wght@0,300..800;1,300..800&display=swap"
      />
      {KIT_CSS.map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
      <style dangerouslySetInnerHTML={{ __html: PALETTE }} />
      <link rel="stylesheet" href="/assets/ui/base.css" />
      <link rel="stylesheet" href="/site.css" />
      <script
        dangerouslySetInnerHTML={{
          __html:
            "document.documentElement.classList.add('m-enter');setTimeout(()=>document.documentElement.classList.add('m-enter-done'),700);document.documentElement.classList.add('mo-js');if(!/HeadlessChrome/.test(navigator.userAgent))document.documentElement.classList.add('sx');setTimeout(()=>document.documentElement.classList.add('mo-safe'),2500)",
        }}
      />
      <script src="/assets/backgrounds/backgrounds.js" />
      <link rel="modulepreload" href="/assets/moments/moments.js" />
      <link rel="modulepreload" href="/assets/moments/lib.js" />
    </head>
  );
}

export function SiteScripts() {
  return (
    <>
      {/* The kit's behaviour (nav sheet, motion, moments) runs after React has
          taken over the page, so its DOM changes never fight hydration. */}
      <Script type="module" src="/assets/system.js" strategy="afterInteractive" />
      <Script type="module" src="/assets/motion/motion.js" strategy="afterInteractive" />
      <Script type="module" src="/assets/layout/layout.js" strategy="afterInteractive" />
    </>
  );
}
