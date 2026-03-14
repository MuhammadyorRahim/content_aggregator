import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "pbs.twimg.com" },
      { hostname: "video.twimg.com" },
      { hostname: "abs.twimg.com" },
      { hostname: "*.twimg.com" },
      { hostname: "unavatar.io" },
      { hostname: "i.ytimg.com" },
      { hostname: "*.redd.it" },
      { hostname: "*.imgur.com" },
    ],
  },
};

export default nextConfig;
