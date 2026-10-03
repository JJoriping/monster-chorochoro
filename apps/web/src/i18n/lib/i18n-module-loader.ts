import I18n from "@daldalso/i18n";
import { warning } from "@daldalso/logger";
import config from "../../../i18n.config.cjs";

I18n.moduleLoaderBuilder = (locale) => {
  if (!config.locales.includes(locale)) {
    warning(`Unknown locale: ${locale}`);
    return async () => null as never;
  }
  return async (prefix) =>
    Object.assign(await import(`../${locale}/${prefix}.${locale}`), {
      href: `../${locale}/${prefix}.${locale}`,
    });
};
