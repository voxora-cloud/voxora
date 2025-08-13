"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { io, Socket } from "socket.io-client";
import { apiService } from "@/lib/api";

type EphemeralPayload = {
  conversationId: string;
  content: string;
  type?: string;
  metadata?: Record<string, unknown>;
};

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  sendEphemeralMessage: (payload: EphemeralPayload) => void;
}

const SocketContext = createContext<SocketContextValue | undefined>(undefined);

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used within SocketProvider");
  return ctx;
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const joinedRooms = useRef<Set<string>>(new Set());

  useEffect(() => {
    const token = apiService.getToken();
    if (!token) return;

    const s = io(
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3002",
      {
        auth: { token },
        autoConnect: true,
        timeout: 20000,
        forceNew: false,
        transports: ["websocket", "polling"],
      },
    );

    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));
    s.on("connect_error", () => setConnected(false));

    setSocket(s);

    const roomsSnapshot = new Set(joinedRooms.current);
    return () => {
      try {
        roomsSnapshot.forEach((room) =>
          s.emit("leave_conversation", room.replace("conversation:", "")),
        );
        s.disconnect();
      } catch (e) {
        console.warn("Socket cleanup error", e);
      }
    };
  }, []);

  const joinConversation = useCallback(
    (conversationId: string) => {
      if (!socket) return;
      const room = `conversation:${conversationId}`;
      if (!joinedRooms.current.has(room)) {
        socket.emit("join_conversation", conversationId);
        joinedRooms.current.add(room);
      }
    },
    [socket],
  );

  const leaveConversation = useCallback(
    (conversationId: string) => {
      if (!socket) return;
      const room = `conversation:${conversationId}`;
      if (joinedRooms.current.has(room)) {
        socket.emit("leave_conversation", conversationId);
        joinedRooms.current.delete(room);
      }
    },
    [socket],
  );

  const sendEphemeralMessage = useCallback(
    (payload: EphemeralPayload) => {
      if (!socket) return;
      socket.emit("send_message_ephemeral", payload);
    },
    [socket],
  );

  const value = useMemo(
    () => ({
      socket,
      connected,
      joinConversation,
      leaveConversation,
      sendEphemeralMessage,
    }),
    [
      socket,
      connected,
      joinConversation,
      leaveConversation,
      sendEphemeralMessage,
    ],
  );

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};
