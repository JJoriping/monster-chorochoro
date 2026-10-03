import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  platform: "node",
  deps: {
    // ワークスペースの TS ソースパッケージはバンドルに含める
    alwaysBundle: [/^@monster-chorochoro\//],
  },
});
