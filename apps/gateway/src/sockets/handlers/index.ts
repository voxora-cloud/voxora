import { handleWidgetMessage } from "./widget.handler";
import { handleAgentMessage } from "./agent.handler";
import { registerRoomHandlers } from "./common";

export function registerConnectionHandlers({ socket, io }: { socket: any; io: any }) {
  // Register shared room handlers
  registerRoomHandlers(socket);

  if (socket.data.user.isWidget) {
    handleWidgetMessage({ socket, io });
  } else {
    handleAgentMessage({ socket, io });
  }
}