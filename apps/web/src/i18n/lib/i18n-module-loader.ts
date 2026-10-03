import I18n from "@daldalso/i18n";
import { warning } from "@daldalso/logger";
import config from "../../../i18n.config.cjs";

I18n.moduleLoaderBuilder = (locale) => {
  if (!config.locales.includes(locale)) {
    warning(`Unknown locale: ${locale}`);
    return async () => null as never;
  }
  // Turbopack 대응:
  // - 상대 경로 템플릿은 후보 키가 "..//ko/..."처럼 만들어져 찾지 못하므로 별칭 경로를 쓴다
  // - 모듈 네임스페이스 객체는 확장할 수 없으므로 Object.assign 대신 복사해서 href를 붙인다
  return async (prefix) => ({
    ...(await import(`@/i18n/${locale}/${prefix}.${locale}`)),
    href: `../${locale}/${prefix}.${locale}`,
  });
};
