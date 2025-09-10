import * as signalR from "@microsoft/signalr";
import { useEffect, useRef, useState } from "react";
import { Config } from "./config";
import type { ChatMessage } from "../types/chatMessage";

interface UseSignalROptions {
  onMessage?: (message: ChatMessage) => void;
}

export function useSignalR({ onMessage }: UseSignalROptions) {
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const onMessageRef = useRef(onMessage);
  const isConnectingRef = useRef(false);
  // 新增：重连回调
  const onReconnectedRef = useRef<(() => void) | undefined>();

  // Update onMessage ref when it changes
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    // Prevent multiple simultaneous connections
    if (connectionRef.current || isConnectingRef.current) {
      console.log("SignalR connection already exists or is being created, skipping...");
      return;
    }

    console.log("useSignalR: Creating new connection");
    isConnectingRef.current = true;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${Config.signalRUrl}`, {
        transport: signalR.HttpTransportType.WebSockets,
        withCredentials: true,
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: () => 3000, // 离线检测间隔缩短为 1 秒
      })
      .build();

    function registerHandlers(conn: signalR.HubConnection) {
      conn.off("ReceiveMessage"); // 先移除旧监听器
      conn.on("ReceiveMessage", (message: ChatMessage) => {
        console.log("Message from server:", message);
        onMessageRef.current?.(message);
      });
    }

    registerHandlers(connection);


    connection.onclose((error) => {
      console.warn("SignalR disconnected", error);
      setIsConnected(false);
      isConnectingRef.current = false;
    });

    // 新增：重连中也设置为断开状态
    connection.onreconnecting(() => {
      console.log("SignalR reconnecting...");
      setIsConnected(false);
    });

    connection.onreconnected(() => {
      console.log("SignalR reconnected");
      setIsConnected(true);
      registerHandlers(connection); // 断线重连后重新注册事件
      // 新增：重连后自动调用回调
      if (onReconnectedRef.current) {
        onReconnectedRef.current();
      }
    });

    connectionRef.current = connection;

    connection
      .start()
      .then(() => {
        console.log("SignalR connected");
        setIsConnected(true);
        isConnectingRef.current = false;
      })
      .catch((err) => {
        console.error("SignalR connection error:", err);
        // Handle negotiation abort gracefully
        if (err.name === 'AbortError' && err.message.includes('stopped during negotiation')) {
          console.log("Connection was aborted during negotiation (likely due to cleanup), this is expected in development mode");
        }
        setIsConnected(false);
        isConnectingRef.current = false;
      });

    return () => {
      if (connectionRef.current) {
        const currentConnection = connectionRef.current;
        console.log("SignalR cleanup: stopping connection");
        
        // Only stop if connection is not already disconnected
        if (currentConnection.state !== signalR.HubConnectionState.Disconnected) {
          currentConnection.stop().then(() => {
            console.log("SignalR cleanup completed");
          }).catch((error) => {
            // Ignore abort errors during cleanup as they're expected
            if (error.name !== 'AbortError') {
              console.error("Error during SignalR cleanup:", error);
            }
          });
        }
        
        connectionRef.current = null;
        setIsConnected(false);
        isConnectingRef.current = false;
      }
    };
  }, []);

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

  // 新增：返回注册重连回调的API
  return {
    sendMessage,
    isConnected,
    setOnReconnected: (cb: () => void) => {
      onReconnectedRef.current = cb;
    }
  };
}
