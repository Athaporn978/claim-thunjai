import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*.xlsx",
        destination: "/404",
        permanent: false,
      },
      {
        source: "/:path*.xls",
        destination: "/404",
        permanent: false,
      },
      {
        source: "/:path*.csv",
        destination: "/404",
        permanent: false,
      },
      {
        source: "/:path*.db",
        destination: "/404",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;

