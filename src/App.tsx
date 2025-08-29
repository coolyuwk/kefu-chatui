import React, { useEffect, useState, useCallback } from "react";
import type { UserModel } from "./types/userModel";
import { Config } from "./utils/config";
import type { ChatMessage } from "./types/chatMessage";
import { API } from "./utils/api";
import { useSignalR } from "./utils/signalRService";
import "./App.css";
// 引入组件
import Chat, {
  Bubble,
  RichText,
  MessageProps,
  useMessages,
} from "@chatui/core";
// 引入样式
import "@chatui/core/dist/index.css";

function App() {
  const { messages, appendMsg } = useMessages([]);
  const [user, setUser] = useState<UserModel>({
    username: "",
    uid: "",
    area: "",
    chatid: "",
  });

  const addMessage = useCallback((item: ChatMessage) => {
    console.log(`添加消息:`, Config.kefuAvatar);
    if (item.msg !== "") {
      appendMsg({
        type: "html",
        content: { html: item.showMsg },
        position: item.isKefu ? "left" : "right",
        user: {
          avatar: item.isKefu ? Config.kefuAvatar : Config.userAvatar,
        },
        createdAt: Date.parse(item.creationTime),
        hasTime:
          messages.length > 1 &&
          shouldShowTime(
            messages[messages.length - 1].createdAt || 0,
            Date.parse(item.creationTime)
          ),
      });
    }
    if (item.msgModel && item.msgModel.imageModels) {
      item.msgModel.imageModels.forEach((imgItem) => {
        appendMsg({
          type: "image",
          content: { src: imgItem.url },
          position: item.isKefu ? "left" : "right",
          createdAt: Date.parse(item.creationTime),
          user: {
            avatar: item.isKefu ? Config.kefuAvatar : Config.userAvatar,
          },
          hasTime:
            messages.length > 1 &&
            shouldShowTime(
              messages[messages.length - 1].createdAt || 0,
              Date.parse(item.creationTime)
            ),
        });
      });
    }
  }, []);
  function shouldShowTime(prevTime: number, currentTime: number) {
    return currentTime - prevTime > 10 * 60 * 1000; // 超过10分钟才显示时间
  }
  // 处理收到的消息
  const handleMessage = useCallback((message: ChatMessage) => {
    console.log(`收到消息:`, message);
    // 添加收到的消息到聊天界面
    addMessage(message);
    // 发送消息已读
    sendMessage("MsgRead", user.chatid);

    // CloseGroup
  }, []);

  const { sendMessage } = useSignalR({
    chatId: user.chatid,
    area: user.area,
    onMessage: handleMessage,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const username = params.get("username") || "";
    const uid = params.get("uid") || "";
    // 获取系统语言并设置 area
    const area = navigator.language || navigator.languages[0] || "";

    setUser((prevUser) => ({
      ...prevUser,
      username,
      uid,
      area,
    }));

    // 获取当前用户对应的聊天组ID
    API.chat.getChatid(uid).then((res) => {
      // 按需创建新的聊天组
      API.chat
        .createGroup(res, username, uid, navigator.language || "unknown")
        .then(() => {
          // 更新chatid状态
          setUser((prevUser) => ({
            ...prevUser,
            chatid: res,
          }));

          // 获取历史消息
          API.chat.getHistory(res, "").then((res) => {
            // 添加历史消息到聊天界面
            console.log("历史消息:", res);
            res.list.forEach((item: ChatMessage) => {
              addMessage(item);
            });
          });
        });
    });
  }, []);

  function handleSend(type: string, val: string) {
    sendMessage(
      "SendMessageToGroup",
      user.chatid,
      val,
      user.uid,
      user.username,
      ""
    );
  }

  function renderMessageContent(msg: MessageProps) {
    const { type, content } = msg;
    // 处理HTML类型消息
    if (type === "html") {
      return (
        <Bubble>
          <RichText content={content.html} />
        </Bubble>
      );
    }
    if (type === "image") {
      return (
        <Bubble type="image">
          <img src={content.src} alt="" />
        </Bubble>
      );
    }
    // 默认处理文本类型消息
    return <Bubble content={content.text} />;
  }

  return (
    <Chat
      navbar={{ title: "智能助理" }}
      messages={messages}
      renderMessageContent={renderMessageContent}
      onSend={handleSend}
    />
  );
}

export default App;
