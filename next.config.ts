import type { NextConfig } from "next";

const isTauri = process.env.TAURI_BUILD === "true";

const nextConfig: NextConfig = {
  output: isTauri ? "export" : undefined,
  images: {
    unoptimized: isTauri ? true : undefined,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        sharp$: false,
        "onnxruntime-node$": false,
      };
    }
    return config;
  },
  turbopack: {
    resolveAlias: {
      sharp: "false",
      "onnxruntime-node": "false",
    },
  },
};

export default nextConfig;
