import { Config } from "./config";
import type { ChatHistoryResponse } from "../types/chatMessage";

// 通用API请求类
class ApiClient {
  async get(path: string): Promise<string> {
    const res = await fetch(`${Config.baseURL}${path}`);
    if (!res.ok) throw new Error(`GET ${path} failed`);
    return res.text();
  }

  async post(path: string, data: object): Promise<string> {
    const res = await fetch(`${Config.baseURL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`POST ${path} failed`);
    return res.text();
  }
}

export const apiClient = new ApiClient();

export const API = {
  chat: {
    // 获取对话历史
    getHistory: async (chatId: string, startTime: string): Promise<ChatHistoryResponse> => {
      const response = await apiClient.get(
        `/kefu/getMsgList?groupId=${chatId}&startTime=${startTime}`
      );
      return JSON.parse(response);
    },

    // 获取当前群组ID
    getChatid: (uid: string) => {
      return apiClient.get(`/kefu/getChatId/${uid}`);
    },

    // 创建群组
    createGroup: (
      chatId: string,
      username: string | null,
      uid: string,
      area: string | null
    ) => {
      return apiClient.post(`/kefu/createGroup`, {
        groupId: chatId,
        userId: uid,
        userName: username,
        area: area,
      });
    },
  },
};