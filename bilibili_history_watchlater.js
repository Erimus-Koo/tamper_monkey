// ==UserScript==
// @name         B站 - 历史记录页面 添加稍后播按钮
// @version      0.1.1
// @description  给历史记录添加稍后播按钮 便于回看错过的部分
// @author       Erimus
// @namespace    https://greasyfork.org/users/46393
// @icon         https://www.google.com/s2/favicons?sz=64&domain=bilibili.com
// @grant        GM_xmlhttpRequest
// @connect      api.bilibili.com

// @match        *://www.bilibili.com/account/history*

// ==/UserScript==

/**
  本脚本为历史记录页面的视频添加"加入稍后播"按钮
  方便用户快速将历史视频添加到稍后播列表
*/

(function () {
  "use strict";

  // -------------------------------------------------- common - START
  const N = "📺 [历史记录稍后播] ";
  console.log(`${N}油猴脚本开始`);

  // 获取 CSRF Token
  const getCsrf = () => {
    const match = document.cookie.match(/bili_jct=([^;]+)/);
    return match ? match[1] : "";
  };

  // 从 BVID 转换为 AID
  const bvidToAid = async (bvid) => {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "GET",
        url: `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`,
        onload: (response) => {
          try {
            const data = JSON.parse(response.responseText);
            if (data.code === 0) {
              resolve(data.data.aid);
            } else {
              reject(new Error(data.message));
            }
          } catch (e) {
            reject(e);
          }
        },
        onerror: reject,
      });
    });
  };

  // 添加到稍后播
  const addToWatchLater = async (aid, csrf) => {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "POST",
        url: "https://api.bilibili.com/x/v2/history/toview/add",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        data: `aid=${aid}&csrf=${csrf}`,
        onload: (response) => {
          try {
            const data = JSON.parse(response.responseText);
            if (data.code === 0) {
              resolve(data);
            } else {
              reject(new Error(data.message || "添加失败"));
            }
          } catch (e) {
            reject(e);
          }
        },
        onerror: reject,
      });
    });
  };

  // 创建稍后播按钮
  const createWatchLaterButton = () => {
    const button = document.createElement("button");
    button.className = "history-watch-later-btn";
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2zm0 1a5 5 0 1 1 0 10A5 5 0 0 1 8 3zm-.5 1.5v3.793l2.146 2.147.708-.708L8 7.378V4.5h-1z"/>
      </svg>
      <span>稍后播</span>
    `;
    button.title = "加入稍后播";
    return button;
  };

  // 处理单个视频卡片
  const processVideoCard = (card) => {
    // 避免重复添加按钮
    if (card.querySelector(".history-watch-later-btn")) {
      return;
    }

    // 获取视频链接
    const link = card.querySelector("a.bili-cover-card");
    if (!link) {
      console.debug(`${N}未找到视频链接`);
      return;
    }

    const href = link.getAttribute("href");
    const bvidMatch = href?.match(/\/video\/(BV[a-zA-Z0-9]+)/);
    if (!bvidMatch) {
      console.debug(`${N}无法提取 BVID: ${href}`);
      return;
    }

    const bvid = bvidMatch[1];

    // 获取视频标题
    const titleEle = card.querySelector(".bili-video-card__title");
    const title = titleEle?.getAttribute("title") || "未知标题";

    console.debug(`${N}🎬 发现视频: ${title} (${bvid})`);

    // 创建并添加按钮
    const button = createWatchLaterButton();
    card.style.position = "relative";
    card.appendChild(button);

    // 按钮点击事件
    button.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (
        button.classList.contains("loading") ||
        button.classList.contains("added")
      ) {
        return;
      }

      button.classList.add("loading");
      button.innerHTML = `
        <svg class="loading-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 2a6 6 0 0 1 6 6h-2a4 4 0 0 0-4-4V2z"/>
        </svg>
        <span>添加中...</span>
      `;

      try {
        console.log(`${N}🔄 开始转换 BVID: ${bvid}`);
        const aid = await bvidToAid(bvid);
        console.log(`${N}✅ BVID: ${bvid} -> AID: ${aid}`);

        const csrf = getCsrf();
        console.log(`${N}🔑 CSRF: ${csrf}`);

        if (!csrf) {
          throw new Error("未找到 CSRF Token，请确保已登录");
        }

        console.log(`${N}📤 添加到稍后播: ${title} (AID: ${aid})`);
        await addToWatchLater(aid, csrf);

        button.classList.remove("loading");
        button.classList.add("added");
        button.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
          </svg>
          <span>已添加</span>
        `;
        console.log(`${N}✅ 成功添加: ${title}`);
      } catch (error) {
        console.error(`${N}❌ 添加失败:`, error);
        button.classList.remove("loading");
        button.classList.add("error");
        button.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
          </svg>
          <span>失败</span>
        `;
        setTimeout(() => {
          button.classList.remove("error");
          button.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2zm0 1a5 5 0 1 1 0 10A5 5 0 0 1 8 3zm-.5 1.5v3.793l2.146 2.147.708-.708L8 7.378V4.5h-1z"/>
            </svg>
            <span>稍后播</span>
          `;
        }, 2000);
      }
    };
  };

  // 观察器：监听新视频卡片的出现
  const observeVideoCards = () => {
    const observer = new MutationObserver((mutations) => {
      const cards = document.querySelectorAll(".history-card");
      cards.forEach(processVideoCard);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // 处理已存在的卡片
    const cards = document.querySelectorAll(".history-card");
    console.log(`${N}🔍 发现 ${cards.length} 个历史视频卡片`);
    cards.forEach(processVideoCard);
  };

  // 添加样式
  const addStyles = () => {
    const style = document.createElement("style");
    style.textContent = `
      .history-watch-later-btn {
        position: absolute;
        top: 8px;
        right: 8px;
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 6px 10px;
        background: rgba(0, 0, 0, 0.6);
        color: #fff;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        z-index: 10;
        transition: all 0.3s;
        backdrop-filter: blur(4px);
      }

      .history-watch-later-btn:hover {
        background: rgba(0, 161, 214, 0.9);
        transform: scale(1.05);
      }

      .history-watch-later-btn.loading {
        background: rgba(255, 152, 0, 0.9);
        cursor: wait;
      }

      .history-watch-later-btn.added {
        background: rgba(76, 175, 80, 0.9);
        cursor: default;
      }

      .history-watch-later-btn.error {
        background: rgba(244, 67, 54, 0.9);
      }

      .history-watch-later-btn svg {
        flex-shrink: 0;
      }

      .history-watch-later-btn .loading-icon {
        animation: rotate 1s linear infinite;
      }

      @keyframes rotate {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      /* 确保按钮在视频卡片悬停时也可见 */
      .history-card {
        position: relative;
      }
    `;
    document.head.appendChild(style);
  };

  // -------------------------------------------------- init - START
  const init = () => {
    console.log(`${N}🚀 初始化历史记录稍后播功能`);
    addStyles();
    observeVideoCards();
  };

  // 等待页面加载完成
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  // -------------------------------------------------- init - END
})();
