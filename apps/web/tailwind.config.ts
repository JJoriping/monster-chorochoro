import buildTailwindBaseTransformer from "@daldalso/tailwind-base/transformer";
import daldalsoTailwindPlugin from "@daldalso/tailwind-plugin";
import daldalsoTailwindPluginPostprocessor from "@daldalso/tailwind-plugin/postprocessor";
import type { Config } from "tailwindcss";
import { tailwindTheme } from "./src/utilities/tailwind";

export default {
  content: {
    files: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "!**/tailwind-base.ts"],
    transform: buildTailwindBaseTransformer([daldalsoTailwindPluginPostprocessor]),
  },
  plugins: [daldalsoTailwindPlugin],
  theme: {
    ...tailwindTheme,
  },
} satisfies Config;
