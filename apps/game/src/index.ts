import { info, success, warning } from "@daldalso/logger";
import { GAME_SERVER_PORT } from "@monster-chorochoro/common";
import { WebSocketServer } from "ws";
import { connect, disconnect, handleMessage } from "./lobby";
import { parseClientMessage } from "./validation";

const port = Number(process.env.PORT ?? GAME_SERVER_PORT);
// 지금 주고받는 메시지는 모두 작으므로 큰 페이로드는 받지 않는다
const wss = new WebSocketServer({ port, maxPayload: 4096 });

wss.on("connection", (socket) => {
  const user = connect(socket);
  info(`client #${user.id} connected (total: ${wss.clients.size})`);

  socket.on("message", (data, isBinary) => {
    if (isBinary) return;
    const message = parseClientMessage(data.toString());
    if (!message) {
      warning(`client #${user.id} sent an invalid message`);
      return;
    }
    handleMessage(user, message);
  });

  socket.on("close", () => {
    disconnect(user);
    info(`client #${user.id} disconnected (total: ${wss.clients.size})`);
  });
});

success(`game server listening on ws://localhost:${port}`);
