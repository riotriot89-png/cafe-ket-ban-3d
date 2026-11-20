import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Game realtime: tắt cacheComponents để API luôn dynamic (không cache). */
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
