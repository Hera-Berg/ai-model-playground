/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produces a self-contained server bundle in .next/standalone,
  // which keeps the Docker runtime image small.
  output: "standalone",
  reactStrictMode: true,
  // Keep the Google Fonts <link> as-is and let the browser load it at runtime,
  // so neither the local nor the Docker build needs to reach the font CDN.
  optimizeFonts: false,
};

module.exports = nextConfig;
