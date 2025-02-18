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
   * - Prefix+Y copies URL only
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

  // 复制文本到剪贴板
  async function copyToClipboard(content, message) {
    await navigator.clipboard.writeText(content);

    // 使用 GM_notification 提示成功
    GM_notification({
      title: "Tab Copied",
      text: message || "Copied",
      timeout: 2000,
    });
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

      // Check if the appropriate shortcut key is pressed
      if (prefix && e.code === "KeyC") {
        e.preventDefault(); // Prevent default browser behavior
        copyTitleAndUrl(); // Copy title and URL with toggled format (plain text/Markdown)
      } else if (prefix && e.code === "KeyY") {
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
