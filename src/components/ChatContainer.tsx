import React, { useEffect, useCallback, useRef, useState } from "react";
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
  SystemMessage,
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
  const { messages, appendMsg, prependMsgs } = useMessages([]);
  const appendMsgRef = useRef(appendMsg);
  const messagesRef = useRef(messages);
  const [chatId, setChatId] = useState("");
  const [groupIsClose, setGroupIsClose] = useState(false); 
  // 用于触发重新渲染
  const uidRef = useRef(uid);
  const areaRef = useRef(area);
  const userNameRef = useRef(username);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 点击预设问题时，发送消息给服务器
  function answer(questionId: string) {
    if (groupIsClose) {
      return;
    }
    sendMessage("QuestionAsync", questionId, chatId);
  }

  // 公共消息对象构造函数
  const createBaseMessage = useCallback(
    (item: ChatMessage): MessageProps => {
      return {
        _id: `${item.id}`,
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
        type: "text",
        content: { text: item.msg || "" },
      };
    },
    [messagesRef]
  );

  // 消息类型转换统一处理
  const convertToMessageProps = useCallback(
    (item: ChatMessage): MessageProps[] => {
      const base = createBaseMessage(item);
      if (item.msg) {
        return [
          {
            ...base,
            type: "html",
            content: { html: item.showMsg === "" ? item.msg : item.showMsg },
          },
        ];
      }
      if (item.msgModel?.imageModels) {
        return item.msgModel.imageModels.map((imgItem, imgIdx) => ({
          ...base,
          _id: `${item.creationTime}-img-${imgIdx}`,
          type: "image",
          content: { src: imgItem.url },
        }));
      }
      if (item.msgModel?.questionList) {
        return [
          {
            ...base,
            type: "question",
            content: { list: item.msgModel.questionList },
          },
        ];
      }
      return [base];
    },
    [createBaseMessage]
  );

  // 初始化消息列表，批量转换并插入
  const addMessages = useCallback(
    (items: ChatMessage[]) => {
      const newMessages: MessageProps[] = items.flatMap(convertToMessageProps);
      prependMsgs(newMessages);
    },
    [convertToMessageProps, prependMsgs]
  );

  // 收到消息时，添加到聊天界面
  const addMessage = useCallback(
    (item: ChatMessage) => {
      convertToMessageProps(item).forEach((msg) => appendMsgRef.current(msg));
    },
    [convertToMessageProps]
  );

  // 判断是否显示时间
  function shouldShowTime(prevTime: number, currentTime: number) {
    return currentTime - prevTime > 10 * 60 * 1000; // 超过10分钟才显示时间
  }

  // 使用SignalR

  const { sendMessage, isConnected, setOnReconnected } = useSignalR({
    onMessage: addMessage,
    onCloseGroup: ({ groupId, userName }) => {
      // 仅处理当前会话
      if (groupId && groupId === chatId) {
        // 封装插入系统消息并支持按钮回调
        const pushSystemMessage = (
          text: string,
          action?: { text: string; onClick: () => void }
        ) => {
          appendMsgRef.current({
            type: "system",
            content: { text, action },
            createdAt: Date.now(),
          } as unknown as MessageProps);
        };

        // 加入一个按钮用于自定义处理
        pushSystemMessage("客服已关闭会话", {
          text: "新会话",
          onClick: () => {
            // 重新加载当前页面，发起新会话
            window.location.reload();
          },
        });
        setGroupIsClose(true);
      }
    },
  });
  useEffect(() => {
    console.log("isConnected:", isConnected);
  }, [isConnected]);

  const sendMessageRef = useRef(sendMessage);
  const initRef = useRef(false);

  // 断线重连后自动JoinGroup
  useEffect(() => {
    setOnReconnected(() => {
      if (chatId) {
        sendMessageRef.current(
          "JoinGroup",
          chatId,
          areaRef.current || ""
        );
        console.log("重连后自动加入群组:", chatId);
      }
    });
  }, [setOnReconnected, chatId]);

  // 加入聊天室
  useEffect(() => {
    if (isConnected && chatId) {
      // 加入聊天室
      console.log("加入聊天室:", chatId);
      sendMessageRef.current(
        "JoinGroup",
        chatId,
        areaRef.current || ""
      );
    } else {
      console.log("连接断开，等待重连中...");
    }
  }, [isConnected ,chatId]);


  // 在组件首次加载时运行初始化函数
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    // 获取当前用户对应的聊天组ID
    API.chat.getChatid(uidRef.current).then((res) => {
      setChatId(res);
      console.log("获取到的chatId:", res);
      // 按需创建新的聊天组
      API.chat
        .createGroup(
          res,
          userNameRef.current,
          uidRef.current,
          areaRef.current
        )
        .then(() => {
          // 获取历史消息
          API.chat.getHistory(res, "").then((res) => {
            // 添加历史消息到聊天界面
            addMessages(res.list);
          });
        });
    });
  }, [isConnected, addMessage, addMessages]);

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

  // 处理图片发送，改为API接口上传
  const handleImageSend = async (file?: File): Promise<any> => {
    if (file) {
      try {
        const result = await API.chat.uploadFile(file);
        // 可在此处通过 sendMessage 发送图片消息到服务端
        sendMessage(
          "SendMessageToGroup",
          chatId,
          "",
          uid,
          username,
          result.url
        );
        return true;
      } catch (err) {
        console.error("图片上传失败", err);
        return false;
      }
    } else {
      fileInputRef.current?.click();
      return false;
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageSend(file);
    }
  };

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

  // 输入框禁用状态
  const [inputDisabled, setInputDisabled] = useState(false);

  useEffect(() => {
    setInputDisabled(!isConnected || groupIsClose);
  }, [isConnected, groupIsClose]);

  return (
    <>
      <Chat
        isX
        locale={area}
        navbar={{ title: "智能助理" }}
        messages={messages}
        wideBreakpoint="800px"
        renderMessageContent={renderMessageContent}
        onSend={handleSend}
        inputOptions={{ disabled: inputDisabled }}
        toolbar={[
          {
            type: "image",
            icon: "image",
            title: "图片",
          },
        ]}
        onToolbarClick={(item, e) => {
          if (inputDisabled) return;
          if (item.type === "image") {
            handleImageSend();
          }
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={onFileChange}
        disabled={inputDisabled}
      />
    </>
  );
};

export default ChatContainer;
