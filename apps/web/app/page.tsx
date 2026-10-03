import type { NextTypedPage } from "@daldalso/next-typed-route";
import { GAME_SERVER_PORT, MAX_PLAYERS_PER_ROOM } from "@monster-chorochoro/common";

const Home: NextTypedPage<"/"> = () => {
  return (
    <main>
      <h1>Monster Chorochoro</h1>
      <p>Game server port: {GAME_SERVER_PORT}</p>
      <p>Max players per room: {MAX_PLAYERS_PER_ROOM}</p>
    </main>
  );
};
export default Home;
