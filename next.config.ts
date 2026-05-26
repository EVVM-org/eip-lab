import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // typedRoutes intentionally disabled: marginal value for a 4-route
  // static site, and it would require casting every Link href that
  // includes a hash anchor (e.g. "/#demos"). Easier to keep DX simple.
};

export default nextConfig;
