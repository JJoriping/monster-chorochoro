import { GAME_SERVER_PORT, MAX_PLAYERS_PER_ROOM } from "@monster-chorochoro/common";

export default function Home() {
  return (
    <main>
      <h1>Monster Chorochoro</h1>
      <p>Game server port: {GAME_SERVER_PORT}</p>
      <p>Max players per room: {MAX_PLAYERS_PER_ROOM}</p>
    </main>
  );
}
