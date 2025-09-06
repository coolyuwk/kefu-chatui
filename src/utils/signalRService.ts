import * as signalR from "@microsoft/signalr";
import { Config } from "./config";
import { useEffect, useRef } from "react";
import type { ChatMessage } from "../types/chatMessage";

interface UseSignalROptions {
  chatId?: string;
  area?: string;
  onMessage?: (message: ChatMessage) => void;
}

export function useSignalR({ chatId, area, onMessage }: UseSignalROptions) {
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  useEffect(() => {
    // 如果chatId为空，则不建立连接
    if (!chatId) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${Config.signalRUrl}`, {
        transport: signalR.HttpTransportType.WebSockets,
        withCredentials: true,
      })
      .withAutomaticReconnect()
      .build();

    connection.on("ReceiveMessage", (message: ChatMessage) => {
      console.log("Message from server:", message);
      onMessage?.(message);
      sendMessage("MsgRead", chatId);
    });

    connection
      .start()
      .then(() => {
        console.log("SignalR connected");
        // 连接成功后加入聊天室
        connection.invoke("JoinGroup", chatId, area || "");
      })
      .catch((err) => {
        console.error("SignalR connection error:", err);
      });

    connectionRef.current = connection;

    return () => {
      if (connectionRef.current) {
        connectionRef.current.stop().then(() => {
          console.log("SignalR disconnected");
        });
      }
    };
  }, [chatId, area]); // 只有当chatId或area变化时才重新连接

  const sendMessage = (method: string, ...args: any[]) => {
    if (
      connectionRef.current &&
      connectionRef.current.state === signalR.HubConnectionState.Connected
    ) {
      connectionRef.current
        .invoke(method, ...args)
        .catch((err) => console.error("SendMessage error:", err));
    } else {
      console.warn("Cannot send message: not connected");
    }
  };

  return { sendMessage };
}