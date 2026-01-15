// ==UserScript==
// @name         Auto Scroll 自动滚屏
// @description  Auto Scroll Pages (double click / ctrl+arrow / alt+arrow)
// @include      *
// @version      0.19
// @author       Erimus
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @namespace    https://greasyfork.org/users/46393
// ==/UserScript==

(function (document) {
  // 获取保存的设置或默认值 (间隔,距离,隐藏滚动条[0:隐藏/1:显示],停止时间)
  const getSettings = () => GM_getValue("auto_scroll_settings", "50,1,0,");

  // 解析并初始化设置
  let [scrollInterval, scrollDistance, hideScrollbar, stopTime] = (() => {
    let s = getSettings().split(/[，,]/).map((item) => item.trim());
    return [
      parseInt(s[0]) || 50,
      parseFloat(s[1]) || 1,
      s[2] === "1" ? false : true, // 0或默认: 隐藏(true), 1: 显示(false)
      s[3] || "",
    ];
  })();

  let scrolling = false, // status
    autoScroll, // scroll function
    lastClick = Date.now(),
    currentDirection = 1; // 记录当前方向用于无刷新更新

  // hide scrollbar CSS
  let styleElement;
  const updateScrollbarVisibility = (hide) => {
    if (!hideScrollbar) return;
    if (hide) {
      if (!styleElement) {
        styleElement = document.createElement("style");
        styleElement.id = "auto-scroll-hide-scrollbar";
        styleElement.innerHTML = "::-webkit-scrollbar { display: none !important; }";
      }
      document.head.appendChild(styleElement);
    } else if (styleElement && styleElement.parentNode) {
      styleElement.parentNode.removeChild(styleElement);
    }
  };

  // Toast notification
  const showToast = (message) => {
    const toast = document.createElement("div");
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #CC0;
      color: #000;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: bold;
      font-size: 14px;
      z-index: 10001;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transition: opacity 0.3s, transform 0.3s;
      pointer-events: none;
      text-align: left;
      line-height: 1.6;
      white-space: pre-wrap;
    `;
    toast.innerText = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(-10px)";
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  };

  // 获取/设置停止时间 (兼容旧版逻辑，但现在统一管理)
  const getStopTime = () => stopTime;
  const setStopTime = (time) => {
    stopTime = time;
    saveAllSettings();
  };

  const saveAllSettings = () => {
    let hideValue = hideScrollbar ? "0" : "1"; // 存储 0:隐藏, 1:显示
    GM_setValue(
      "auto_scroll_settings",
      `${scrollInterval},${scrollDistance},${hideValue},${stopTime}`
    );
  };

  // 检查是否到达停止时间
  const checkStopTime = () => {
    let stopTimeVal = getStopTime();
    if (!stopTimeVal) return false;

    let now = new Date();
    let currentTime =
      now.getHours().toString().padStart(2, "0") +
      ":" +
      now.getMinutes().toString().padStart(2, "0");

    if (currentTime === stopTimeVal) {
      console.log(`已到达设定时间 ${stopTimeVal}，停止自动滚动`);
      if (scrolling) {
        stopScroll();
      }
      return true;
    }
    return false;
  };

  // 统一配置界面
  const configAllSettings = () => {
    const hideValue = hideScrollbar ? "0" : "1";
    const current = `${scrollInterval},${scrollDistance},${hideValue},${stopTime}`;
    const input = prompt(
      "请编辑配置，格式: \n- 间隔ms (正整数)\n- 距离px (正数)\n- 滚动条[0:隐藏/1:显示]\n- 停止时间HH:MM (24小时制)\n\n例如: 50,1,0,19:00",
      current
    );

    if (input === null) return;

    const s = input.split(/[，,]/).map((item) => item.trim());

    // 验证逻辑
    const newInterval = parseInt(s[0]);
    const newDistance = parseFloat(s[1]);
    const newHideFlag = s[2];
    const newStopTime = s[3] || "";
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

    let errors = [];
    if (isNaN(newInterval) || newInterval <= 0) errors.push("间隔需为正整数");
    if (isNaN(newDistance) || newDistance <= 0) errors.push("距离需为正数");
    if (newHideFlag !== "0" && newHideFlag !== "1") errors.push("滚动条开关需为0或1");
    if (newStopTime !== "" && !timeRegex.test(newStopTime)) errors.push("停止时间格式需为 HH:MM");

    if (errors.length > 0) {
      alert("配置错误：\n" + errors.join("\n"));
      return;
    }

    // 应用并保存
    scrollInterval = newInterval;
    scrollDistance = newDistance;
    hideScrollbar = newHideFlag === "1" ? false : true;
    stopTime = newStopTime;

    saveAllSettings();

    // 立即应用设置
    if (scrolling) {
      // 重新启动定时器以应用新的间隔或距离
      clearInterval(autoScroll);
      startInterval(currentDirection);
      updateScrollbarVisibility(true);
    } else {
      updateScrollbarVisibility(false);
    }

    const statusMsg = `配置已更新：
- 间隔: ${scrollInterval}ms
- 距离: ${scrollDistance}px
- 滚动条: ${hideScrollbar ? "隐藏" : "显示"}
- 停止时间: ${stopTime || "无"}`;
    console.log(statusMsg);
    console.log("当前保存的设置字符串:", getSettings());
    showToast(statusMsg);
  };

  // 注册油猴菜单
  GM_registerMenuCommand("滚动参数设置", configAllSettings);

  // main function
  const toggleScroll = function (direction) {
    if (!scrolling) {
      scrolling = true;
      updateScrollbarVisibility(true);
      console.log("Start scroll", direction);
      currentDirection = direction == "up" ? -1 : 1;
      startInterval(currentDirection);
    } else {
      stopScroll();
    }
  };

  const startInterval = (direction) => {
    autoScroll = setInterval(function () {
      // 检查是否到达停止时间
      if (checkStopTime()) {
        return;
      }
      document.documentElement.scrollTop += direction * scrollDistance;
    }, scrollInterval);
  };

  const stopScroll = function () {
    if (scrolling) {
      scrolling = false;
      console.log("Stop scroll");
      clearInterval(autoScroll);
      updateScrollbarVisibility(false);
    }
  };

  // double click near edge can trigger (Prevent accidental touch)
  // 双击靠近页面边缘的位置可以触发滚屏 (防止误触发)
  const dblclickCheck = (e) => {
    if (Date.now() - lastClick < 500) {
      return;
    } //just stopped by click
    let range = 50; // effective range
    let w = window.innerWidth;
    let h = window.innerHeight;
    console.log(`double click: x=${e.x}/${w} | y=${e.y}/${h}`);
    // Except top edge, because of search bar is mostly at top.
    if (e.x < range || w - e.x < range || h - e.y < range) {
      toggleScroll();
    }
  };

  // toogle scrolling by double click
  // if you want to trigger with double click , remove '//' before 'document'.
  // 双击触发
  document.body.addEventListener("dblclick", dblclickCheck);

  // single click to stop scroll
  document.body.addEventListener("click", (e) => {
    if (scrolling && e.isTrusted) {
      stopScroll();
      lastClick = Date.now();
    }
  });

  // toogle scrolling by hotkey
  // if you want set your own hotkey, find the key code on following site.
  // 如果你想要设置其它快捷键，查看以下网址以找到对应的按键码。
  // https://www.w3.org/2002/09/tests/keys.html
  document.onkeydown = (e) => {
    let keyCode = e.code,
      fnKey = e.ctrlKey || e.metaKey || e.altKey;
    if (fnKey && keyCode === "ArrowDown") {
      console.log("Press Ctrl/Alt + Down arrow");
      toggleScroll();
    } else if (fnKey && keyCode === "ArrowUp") {
      console.log("Press Ctrl/Alt + Up arrow");
      toggleScroll("up");
    }
  };
})(document);
