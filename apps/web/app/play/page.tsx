import type { NextTypedPage } from "@daldalso/next-typed-route";
import PlayProvider from "./_components/play-provider";
import PlayView from "./_components/play-view";

const Play: NextTypedPage<"/play"> = () => {
  return (
    <PlayProvider>
      <PlayView />
    </PlayProvider>
  );
};
export default Play;
