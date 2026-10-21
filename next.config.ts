import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["postgres", "bcryptjs"],
  experimental: {
    // Keep visited and prefetched pages in the browser for 30 seconds, so going back to a page
    // (or clicking a menu link that was just hovered) shows it at once. Saving anything calls
    // revalidatePath, which clears this cache, so the user's own changes always show up.
    staleTimes: {
      dynamic: 30,
      static: 30,
    },
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
