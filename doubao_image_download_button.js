// ==UserScript==
// @name         豆包图片下载
// @namespace    http://tampermonkey.net/
// @version      2025-04-25
// @description  try to take over the world!
// @author       You
// @match        https://www.doubao.com/chat/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=doubao.com
// @grant        none
// ==/UserScript==

// @require      file://D:\OneDrive\05ProgramProject\tamper_monkey\private\doubao_image_download_button.js
// @require      file:///Users/erimus/OneDrive/05ProgramProject/tamper_monkey/private/doubao_image_download_button.js
// @require      https://raw.githubusercontent.com/Erimus-Koo/tamper_monkey/master/private/doubao_image_download_button.js

(function () {
  ("use strict");

  // 创建按钮
  const btn = document.createElement("button");
  btn.innerText = "下载图片";
  btn.style.position = "fixed";
  btn.style.bottom = "4px";
  btn.style.right = "4px";
  btn.style.zIndex = "9999";
  btn.style.padding = "0px 8px";
  btn.style.borderRadius = "4px";
  btn.style.backgroundColor = "#06f9";
  btn.style.backdropFilter = "blur(.5rem)";
  btn.style.color = "white";
  btn.style.border = "none";
  btn.style.cursor = "pointer";

  // 按钮点击事件
  btn.addEventListener("click", function () {
    const containers = document.querySelectorAll("div#img-content-container");
    let container = containers[0]; //main preview
    for (let c of containers) {
      if (
        c.querySelector('div[class^="right-icon"') ||
        c.querySelector('div[class^="left-icon"')
      ) {
        container = c;
      }
    }

    // 选择器：data-testid和class都要匹配
    const img = container.querySelector(
      'img[data-testid="in_painting_picture"][class^="preview-img"]'
    );
    if (!img) {
      alert("未找到图片元素！");
      return;
    }
    let url = img.src;
    if (!url) {
      alert("未找到图片地址！");
      return;
    }

    // 生成合适的文件名
    let filename = url.split("/").pop().split("?")[0] || "download.jpg";

    // 创建a标签进行下载
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);

    // 有些站点需要Blob处理（防止跨域），兼容处理
    fetch(url)
      .then((response) => response.blob())
      .then((blob) => {
        const objectUrl = window.URL.createObjectURL(blob);
        a.href = objectUrl;
        a.click();
        setTimeout(() => {
          window.URL.revokeObjectURL(objectUrl);
          document.body.removeChild(a);
        }, 1500);
      })
      .catch(() => {
        // Fallback: 直接下载src，如果失败
        a.click();
        document.body.removeChild(a);
      });
  });

  // 挂载到页面
  document.body.appendChild(btn);

  // 点击删除对话按钮
  const deleteChat = () => {
    // 点击更多按钮
    const moreBtns = Array.from(
      document.querySelectorAll(
        '[data-testid="message_action_bar"].opacity-100 [data-testid="message_action_more"]'
      )
    );
    if (!moreBtns) return;
    moreBtns[moreBtns.length - 1]?.click();

    // 点击二级菜单中的删除 这个不是标准按钮 需要patch
    setTimeout(() => {
      const li = document.querySelector(
        'ul.semi-dropdown-menu li[class*="danger"]'
      );
      if (li) {
        // 模拟事件序列
        ["mouseover", "mousedown", "mouseup", "click"].forEach((type) => {
          li.dispatchEvent(
            new MouseEvent(type, {
              bubbles: true,
              cancelable: true,
              view: window,
            })
          );
        });
      }
    }, 500);

    // 点击确认
    setTimeout(() => {
      const confirmBtn = document.querySelector("button.semi-button-danger");
      confirmBtn?.focus();
    }, 1000);
  };

  // 快捷键触发（Ctrl+Q 或 Alt+Q），避免输入域中误触发
  document.addEventListener("keydown", function (e) {
    // console.log("🚀 ~ e:", e);
    const isMac = navigator.userAgentData.platform === "macOS";
    // console.log("🚀 ~ isMac:", isMac);
    const modifier = isMac ? e.ctrlKey : e.altKey;

    // 复制文本
    let text = "重新生成20张比例9:16。";
    // Windows: Alt+V
    if (modifier && e.key.toLowerCase() === "v") {
      navigator.clipboard.writeText(text);
    }

    if (modifier && e.shiftKey && e.key.toLowerCase() === "v") {
      text = "重新生成36张比例9:16。";
      navigator.clipboard.writeText(text);
    }

    // 下载图片 Ctrl+Q 或 Alt+Q
    if (
      (e.ctrlKey && e.key.toLowerCase() === "q") ||
      (e.altKey && e.key.toLowerCase() === "q") ||
      (e.altKey && e.key.toLowerCase() === "1")
    ) {
      console.log("下载图片触发快捷键");
      btn.click();

      // 点击原生的下载按钮（下载文件名为对话名）
      document
        .querySelector('div[data-testid="edit_image_download_button"]')
        ?.click();
    }

    // 重新生成
    if (modifier && e.key.toLowerCase() === "r") {
      const btnList = document.querySelectorAll(
        'button[data-testid="message_action_regenerate"]'
      );
      btnList[btnList.length - 1].click();
    }

    // 到聊天框底部
    if (modifier && e.shiftKey && e.key.toLowerCase() === "d") {
      e.preventDefault();
      document.querySelector('div[class*="to-bottom-button"]')?.click();
      // 点击最后一条聊天记录的第一张图
      const chats = document.querySelectorAll(
        'div[data-testid="receive_message"]'
      );
      const lastChat = chats[chats.length - 1];
      lastChat?.focus();
      lastChat?.querySelector('div[data-testid="mdbox_image"]')?.click();
    }

    // 删除最后一条聊天
    if (modifier && e.key.toLowerCase() === "x") {
      deleteChat();
    }

    // --------------------------------------------------- 以下快捷键需要离开输入域才触发
    // 排除在输入、文本区域 或 可编辑内容中触发
    const tag = (
      (document.activeElement && document.activeElement.tagName) ||
      ""
    ).toLowerCase();
    if (
      ["input", "textarea", "select"].includes(tag) ||
      document.activeElement.isContentEditable
    )
      return;

    // 左按钮: Shift+Left
    // if (e.key === "ArrowLeft" || e.code === "ArrowLeft") {
    //   document
    //     .querySelector('div[class*="left-icon"][class*="icon-wrapper"]')
    //     ?.click();
    // }

    // 右按钮: Shift+Right
    // if (e.key === "ArrowRight" || e.code === "ArrowRight") {
    //   document
    //     .querySelector('div[class*="right-icon"][class*="icon-wrapper"]')
    //     ?.click();
    // }
  });

  // 让缩略图可以被Vimnium点击 -------------------------------- START
  const imgSelector = 'div[data-testid="mdbox_image"]';
  // 封装处理函数
  function makeClickable(node) {
    // 避免重复处理
    if (node.dataset.vimnumReady) return;
    node.dataset.vimnumReady = "1";

    // 增加可聚焦性
    node.setAttribute("tabindex", "0");
    // 增加 role，让 Vimium 能检索到
    node.setAttribute("role", "button");
    // 改变鼠标指针
    node.style.cursor = "pointer";
  }

  // 处理已有元素
  document.querySelectorAll(imgSelector).forEach(makeClickable);

  // 观察新增元素
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          // 是元素
          if (node.matches && node.matches(imgSelector)) {
            makeClickable(node);
          }
          // 如果是容器，处理下属结点
          node.querySelectorAll &&
            node.querySelectorAll(imgSelector).forEach(makeClickable);
        }
      });
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  // 让缩略图可以被Vimnium点击 -------------------------------- END
})();
