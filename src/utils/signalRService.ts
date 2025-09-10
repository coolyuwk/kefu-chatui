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

  useEffect(() => {
    // Prevent duplicate connections during React StrictMode double-invocation
    if (connectionRef.current || isConnectingRef.current) {
      console.log("SignalR connection already exists or is being created, skipping");
      return;
    }

    console.log("useSignalR - creating new connection");
    isConnectingRef.current = true;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${Config.signalRUrl}`, {
        transport: signalR.HttpTransportType.WebSockets,
        withCredentials: true,
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: () => 3000, // 可自定义重连间隔
      })
      .build();

    connection.on("ReceiveMessage", (message: ChatMessage) => {
      console.log("Message from server:", message);
      onMessageRef.current?.(message);
    });

    connection.onclose((error) => {
      console.warn("SignalR disconnected", error);
      setIsConnected(false);
      isConnectingRef.current = false;
    });

    connection.onreconnected(() => {
      console.log("SignalR reconnected");
      setIsConnected(true);
    });

    connection
      .start()
      .then(() => {
        console.log("SignalR connected");
        setIsConnected(true);
        isConnectingRef.current = false;
      })
      .catch((err) => {
        console.error("SignalR connection error:", err);
        setIsConnected(false);
        isConnectingRef.current = false;
      });

    connectionRef.current = connection;

    return () => {
      if (connectionRef.current) {
        console.log("SignalR cleanup - stopping connection");
        connectionRef.current.stop().then(() => {
          console.log("SignalR disconnected in cleanup");
          setIsConnected(false);
          connectionRef.current = null;
          isConnectingRef.current = false;
        });
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

  return { sendMessage, isConnected };
}
