// ==UserScript==
// @name         Browser Info
// @description  Add browser info(platform & etc.) to html, for css selecting.
// @version      0.1
// @author       Erimus
// @namespace    https://greasyfork.org/users/46393
// @icon         https://cdn-icons-png.flaticon.com/128/11086/11086161.png

// @match        *://*/*
// @match        about:blank
// @match        about:srcdoc
// @include      *

// @run-at       document-body
// @noframes     false
// @grant        none

// @require      https://raw.githubusercontent.com/Erimus-Koo/tamper_monkey/master/browser_info.js?v=0930
// ==/UserScript==

/**
  本脚本是将浏览器信息注入 html 属性
  使我可以通过 CSS 选择器针对浏览器和平台做一些调整
*/

(function () {
  const log = (...args) => console.log("[Browser Info]", ...args);

  // 1. 核心属性注入函数
  function doInject(doc, isIframe = false) {
    if (!doc || !doc.documentElement) return false;
    const html = doc.documentElement;

    if (html.hasAttribute("ua-os")) return true; // 已经注入过

    const ua = navigator.userAgent;
    const os = ua.match(/(Windows|Macintosh|iPhone|Android)/)?.[1] ?? "unknown";
    const browser = ua.match(/(Chrome|Safari|Firefox)/)?.[1] ?? "unknown";
    const chrome_ver = ua.match(/((?<=Chrome\/)\d+)/)?.[1] ?? "0";
    const lang = navigator.language || navigator.userLanguage;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const devicePixelRatio = window.devicePixelRatio;

    if (isIframe) html.setAttribute("e-iframe", "true");
    html.setAttribute("ua-os", os);
    html.setAttribute("ua-browser", browser);
    html.setAttribute("ua-chrome-ver", chrome_ver);
    html.setAttribute("e-lang", lang);
    html.setAttribute("e-width", width);
    html.setAttribute("e-height", height);
    html.setAttribute("e-devicePixelRatio", devicePixelRatio);

    log(`属性注入成功！当前环境: ${isIframe ? "🚨 iframe 框架" : "✅ 主页面"}`);
    return true;
  }

  // 2. 当前环境立刻注入一次
  doInject(document, window.self !== window.top);

  // 3. 【高性能事件驱动】主页面内线渗透
  if (window.self === window.top) {
    log("主页面已启动高效 Observer 监听机制（无轮询占用）...");

    // 负责深度追踪 iframe 内部变化的函数
    function watchIframeInternals(iframe) {
      try {
        const iframeWindow = iframe.contentWindow;
        if (!iframeWindow) return;

        // 函数：尝试注入
        const tryInject = () => {
          const iframeDoc = iframe.contentDocument || iframeWindow.document;
          return doInject(iframeDoc, true);
        };

        // 先尝试执行一次（针对已经准备好的 iframe）
        if (tryInject()) return;

        // 核心：监听 iframe 内部的 documentElement（根节点）属性变化
        // 这样即使 TinyMCE 异步重写或动态往里塞 html，也能瞬间抓到
        const internalObserver = new iframeWindow.MutationObserver(() => {
          if (tryInject()) {
            internalObserver.disconnect(); // 注入成功后立刻销毁监听，释放内存
          }
        });

        // 只要 iframe 的 DOM 树准备好了，就启动监听
        const iframeDoc = iframe.contentDocument || iframeWindow.document;
        if (iframeDoc && iframeDoc.documentElement) {
          internalObserver.observe(iframeDoc.documentElement, {
            attributes: true,
            childList: true,
            subtree: true,
          });
        }

        // 保底：万一它刷新了页面或重新加载，再挂个 load 事件
        iframe.addEventListener(
          "load",
          () => {
            tryInject();
            // 加载后重新尝试挂载内部监听（防止框架文档被彻底重置）
            const freshDoc =
              iframe.contentDocument || iframe.contentWindow.document;
            if (freshDoc && freshDoc.documentElement) {
              internalObserver.observe(freshDoc.documentElement, {
                attributes: true,
                childList: true,
                subtree: true,
              });
            }
          },
          { once: true },
        );
      } catch (e) {
        // 跨域 iframe 无法读取 contentWindow，直接忽略
      }
    }

    // 监听主页面，捕获所有新创建的 <iframe> 标签
    const mainObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.tagName === "IFRAME") {
            watchIframeInternals(node);
          } else if (node.querySelectorAll) {
            node.querySelectorAll("iframe").forEach(watchIframeInternals);
          }
        }
      }
    });

    // 启动主页面监听
    mainObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    // 页面刚打开时，可能已经有现成的 iframe（虽然 document-start 概率极低，但做个保险）
    document.querySelectorAll("iframe").forEach(watchIframeInternals);
  }
})();
