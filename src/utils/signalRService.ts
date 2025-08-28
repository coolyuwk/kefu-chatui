import * as signalR from "@microsoft/signalr";
import { Config } from "./config";

export const signalRService = {
  // SignalR连接函数
  connectSignalR: (chatId: string, area: string | null) => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${Config.signalRUrl}`, {
        transport: signalR.HttpTransportType.WebSockets,
        withCredentials: true
      })
      .withAutomaticReconnect()
      .build();

    connection.on("ReceiveMessage", (user: string, message: string) => {
      console.log("Message from server:", user, message);
    });

    connection
      .start()
      .then(() => {
        console.log("SignalR connected");
      })
      .catch((err) => {
        console.error("SignalR connection error:", err);
      });
  },
};
