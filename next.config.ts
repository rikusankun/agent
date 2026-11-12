import type { NextConfig } from "next";
import { withEve } from "eve/next";

const nextConfig: NextConfig = {
  // Allow HMR and dev assets when the app is opened via its LAN IP.
  allowedDevOrigins: ["192.168.90.61"],
  // Skip repeating codegen-time typechecking on every deployment build.
  typescript: { ignoreBuildErrors: true },
};

export default withEve(nextConfig);
