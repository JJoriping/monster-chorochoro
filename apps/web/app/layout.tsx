import type { NextTypedLayout } from "@daldalso/next-typed-route";
import type { Metadata } from "next";
import I18nInitializer from "@/i18n/lib/i18n-initializer";
import "./globals.css";
import TailwindBaseInitializer from "@/tailwind-base";

export const metadata: Metadata = {
  title: "Monster Chorochoro",
  description: "Crazy Arcade風のウェブオンラインゲーム",
};

const Layout: NextTypedLayout<"/"> = ({ children }) => {
  return (
    <html lang="ko">
      <body>
        <I18nInitializer locale="ko" />
        <TailwindBaseInitializer />
        {children}
      </body>
    </html>
  );
};
export default Layout;
