import React, { useEffect, useCallback, useRef } from "react";
import type { ChatMessage } from "../types/chatMessage";
import { Config } from "../utils/config";
import { API } from "../utils/api";
import { useSignalR } from "../utils/signalRService";
import "@chatui/core/dist/index.css";

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

interface ChatContainerProps {
  uid: string;
  username: string;
  area: string;
}

const ChatContainer: React.FC<ChatContainerProps> = ({
  uid,
  username,
  area,
}) => {
  const { messages, appendMsg } = useMessages([]);
  const appendMsgRef = useRef(appendMsg);
  const messagesRef = useRef(messages);
  const chatIdRef = useRef("");
  const groupIsCloseRef = useRef(false);
  const uidRef = useRef(uid);
  const areaRef = useRef(area);
  const userNameRef = useRef(username);

  // 点击预设问题时，发送消息给服务器
  function answer(questionId: string) {
    if (groupIsCloseRef.current) {
      return;
    }
    sendMessage("QuestionAsync", questionId, chatIdRef.current);
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
      messagesRef.current.length > 1 &&
        shouldShowTime(
          messagesRef.current[messagesRef.current.length - 1].createdAt || 0,
          Date.parse(item.creationTime)
        ),
    });

    // 处理文本部分
    if (item.msg) {
      appendMsgRef.current({
        ...createBaseMessage(),
        type: "html",
        content: { html: item.showMsg === "" ? item.msg : item.showMsg },
      });
    }

    if (item.msgModel) {
      // 处理图片部分
      if (item.msgModel.imageModels) {
        item.msgModel.imageModels.forEach((imgItem) => {
          appendMsgRef.current({
            ...createBaseMessage(),
            type: "image",
            content: { src: imgItem.url },
          });
        });
      }

      // 处理预设问题部分
      if (item.msgModel.questionList) {
        console.log(`预设问题:`, item.msgModel.questionList);
        appendMsgRef.current({
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

  // 使用SignalR
  const { sendMessage, isConnected } = useSignalR({
    onMessage: addMessage,
  });
  const sendMessageRef = useRef(sendMessage);
  const initRef = useRef(false);
  // 在组件首次加载时运行初始化函数
  useEffect(() => {
    if (isConnected && chatIdRef.current) {
      // 加入聊天室
      console.log("加入聊天室:", chatIdRef.current);
      sendMessageRef.current("JoinGroup", chatIdRef.current, areaRef.current || "");
    } else {
      console.log("连接断开，等待重连中...");
    }

    if (initRef.current) return;
    initRef.current = true;
    // 获取当前用户对应的聊天组ID
    API.chat.getChatid(uidRef.current).then((res) => {
      chatIdRef.current = res;

      // 按需创建新的聊天组
      API.chat.createGroup(chatIdRef.current, userNameRef.current, uidRef.current, areaRef.current).then(() => {
        // 获取历史消息
        API.chat.getHistory(chatIdRef.current, "").then((res) => {
          // 添加历史消息到聊天界面
          console.log("历史消息:", res);
          res.list.forEach((item: ChatMessage) => {
            addMessage(item);
          });
        });
      });
    });
  }, [isConnected, chatIdRef, addMessage]);

  // 发送消息
  function handleSend(type: string, val: string) {
    sendMessage(
      "SendMessageToGroup",
      chatIdRef.current,
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
};

export default ChatContainer;