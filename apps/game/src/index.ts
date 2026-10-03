import { GAME_SERVER_PORT } from "@monster-chorochoro/common";
import { WebSocketServer } from "ws";

const port = Number(process.env.PORT ?? GAME_SERVER_PORT);
const wss = new WebSocketServer({ port });

wss.on("connection", (socket) => {
  console.log(`client connected (total: ${wss.clients.size})`);

  socket.on("close", () => {
    console.log(`client disconnected (total: ${wss.clients.size})`);
  });
});

console.log(`game server listening on ws://localhost:${port}`);
