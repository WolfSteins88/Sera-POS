import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The desktop build (npm run desktop:build) bundles a self-contained server for the Tauri app.
  ...(process.env.NEXT_OUTPUT === "standalone" ? { output: "standalone" as const } : {}),
  // process.cwd() file reads make the tracer pull in the whole repo; keep the desktop build output out of it.
  outputFileTracingExcludes: {
    "*": ["src-tauri/**", "desktop/**", "design-system/**", ".git/**"],
  },
  serverExternalPackages: ["postgres", "bcryptjs"],
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
