// ==UserScript==
// @name         Copy Tweet to Markdown
// @namespace    https://greasyfork.org/users/46393
// @version      0.1.4
// @description  Copy the tweet in markdown format
// @author       Erimus
// @match        https://x.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=x.com
// @grant        none
// ==/UserScript==

// @require      file://D:\OneDrive\05ProgramProject\tamper_monkey\copy_tweet_as_md.js
// @require      file:///Users/erimus/OneDrive/05ProgramProject/tamper_monkey/copy_tweet_as_md.js
// @require      https://raw.githubusercontent.com/Erimus-Koo/tamper_monkey/master/copy_tweet_as_md.js

(function () {
  "use strict";

  const SN = "🐦 [Copy Tweet]"; // script name
  console.log(`${SN} 油猴脚本开始`);

  let copyButton = null;

  /**
   * 检查当前 URL 是否为推文详情页
   */
  function isTweetDetailPage() {
    const pattern = /^https:\/\/x\.com\/[^/]+\/status\/\d+/;
    return pattern.test(window.location.href);
  }

  /**
   * 获取推文链接
   * 优先从 title 中提取 t.co 短链接，否则使用当前完整 URL
   */
  function getTweetUrl() {
    const title = document.title;
    const tcoMatch = title.match(/https?:\/\/t\.co\/[A-Za-z0-9]+/);

    if (tcoMatch) {
      console.log(`${SN} 从 title 中提取到 t.co 链接:`, tcoMatch[0]);
      return tcoMatch[0];
    }

    console.log(`${SN} 使用当前完整 URL:`, window.location.href);
    return window.location.href;
  }

  /**
   * 获取推文中的图片
   */
  function getTweetPhotos() {
    const tweetArticle = document.querySelector('article[data-testid="tweet"]');
    if (!tweetArticle) {
      console.log(`${SN} 未找到推文 article`);
      return [];
    }

    const photoContainers = tweetArticle.querySelectorAll(
      'div[data-testid="tweetPhoto"]',
    );
    const photos = [];

    photoContainers.forEach((container) => {
      const img = container.querySelector("img");
      if (img && img.src) {
        // 将 URL 中的 name 参数改为 name=orig 以获取原图
        let url = img.src;
        url = url.replace(/([?&])name=[^&]*/, "$1name=orig");

        // 如果 URL 中没有 name 参数，则添加
        if (!url.includes("name=")) {
          url += url.includes("?") ? "&name=orig" : "?name=orig";
        }

        photos.push(url);
        console.log(`${SN} 找到图片:`, url);
      }
    });

    return photos;
  }

  /**
   * 将推文内容转换为 Markdown 格式
   */
  function parseTweetToMarkdown() {
    // 获取第一个推文文本容器
    const tweetTextDiv = document.querySelector('div[data-testid="tweetText"]');
    if (!tweetTextDiv) {
      console.log(`${SN} 未找到推文文本`);
      return null;
    }

    let markdown = "";

    // 遍历所有子节点
    function processNode(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        // 文本节点直接添加
        markdown += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = node.tagName.toLowerCase();

        if (tagName === "img") {
          // 处理图片：如果是 emoji 则用 alt 文本，否则用图片链接
          const src = node.src || "";
          const alt = node.alt || "";

          if (src.includes("twimg.com/emoji")) {
            // emoji 直接用 alt 文本
            markdown += alt;
          } else {
            // 普通图片用 markdown 格式
            markdown += `![${alt}](${src})`;
          }
        } else if (tagName === "a") {
          // 链接处理
          const href = node.href || "";
          const text = node.textContent || "";
          markdown += `[${text}](${href})`;
        } else if (tagName === "br") {
          // 换行
          markdown += "\n";
        } else {
          // 其他元素递归处理子节点
          node.childNodes.forEach(processNode);
        }
      }
    }

    tweetTextDiv.childNodes.forEach(processNode);

    const content = markdown.trim();
    const url = getTweetUrl();

    // 获取推文图片
    const photos = getTweetPhotos();
    let photosMarkdown = "";
    if (photos.length > 0) {
      photosMarkdown =
        "\n\n" +
        photos
          .map((photoUrl) => {
            // 使用 Markdown 图片格式，设置宽度为 200
            return `![200](${photoUrl})`;
          })
          .join("");
    }

    // 拼接最终的 markdown 格式
    const result = `${url}\n\n${content}${photosMarkdown}`;

    console.log(`${SN} 解析结果:`, result);
    return result;
  }

  /**
   * 复制文本到剪贴板
   */
  async function copyToClipboard(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // 回退方案
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      console.log(`${SN} 复制成功`);
      showToast("Tweet copied as Markdown!");
    } catch (err) {
      console.error(`${SN} 复制失败:`, err);
      showToast("Copy failed!", true);
    }
  }

  /**
   * 显示提示消息
   */
  function showToast(message, isError = false) {
    const toast = document.createElement("div");
    toast.textContent = message;
    toast.style.position = "fixed";
    toast.style.top = "20px";
    toast.style.left = "50%";
    toast.style.transform = "translateX(-50%)";
    toast.style.background = isError ? "#f44" : "#000C";
    toast.style.backdropFilter = "blur(.5em)";
    toast.style.color = "white";
    toast.style.padding = ".5em 1em";
    toast.style.borderRadius = "5em";
    toast.style.zIndex = "999999";
    toast.style.fontSize = "14px";
    toast.style.transition = "opacity 0.3s ease";

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 2000);
  }

  /**
   * 注入 CSS 样式
   */
  function injectStyles() {
    if (document.getElementById("copy-tweet-md-styles")) return;

    const style = document.createElement("style");
    style.id = "copy-tweet-md-styles";
    style.textContent = `
      .copy-tweet-md-btn {
        position: fixed;
        bottom: 146px;
        right: 20px;
        width: 55px;
        height: 55px;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 16px;
        border: 1px solid rgb(75, 78, 82);
        cursor: pointer;
        box-shadow: rgba(255, 255, 255, 0.2) 0px 0px 15px, rgba(255, 255, 255, 0.15) 0px 0px 3px 1px;
        overflow: hidden;
        transform: scale(.5);
        opacity: 0;
        transition: transform 0.3s ease, opacity 0.3s ease;
      }

      .copy-tweet-md-btn.visible {
        transform: scale(1);
        opacity: 1;
      }
      
      .copy-tweet-md-btn:hover {
        border: 1px solid #fff8;
      }

      .copy-tweet-md-btn svg {
        width: 32px;
        height: 32px;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 创建复制按钮
   */
  function createCopyButton() {
    if (copyButton) return; // 避免重复创建

    injectStyles();

    copyButton = document.createElement("button");
    copyButton.className = "copy-tweet-md-btn";
    copyButton.title = "Copy Tweet as Markdown";
    copyButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-scan-text-icon lucide-scan-text"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 8h8"/><path d="M7 12h10"/><path d="M7 16h6"/></svg>
    `;

    copyButton.addEventListener("click", () => {
      const markdown = parseTweetToMarkdown();
      if (markdown) {
        copyToClipboard(markdown);
      } else {
        showToast("No tweet content found!", true);
      }
    });

    document.body.appendChild(copyButton);
    console.log(`${SN} 复制按钮已创建`);
  }

  /**
   * 显示按钮
   */
  function showCopyButton() {
    if (!copyButton) {
      createCopyButton();
      // 延迟添加 visible 类以触发动画
      setTimeout(() => {
        if (copyButton) copyButton.classList.add("visible");
      }, 10);
    } else {
      copyButton.classList.add("visible");
    }
  }

  /**
   * 隐藏按钮
   */
  function hideCopyButton() {
    if (copyButton) {
      copyButton.classList.remove("visible");
    }
  }

  /**
   * 检查并更新按钮状态
   */
  function updateButtonState() {
    if (isTweetDetailPage()) {
      showCopyButton();
    } else {
      hideCopyButton();
    }
  }

  // 监听 URL 变化（Twitter 是 SPA）
  let lastUrl = location.href;
  new MutationObserver(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      console.log(`${SN} URL 变化:`, currentUrl);
      updateButtonState();
    }
  }).observe(document.body, { childList: true, subtree: true });

  // 初始检查
  updateButtonState();
})();
