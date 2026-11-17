// Plain JS (not .ts) so loading it needs no compiler. Hostinger's build
// server cannot run Next's native SWC, so it builds with webpack + WASM.

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
