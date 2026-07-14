import { Server } from "socket.io";

class SocketService {
  private io: Server | null = null;

  public init(ioInstance: Server) {
    this.io = ioInstance;
  }

  public getIO(): Server {
    if (!this.io) {
      throw new Error("SocketService has not been initialized yet.");
    }
    return this.io;
  }

  public emitToConversation(
    conversationId: string,
    event: string,
    data: any,
  ): void {
    this.io?.to(`conversation:${conversationId}`).emit(event, data);
  }

  public emitToOrg(orgId: string, event: string, data: any): void {
    this.io?.to(`org:${orgId}`).emit(event, data);
  }

  public async emitToUser(
    userId: string,
    event: string,
    data: any,
  ): Promise<void> {
    this.io?.to(`user:${userId}`).emit(event, data);
  }

  public emitToAllUsers(event: string, data: any): void {
    this.io?.emit(event, data);
  }
}

export const socketService = new SocketService();