// ==UserScript==
// @name         Copy Tab
// @namespace    https://greasyfork.org/users/46393
// @version      1.1
// @description  Copy Tab Title and URL with Markdown format (Ctrl+C) or only URL (Ctrl+Y), use Alt on Windows.
// @author       Erimus
// @match        *://*/*
// @grant        GM_notification
// ==/UserScript==

(function () {
  ("use strict");

  /**
   * Shortcut configuration:
   * - macOS: Prefix is Ctrl
   * - Windows: Prefix is Alt
   *
   * - Prefix+C copies title and URL;
   *   (Toggles between plain text format and Markdown format.)
   * - Prefix+M copies title and URL in Markdown format
   * - Prefix+U copies URL only
   */

  let isMD = false; // 切换复制模式的标记

  // 排除规则函数：处理特殊网站链接的参数
  function formatData() {
    const currentUrl = window.location.href;
    let title = document.title.trim();
    let url = window.location.href.trim();

    // Bilibili 稍后看
    if (currentUrl.includes("bilibili.com/list/watchlater")) {
      // 标题移除 "-{username}-稍后再看-哔哩哔哩视频"
      title = title.replace("-稍后再看-哔哩哔哩视频", "").trim();
      title = title.substring(0, title.lastIndexOf("-")).trim();
      // 播放列表链接自动变视频链接
      const bvid = url.match(/bvid=([A-Za-z0-9]+)/)[1];
      return { title: title, url: `https://www.bilibili.com/video/${bvid}/` };
    }

    // 移除 Bilibili 的追踪参数
    if (currentUrl.includes("bilibili.com/video")) {
      return { title: title, url: url.split("?")[0] }; // 移除 ? 后面的参数
    }

    return { title: title, url: url }; // 默认返回原 URL
  }

  // 创建全局浮窗容器
  function createToastContainer() {
    const existingToast = document.getElementById("custom-toast-container");
    if (existingToast) return existingToast;

    const container = document.createElement("div");
    container.id = "custom-toast-container";
    container.style.position = "fixed";
    container.style.top = "0";
    container.style.left = "50%";
    container.style.transform = "translateX(-50%)"; // 水平居中
    container.style.zIndex = "9999";
    container.style.pointerEvents = "none"; // 不干扰页面交互
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.alignItems = "center";
    container.style.fontSize = "16px";
    document.body.appendChild(container);
    return container;
  }

  // 显示浮窗提示
  function showToast(message, duration = 2000) {
    const container = createToastContainer();

    const toast = document.createElement("div");

    // 构建提示内容
    const staticText = document.createElement("span"); // 固定部分
    staticText.textContent = "Copied Tab: ";
    staticText.style.color = "rgba(255, 255, 255, 0.8)"; // 浅白色

    const dynamicText = document.createElement("b"); // 动态部分
    dynamicText.textContent = message;
    dynamicText.style.color = "cyan"; // 蓝绿色
    dynamicText.style.marginLeft = "0.5em"; // 与固定部分分隔

    // 将内容添加到通知元素
    toast.appendChild(staticText);
    toast.appendChild(dynamicText);

    // 样式设置
    toast.style.background = "#000C"; // 黑色背景，透明度 80%
    toast.style.backdropFilter = "blur(.5em)";
    toast.style.color = "white";
    toast.style.padding = ".5em 1em";
    toast.style.lineHeight = "1.5"; // notification height is 2.5em
    toast.style.borderRadius = "5em";
    toast.style.fontSize = "1em";
    toast.style.marginTop = "1em"; // 多个提示时的间距
    toast.style.boxShadow = "0 .25em .5em rgba(0, 0, 0, 0.3)";
    toast.style.transition = "all 0.3s ease";

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0"; // 淡出效果
      toast.style.marginTop = "-2.5em";
      setTimeout(() => {
        container.removeChild(toast); // 动画结束后移除元素
      }, 300);
    }, duration);
  }

  // 复制文本到剪贴板
  function fallbackCopyToClipboard(content) {
    // http(!s) 等情况下 使用传统方法
    const textarea = document.createElement("textarea");
    textarea.value = content;
    textarea.style.position = "fixed"; // 防止页面滚动
    textarea.style.opacity = "0"; // 保持不可见，避免干扰用户操作
    document.body.appendChild(textarea);

    textarea.select();

    try {
      const successful = document.execCommand("copy");
      if (!successful) {
        console.error("Fallback: Copy to clipboard failed!");
      }
    } catch (err) {
      console.error("Fallback: Unable to copy to clipboard", err);
    }

    document.body.emoveChild(textarea);
  }

  async function copyToClipboard(content, message) {
    if (navigator.clipboard && window.isSecureContext) {
      // 使用 Clipboard API 实现复制
      await navigator.clipboard.writeText(content);
    } else {
      // 回退到使用 document.execCommand
      fallbackCopyToClipboard(content);
    }

    // 使用自定义浮窗提示
    showToast(message);
  }

  // 复制标题和链接的主逻辑
  async function copyTitleAndUrl() {
    const formatted = formatData();
    const title = formatted.title;
    const url = formatted.url;

    // 根据当前的格式选择复制文本
    const textToCopy = isMD ? `[${title}](${url})` : `${title}\n${url}`;

    // 调用复制到剪贴板功能
    await copyToClipboard(textToCopy, isMD ? "Markdown" : "Plain Text");

    // 切换格式状态
    isMD = !isMD;
  }

  // 仅复制链接的主逻辑
  async function copyUrlOnly() {
    await copyToClipboard(formatData().url, "URL Only");
  }

  // 判断操作系统并绑定快捷键
  function setupShortcut() {
    const isMac = navigator.userAgent.includes("Mac OS X");

    document.addEventListener("keydown", (e) => {
      // Determine if the correct modifier key (Ctrl for macOS, Alt for Windows) is pressed
      const prefix = (isMac && e.ctrlKey) || (!isMac && e.altKey);
      // console.log(prefix, e.code);
      // Check if the appropriate shortcut key is pressed
      if (prefix && e.code === "KeyC") {
        e.preventDefault(); // Prevent default browser behavior
        isMD = false;
        copyTitleAndUrl(); // Copy title and URL with toggled format (plain text/Markdown)
      } else if (prefix && e.code === "KeyU") {
        e.preventDefault(); // Prevent default browser behavior
        copyUrlOnly(); // Copy URL only
      } else if (prefix && e.code === "KeyM") {
        e.preventDefault(); // Prevent default browser behavior
        isMD = true;
        copyTitleAndUrl(); // Copy Markdown
      }
    });
  }

  // 初始化脚本
  setupShortcut();
})();
