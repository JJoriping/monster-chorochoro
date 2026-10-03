import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // packages/common は TS ソースのまま公開しているので Next 側でトランスパイルする
  transpilePackages: ["@monster-chorochoro/common"],
};

export default nextConfig;
