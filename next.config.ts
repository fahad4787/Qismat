import type { NextConfig } from "next";

// Static export: the whole site (marketing pages and the admin panel) builds
// to plain files in `out/`, so it can be hosted anywhere (Firebase Hosting,
// Vercel, Netlify, a CDN). The admin panel talks to Firebase from the browser.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  // Multiple root layouts (site and admin), so the 404 page is its own file.
  experimental: { globalNotFound: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
