// ==UserScript==
// @name         Copy Tab
// @namespace    https://greasyfork.org/users/46393
// @version      1.2
// @description  Copy Tab Title and URL with Markdown format (Ctrl+C) or only URL (Ctrl+Y), use Alt on Windows.
// @author       Erimus
// @match        *://*/*
// @grant        GM_notification
// @run-at       document-idle
// ==/UserScript==

/**
 * 快捷键说明：
 * - macOS: Ctrl 为前缀键
 * - Windows: Alt 为前缀键
 *
 * - 前缀+C  复制标题和 URL（纯文本）
 * - 前缀+M  复制标题和 URL（Markdown 格式）
 * - 前缀+U  仅复制 URL
 */

(function () {
  ("use strict");

  const SN = "📋 [Copy Tab]";
  const debug = false; // 调试模式，需要时改为 true
  const log = (...args) => debug && console.log(SN, ...args);

  let isMD = false; // 切换复制模式的标记

  // -------------------------------------------------- 工具函数

  // 过滤 URL 参数，只保留 keepKeys 中的参数
  function filterUrlParams(url, keepKeys = []) {
    const [base, search = ""] = url.split("?");
    if (!search) return url;
    const params = new URLSearchParams(search);
    const newParams = new URLSearchParams();
    keepKeys.forEach((key) => {
      if (params.has(key)) newParams.set(key, params.get(key));
    });
    const paramString = newParams.toString();
    return paramString ? `${base}?${paramString}` : base;
  }

  // 处理特殊网站的标题/URL，始终从主页面取数据
  function formatData() {
    const currentUrl = window.location.href;
    let title = document.title.trim();
    let url = window.location.href.trim();
    log(`formatData | title: ${title} | url: ${url}`);

    // Bilibili 稍后看
    if (currentUrl.includes("bilibili.com/list/watchlater")) {
      title = title.replace("-稍后再看-哔哩哔哩视频", "").trim();
      title = title.substring(0, title.lastIndexOf("-")).trim();
      const bvid = url.match(/bvid=([A-Za-z0-9]+)/)[1];
      return { title, url: `https://www.bilibili.com/video/${bvid}/` };
    }

    // Bilibili 视频页，移除追踪参数
    if (currentUrl.includes("bilibili.com/video")) {
      title = title.replace("_哔哩哔哩_bilibili", "");
      url = filterUrlParams(url, ["p"]);
    }

    // 淘宝/天猫，清空追踪码
    const taobaoDomains = ["item.taobao.com", "detail.tmall.com"];
    if (taobaoDomains.some((d) => currentUrl.includes(d))) {
      url = filterUrlParams(url, ["id"]);
    }

    // 推特 X，清理标题格式
    const twitterDomains = ["t.co", "x.com"];
    if (twitterDomains.some((d) => currentUrl.includes(d))) {
      const pattern = /^(\(\d+\)\s*)?X 上的 (.*?) \/ X$/gm;
      title = title.replace(pattern, "$2");
      const parts = title.split("：", 2);
      if (parts.length === 2) {
        title = parts[0] + "：" + parts[1].trim().replace(/^[「]+|[」]+$/g, "");
      }
    }

    return { title, url };
  }

  // -------------------------------------------------- Toast 浮窗

  function createToastContainer() {
    const existing = document.getElementById("custom-toast-container");
    if (existing) return existing;

    const container = document.createElement("div");
    container.id = "custom-toast-container";
    container.style.cssText = `
      position: fixed; top: 0; left: 50%; transform: translateX(-50%);
      z-index: 999999999; pointer-events: none;
      display: flex; flex-direction: column; align-items: center; font-size: 16px;
    `;
    document.body.appendChild(container);
    return container;
  }

  function showToast(message, duration = 2000) {
    const container = createToastContainer();
    const toast = document.createElement("div");

    const staticText = document.createElement("span");
    staticText.textContent = "Copied Tab: ";
    staticText.style.color = "rgba(255, 255, 255, 0.8)";

    const dynamicText = document.createElement("b");
    dynamicText.textContent = message;
    dynamicText.style.color = "cyan";
    dynamicText.style.marginLeft = "0.5em";

    toast.appendChild(staticText);
    toast.appendChild(dynamicText);
    toast.style.cssText = `
      background: #000C; backdrop-filter: blur(.5em); color: white;
      padding: .5em 1em; line-height: 1.5; border-radius: 5em;
      font-size: 1em; margin-top: 1em;
      box-shadow: 0 .25em .5em rgba(0,0,0,0.3); transition: all 0.3s ease;
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.marginTop = "-2.5em";
      setTimeout(() => container.removeChild(toast), 300);
    }, duration);
  }

  // -------------------------------------------------- 剪贴板

  function fallbackCopyToClipboard(content) {
    const textarea = document.createElement("textarea");
    textarea.value = content;
    textarea.style.cssText = "position: fixed; opacity: 0;";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      if (!document.execCommand("copy")) {
        console.error(`${SN} Fallback: Copy failed!`);
      }
    } catch (err) {
      console.error(`${SN} Fallback: Unable to copy`, err);
    }
    document.body.removeChild(textarea);
  }

  async function copyToClipboard(content, message) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(content);
    } else {
      fallbackCopyToClipboard(content);
    }
    showToast(message);
  }

  // -------------------------------------------------- 复制动作

  async function copyTitleAndUrl() {
    const { title, url } = formatData();
    const textToCopy = isMD ? `[${title}](${url})` : `${title}\n${url}`;
    await copyToClipboard(textToCopy, isMD ? "Markdown" : "Plain Text");
  }

  async function copyUrlOnly() {
    await copyToClipboard(formatData().url, "URL Only");
  }

  // -------------------------------------------------- 快捷键处理

  const isMac = navigator.userAgent.includes("Mac OS X");

  function handleKeydown(e) {
    const prefix = (isMac && e.ctrlKey) || (!isMac && e.altKey);
    if (!prefix) return;

    log(
      `keydown | code: ${e.code} | 来源: ${e.currentTarget === document ? "主页面" : "iframe"}`,
    );

    if (e.code === "KeyC") {
      e.preventDefault();
      isMD = false;
      copyTitleAndUrl();
    } else if (e.code === "KeyU") {
      e.preventDefault();
      copyUrlOnly();
    } else if (e.code === "KeyM") {
      e.preventDefault();
      isMD = true;
      copyTitleAndUrl();
    }
  }

  // -------------------------------------------------- iframe 渗透

  function bindIframe(iframe) {
    try {
      const iframeWindow = iframe.contentWindow;
      if (!iframeWindow) return;

      const tryBind = () => {
        try {
          const iframeDoc = iframe.contentDocument || iframeWindow.document;
          if (!iframeDoc || !iframeDoc.documentElement) return false;
          // 先移除旧监听器再重新绑定，避免重复触发
          iframeDoc.removeEventListener("keydown", handleKeydown);
          iframeDoc.addEventListener("keydown", handleKeydown);
          log(`已绑定 iframe keydown | src="${iframe.src || "(empty)"}"`);
          return true;
        } catch (e) {
          return false; // 跨域 iframe，无法访问
        }
      };

      // 立即尝试绑定
      tryBind();

      // iframe 内容可能异步重写（如富文本编辑器），用 MutationObserver 监听变化后重新绑定
      try {
        const iframeDoc = iframe.contentDocument || iframeWindow.document;
        if (iframeDoc && iframeDoc.documentElement) {
          const internalObserver = new iframeWindow.MutationObserver(() => {
            tryBind();
          });
          internalObserver.observe(iframeDoc.documentElement, {
            childList: true,
            subtree: true,
          });
          log(`已监听 iframe 内部 DOM 变化 | src="${iframe.src || "(empty)"}"`);
        }
      } catch (e) {
        // 跨域，忽略
      }

      // 保底：iframe 整体 load 后重新绑定
      iframe.addEventListener("load", () => {
        log(
          `iframe load 事件触发，重新绑定 | src="${iframe.src || "(empty)"}"`,
        );
        tryBind();
      });
    } catch (e) {
      // 跨域 iframe，忽略
    }
  }

  // 用 MutationObserver 捕获动态插入的 iframe
  function watchForIframes() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.tagName === "IFRAME") {
            bindIframe(node);
          } else if (node.querySelectorAll) {
            node.querySelectorAll("iframe").forEach(bindIframe);
          }
        }
      }
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  // -------------------------------------------------- 初始化

  log(`脚本已加载 | URL: ${window.location.href}`);

  // 绑定主页面
  document.addEventListener("keydown", handleKeydown);
  log("已绑定主页面 keydown 监听器");

  // 绑定已存在的 iframe
  const existingIframes = document.querySelectorAll("iframe");
  log(`页面内已有 ${existingIframes.length} 个 iframe`);
  existingIframes.forEach(bindIframe);

  // 监听后续动态插入的 iframe
  watchForIframes();
})();
