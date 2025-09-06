import React, { useEffect, useState, useCallback, useId } from "react";
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
  Card,
  CardContent,
  List,
  ListItem,
} from "@chatui/core";
// 引入样式
import "@chatui/core/dist/index.css";

function App() {
  const themeJson = Config.theme;
  console.log(`theme:`, themeJson);
  const theme = JSON.parse(decodeURIComponent(themeJson));
  const { messages, appendMsg } = useMessages([]);
  const [chatId, setChatId] = useState("");
  const params = new URLSearchParams(window.location.search);
  const username = params.get("username") || "";
  const uid = params.get("uid") || "";
  // 获取系统语言并设置 area
  const area = navigator.language || navigator.languages[0] || "";
  const [groupIsClose, setGroupIsClose] = useState(false);

  // 点击预设问题时，发送消息给服务器
  function answer(questionId: string) {
    if (groupIsClose) {
      return;
    }
    console.log(`点击预设问题时，发送消息给服务器:`, questionId, chatId);
    sendMessage("QuestionAsync", questionId, chatId);
  }

  // 收到消息时，添加到聊天界面
  const addMessage = useCallback((item: ChatMessage) => {
    console.log(`收到消息时，添加到聊天界面:`, item);
    // 创建基础消息对象，包含所有消息的公共属性
    const createBaseMessage = () => ({
      position: item.isKefu ? ("left" as const) : ("right" as const),
      user: {
        avatar: item.isKefu ? Config.kefuAvatar : Config.userAvatar,
        name: item.userName,
      },
      createdAt: Date.parse(item.creationTime),
      hasTime:
        messages.length > 1 &&
        shouldShowTime(
          messages[messages.length - 1].createdAt || 0,
          Date.parse(item.creationTime)
        ),
    });

    // 处理文本部分
    if (item.msg) {
      appendMsg({
        ...createBaseMessage(),
        type: "html",
        content: { html: item.showMsg === "" ? item.msg : item.showMsg },
      });
    }

    if (item.msgModel) {
      // 处理图片部分
      if (item.msgModel.imageModels) {
        item.msgModel.imageModels.forEach((imgItem) => {
          appendMsg({
            ...createBaseMessage(),
            type: "image",
            content: { src: imgItem.url },
          });
        });
      }

      // 处理预设问题部分
      if (item.msgModel.questionList) {
        console.log(`预设问题:`, item.msgModel.questionList);
        appendMsg({
          ...createBaseMessage(),
          type: "question",
          content: { list: item.msgModel.questionList },
        });
      }
    }
  }, []);

  // 判断是否显示时间
  function shouldShowTime(prevTime: number, currentTime: number) {
    return currentTime - prevTime > 10 * 60 * 1000; // 超过10分钟才显示时间
  }
  // 处理收到的消息
  const handleMessage = useCallback((message: ChatMessage) => {
    console.log(`收到消息:`, message);
    // 添加收到的消息到聊天界面
    addMessage(message);
    // 发送消息已读
    sendMessage("MsgRead", chatId);

    // CloseGroup
  }, []);

  // 使用SignalR
  const { sendMessage } = useSignalR({
    chatId: chatId,
    area: area,
    onMessage: handleMessage,
  });

  // 初始化
  useEffect(() => {
    if (!uid) {
      console.error("缺少 uid 参数，无法初始化用户信息");
      return;
    }

    // 获取当前用户对应的聊天组ID
    API.chat.getChatid(uid).then((res) => {
      // 按需创建新的聊天组
      API.chat
        .createGroup(res, username, uid, navigator.language || "unknown")
        .then(() => {
          // 更新chatid状态
          setChatId(res);

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

  // 发送消息
  function handleSend(type: string, val: string) {
    sendMessage(
      "SendMessageToGroup",
      chatId,
      val,
      uid,
      username,
      ""
    );
  }

  // 自定义消息渲染
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
    if (type === "question") {
      return (
        <Card>
          <CardContent>
            <List variant="buttons">
              {content.list.map((item: any, index: number) => (
                <ListItem
                  key={index}
                  content={item.question}
                  as="button"
                  ellipsis
                  onClick={() => answer(item.questionId)}
                />
              ))}
            </List>
          </CardContent>
        </Card>
      );
    }
    // 默认处理文本类型消息
    return <Bubble content={content.text} />;
  }

  return (
    <Chat
      isX
      locale={area}
      navbar={{ title: "智能助理" }}
      messages={messages}
      wideBreakpoint="800px"
      renderMessageContent={renderMessageContent}
      onSend={handleSend}
      toolbar={[{ type: "image", icon: "image", title: "图片" }]}
      onImageSend={() => Promise.resolve()}
    />
  );
}

export default App;
