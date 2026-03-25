import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Opt out of Turbopack bundling for pdf-parse to preserve its internal worker require paths
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist', 'canvas', '@napi-rs/canvas'],
};

export default nextConfig;
