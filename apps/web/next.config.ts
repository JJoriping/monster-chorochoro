import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // packages/common은 TS 소스 그대로 공개되므로 Next에서 트랜스파일한다
  transpilePackages: ["@monster-chorochoro/common"],
};

export default nextConfig;
