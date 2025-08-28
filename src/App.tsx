import React, { useEffect, useState } from "react";
import logo from "./logo.svg";
import "./App.css";
// 引入组件
import Chat, { Bubble, MessageProps, useMessages } from "@chatui/core";
// 引入样式
import "@chatui/core/dist/index.css";

function App() {
  const { messages, appendMsg } = useMessages([]);
  const [username, setUsername] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [area, setArea] = useState<string | null>(null);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setUsername(params.get("username"));
    setUid(params.get("uid"));
    // 获取系统语言并设置 area
    setArea(navigator.language || navigator.languages[0] || "unknown");
  }, []);

  function handleSend(type: string, val: string) {
    if (type === "text" && val.trim()) {
      appendMsg({
        type: "text",
        content: { text: val },
        position: "right",
      });

      setTimeout(() => {
        appendMsg({
          type: "text",
          content: { text: "Bala bala" },
        });
      }, 1000);
    }
  }

  function renderMessageContent(msg: MessageProps) {
    const { content } = msg;
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
