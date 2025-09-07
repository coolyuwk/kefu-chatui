import React, { useState, useCallback, useRef } from "react";
import type { UserModel } from "./types/userModel";
import { Config } from "./utils/config";
import ChatContainer from "./components/ChatContainer";

import "./App.css";

function App() {
  const themeJson = Config.theme;
  console.log(`theme:`, themeJson);

  const theme = JSON.parse(decodeURIComponent(themeJson));
  const params = new URLSearchParams(window.location.search);
  const userNameRef = useRef("");
  const uidRef = useRef("");
  const areaRef = useRef("");
  const initRef = useRef(false);

  // 获取系统语言并设置 area
  areaRef.current = navigator.language || navigator.languages[0] || "";

  // 初始化函数
  const initializeApp = useCallback(() => {
    // 这里放置你需要在首次加载时执行的初始化逻辑
    console.log("App initialized");

    // 设置状态值
    userNameRef.current = params.get("username") || "";
    uidRef.current = params.get("uid") || "";
    if (!params.get("uid")) {
      console.error("缺少 uid 参数，无法初始化用户信息");
      return;
    }
  }, [params]); // 补全依赖数组

  // 在组件首次加载时运行初始化函数
  if (!initRef.current) {
    initRef.current = true;
    initializeApp();
  }

  return (
    <ChatContainer 
    uid={uidRef.current} 
    username={userNameRef.current} 
    area={areaRef.current} 
  />
  );
}

export default App;
