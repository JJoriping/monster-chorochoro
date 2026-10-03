import { info, success } from "@daldalso/logger";
import { GAME_SERVER_PORT } from "@monster-chorochoro/common";
import { WebSocketServer } from "ws";

const port = Number(process.env.PORT ?? GAME_SERVER_PORT);
const wss = new WebSocketServer({ port });

wss.on("connection", (socket) => {
  info(`client connected (total: ${wss.clients.size})`);

  socket.on("close", () => {
    info(`client disconnected (total: ${wss.clients.size})`);
  });
});

success(`game server listening on ws://localhost:${port}`);
