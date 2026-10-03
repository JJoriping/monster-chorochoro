import type { Webpack } from "@daldalso/i18n/types";

declare global {
  // webpack이 런타임에 주입하는 값으로, 렉시콘의 HMR 감지에 쓰인다
  const __webpack_exports__: object;
  const __webpack_require__: Webpack.Require;
}
