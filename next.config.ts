import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['mongodb', 'better-sqlite3'],
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
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
