import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  platform: "node",
  deps: {
    // 워크스페이스 패키지는 TS 소스 그대로 공개되므로 번들에 포함한다
    alwaysBundle: [/^@monster-chorochoro\//],
  },
});
