// The real Next.js config. next.config.mjs only re-exports this file, and
// scripts/prebuild.mjs rewrites next.config.mjs before every build, because
// Hostinger's Next.js preset swaps in its own config without output: "export".

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: the site and the admin panel build to plain files in `out/`.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  // Multiple root layouts (site and admin), so the 404 page is its own file.
  experimental: { globalNotFound: true },
};

export default nextConfig;
