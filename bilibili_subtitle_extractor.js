// ==UserScript==
// @name         B站字幕提取器 Subtitle Extractor
// @version      0.1.0
// @description  拦截B站字幕请求，一键复制字幕文本，方便粘贴到Markdown。
// @author       Erimus
// @namespace    https://greasyfork.org/users/46393
// @icon         https://www.google.com/s2/favicons?sz=64&domain=bilibili.com

// @match        *://*.bilibili.com/video/*
// @match        *://*.bilibili.com/bangumi/play/*
// @match        *://*.bilibili.com/medialist/play/*
// @match        *://*.bilibili.com/list/*

// @grant        GM_setClipboard
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

/* 功能说明
====================
B站字幕提取器

1. 自动拦截 B站 AI 字幕 / 手动字幕的请求
2. 在播放器底部字幕控件上 hover 时浮出"复制字幕"按钮，点击后弹出预览与一键复制
3. 字幕文本格式化：
   - 根据句子间时间间隔自动分段（间隔 > 1.5 秒则换行）
   - 标注语言和字幕类型（AI字幕 / 手动字幕）
4. 复制格式适合粘贴到 Markdown 文件
====================
*/

(function () {
  "use strict";

  // -------------------------------------------------- common - START
  const N = "📝 [字幕提取器] ";
  console.log(`${N}油猴脚本开始`);

  // 存储拦截到的字幕数据 { url: string, data: object }[]
  let capturedSubtitles = [];

  // -------------------------------------------------- Observer - START
  // 观察对象，等待其出现后，运行函数
  function observe_and_run(
    selector,
    runAfterElementFound,
    autoDisconnect = true,
  ) {
    const handledElements = new Set();
    const observer = new MutationObserver(() => {
      document.querySelectorAll(selector).forEach((target) => {
        if (autoDisconnect) observer.disconnect();
        if (!handledElements.has(target)) {
          handledElements.add(target);
          runAfterElementFound(target);
        }
      });
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }
  // -------------------------------------------------- Observer - END

  // -------------------------------------------------- hook fetch/XHR - START
  // 在 document-start 时尽早注入，防止漏掉请求
  const SUBTITLE_HOST = "aisubtitle.hdslb.com";

  // hook fetch
  const originalFetch = unsafeWindow.fetch;
  unsafeWindow.fetch = function (...args) {
    const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
    const result = originalFetch.apply(this, args);

    if (url.includes(SUBTITLE_HOST)) {
      console.log(`${N}🎯 拦截到字幕请求(fetch): ${url}`);
      result.then((response) => {
        const cloned = response.clone();
        cloned
          .json()
          .then((data) => {
            console.log(`${N}✅ 字幕数据获取成功:`, data);
            storeSubtitle(url, data);
          })
          .catch((e) => {
            console.warn(`${N}⚠️ 字幕JSON解析失败:`, e);
          });
      });
    }
    return result;
  };

  // hook XMLHttpRequest
  const OriginalXHR = unsafeWindow.XMLHttpRequest;
  unsafeWindow.XMLHttpRequest = function () {
    const xhr = new OriginalXHR();
    const originalOpen = xhr.open.bind(xhr);
    let requestUrl = "";

    xhr.open = function (method, url, ...rest) {
      requestUrl = url || "";
      return originalOpen(method, url, ...rest);
    };

    xhr.addEventListener("load", function () {
      if (requestUrl.includes(SUBTITLE_HOST)) {
        console.log(`${N}🎯 拦截到字幕请求(XHR): ${requestUrl}`);
        try {
          const data = JSON.parse(xhr.responseText);
          console.log(`${N}✅ 字幕数据获取成功(XHR):`, data);
          storeSubtitle(requestUrl, data);
        } catch (e) {
          console.warn(`${N}⚠️ 字幕JSON解析失败(XHR):`, e);
        }
      }
    });

    return xhr;
  };
  // 继承静态属性
  Object.defineProperties(unsafeWindow.XMLHttpRequest, {
    ...Object.getOwnPropertyDescriptors(OriginalXHR),
  });
  // -------------------------------------------------- hook fetch/XHR - END

  // -------------------------------------------------- 字幕存储与解析 - START
  function storeSubtitle(url, data) {
    // 检查是否已存在（防止重复）
    const exists = capturedSubtitles.find((s) => s.url === url);
    if (exists) {
      console.debug(`${N}字幕已存在，跳过`);
      return;
    }

    capturedSubtitles.push({ url, data });
    console.log(`${N}📦 当前已捕获字幕数: ${capturedSubtitles.length}`);

    // 首次捕获时创建按钮，之后只更新
    if (!subtitleBtn) createSubtitleBtn();
    else updateSubtitleBtn();
  }

  /**
   * 秒数转 SRT 时间格式 00:00:00,000
   */
  function secToSrt(sec) {
    const ms = Math.round(sec * 1000);
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const f = ms % 1000;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(f).padStart(3, "0")}`;
  }

  /**
   * SRT 格式：每句一个编号块，带时间轴
   */
  function subtitleToSrt(body) {
    if (!body || body.length === 0) return "";
    return body
      .map(
        (item, i) =>
          `${i + 1}\n${secToSrt(item.from)} --> ${secToSrt(item.to)}\n${item.content}`,
      )
      .join("\n\n");
  }

  /**
   * 纯文字版：每句一行，不加标点
   */
  function subtitleToSmartText(body) {
    if (!body || body.length === 0) return "";
    return body.map((item) => item.content).join("\n");
  }

  /**
   * 获取字幕的可读描述（语言 + 类型）
   */
  function getSubtitleLabel(data) {
    const langMap = {
      zh: "中文",
      "zh-Hans": "简体中文",
      "zh-Hant": "繁体中文",
      en: "英文",
      ja: "日文",
      ko: "韩文",
    };
    const lang = langMap[data.lang] || data.lang || "未知语言";
    const isAI = data.type === "AIsubtitle";
    const typeLabel = isAI ? "🤖 AI字幕" : "✍️ 手动字幕";
    return `${typeLabel} · ${lang}`;
  }
  // -------------------------------------------------- 字幕存储与解析 - END

  // -------------------------------------------------- UI - START
  let subtitleBtn = null;
  let subtitleModal = null;

  function injectStyles() {
    const style = document.createElement("style");
    style.setAttribute("data-id", "subtitle-extractor");
    style.textContent = `
      /* 字幕提取按钮：圆形，紧跟在原字幕按钮右侧 */
      #subtitle-extractor-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.6em;
        height: 1.6em;
        border-radius: 50%;
        font-size: 12px;
        font-family: system-ui, sans-serif;
        cursor: pointer;
        border: none;
        background: #fb7299cc;
        color: #fff;
        transition: background .2s;
        vertical-align: middle;
        margin-left: 4px;
        line-height: 1;
      }
      #subtitle-extractor-btn:hover { background: #fb7299; }

      /* 弹窗遮罩 */
      #subtitle-extractor-modal {
        position: fixed;
        inset: 0;
        z-index: 999999;
        background: #0007;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: system-ui, sans-serif;
      }

      /* 弹窗主体 */
      #subtitle-extractor-modal .modal-box {
        background: #1a1a2e;
        color: #eee;
        border-radius: 12px;
        width: min(720px, 90vw);
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 8px 40px #0008;
      }

      /* 弹窗头部 */
      #subtitle-extractor-modal .modal-header {
        display: flex;
        align-items: center;
        gap: .75em;
        padding: .75em 1em;
        background: #16213e;
        flex-shrink: 0;
      }
      #subtitle-extractor-modal .modal-header h3 {
        flex: 1;
        margin: 0;
        font-size: 15px;
        font-weight: 600;
      }
      #subtitle-extractor-modal .modal-header select {
        background: #0f3460;
        color: #eee;
        border: 1px solid #444;
        border-radius: .4em;
        padding: .25em .5em;
        font-size: 13px;
        cursor: pointer;
      }
      #subtitle-extractor-modal .modal-close {
        background: none;
        border: none;
        color: #aaa;
        font-size: 20px;
        cursor: pointer;
        padding: 0 .25em;
        line-height: 1;
      }
      #subtitle-extractor-modal .modal-close:hover { color: #fff; }

      /* 格式切换 */
      #subtitle-extractor-modal .format-toggle {
        display: flex;
        gap: .25em;
        background: #0f3460;
        border-radius: .4em;
        padding: 2px;
      }
      #subtitle-extractor-modal .format-toggle label {
        padding: .2em .65em;
        border-radius: .3em;
        font-size: 12px;
        cursor: pointer;
        color: #aaa;
        transition: background .15s, color .15s;
        user-select: none;
      }
      #subtitle-extractor-modal .format-toggle label.active {
        background: #fb7299;
        color: #fff;
      }
      #subtitle-extractor-modal .format-toggle input[type="radio"] {
        display: none;
      }

      /* 字幕预览区 */
      #subtitle-extractor-modal .modal-preview {
        flex: 1;
        overflow-y: auto;
        padding: 1em 1.25em;
        font-size: 14px;
        line-height: 1.8;
        white-space: pre-wrap;
        word-break: break-all;
        background: #12122a;
        color: #ddd;
      }

      /* 底部操作区 */
      #subtitle-extractor-modal .modal-footer {
        display: flex;
        align-items: center;
        gap: .75em;
        padding: .75em 1em;
        background: #16213e;
        flex-shrink: 0;
      }
      #subtitle-extractor-modal .modal-footer .info-text {
        flex: 1;
        font-size: 12px;
        color: #888;
      }
      #subtitle-extractor-modal .btn-copy {
        padding: .4em 1.2em;
        border-radius: 2em;
        border: none;
        background: #fb7299;
        color: #fff;
        font-size: 13px;
        cursor: pointer;
        transition: background .2s;
      }
      #subtitle-extractor-modal .btn-copy:hover { background: #f05080; }
      #subtitle-extractor-modal .btn-copy.copied {
        background: #4caf50;
      }
    `;
    document.head.appendChild(style);
  }

  function createSubtitleBtn() {
    if (subtitleBtn) return;
    injectStyles();

    // 找到原字幕按钮，插到它后面
    const subtitleCtrl = document.querySelector(
      ".bpx-player-ctrl-subtitle-result",
    );
    if (!subtitleCtrl) {
      console.warn(`${N}⚠️ 未找到字幕控件，按钮插入失败`);
      return;
    }

    subtitleBtn = document.createElement("button");
    subtitleBtn.id = "subtitle-extractor-btn";
    subtitleBtn.title = "点击预览并复制字幕";
    subtitleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openModal();
    });
    // 插入到原字幕按钮的后面（兄弟节点）
    subtitleCtrl.insertAdjacentElement("afterend", subtitleBtn);
    console.log(`${N}📌 字幕按钮已插入`);
    updateSubtitleBtn();
  }

  function updateSubtitleBtn() {
    if (!subtitleBtn) return;
    subtitleBtn.textContent = capturedSubtitles.length.toString();
    const labels = capturedSubtitles.map((s) => getSubtitleLabel(s.data));
    subtitleBtn.title = `已捕获字幕: ${labels.join(" / ")}\n点击查看`;
  }

  // 当前格式：'smart' | 'srt'
  let currentFormat = "smart";
  let currentPreviewIndex = 0;

  function openModal() {
    if (capturedSubtitles.length === 0) {
      alert("暂未捕获到字幕，请先播放视频等待字幕加载。");
      return;
    }
    if (subtitleModal) subtitleModal.remove();

    subtitleModal = document.createElement("div");
    subtitleModal.id = "subtitle-extractor-modal";

    // 下拉选择（多条字幕时）
    let selectHtml = "";
    if (capturedSubtitles.length > 1) {
      const options = capturedSubtitles
        .map(
          (s, i) => `<option value="${i}">${getSubtitleLabel(s.data)}</option>`,
        )
        .join("");
      selectHtml = `<select id="subtitle-select">${options}</select>`;
    }

    subtitleModal.innerHTML = `
      <div class="modal-box">
        <div class="modal-header">
          <h3>📝 字幕预览</h3>
          ${selectHtml}
          <div class="format-toggle">
            <label class="${currentFormat === "smart" ? "active" : ""}">
              <input type="radio" name="fmt" value="smart" ${currentFormat === "smart" ? "checked" : ""}> 纯文字
            </label>
            <label class="${currentFormat === "srt" ? "active" : ""}">
              <input type="radio" name="fmt" value="srt" ${currentFormat === "srt" ? "checked" : ""}> SRT
            </label>
          </div>
          <button class="modal-close" title="关闭">✕</button>
        </div>
        <div class="modal-preview" id="subtitle-preview-text"></div>
        <div class="modal-footer">
          <span class="info-text" id="subtitle-info-text"></span>
          <button class="btn-copy" id="subtitle-copy-btn">复制全部</button>
        </div>
      </div>
    `;

    document.body.appendChild(subtitleModal);

    renderPreview(currentPreviewIndex);

    // 切换字幕来源
    const sel = subtitleModal.querySelector("#subtitle-select");
    if (sel) {
      sel.addEventListener("change", () => renderPreview(parseInt(sel.value)));
    }

    // 切换格式
    subtitleModal.querySelectorAll('input[name="fmt"]').forEach((radio) => {
      radio.addEventListener("change", (e) => {
        currentFormat = e.target.value;
        // 更新 label active 样式
        subtitleModal.querySelectorAll(".format-toggle label").forEach((l) => {
          l.classList.toggle(
            "active",
            l.querySelector("input").value === currentFormat,
          );
        });
        renderPreview(currentPreviewIndex);
      });
    });

    // 复制按钮
    subtitleModal
      .querySelector("#subtitle-copy-btn")
      .addEventListener("click", copyCurrentSubtitle);

    // 关闭按钮
    subtitleModal
      .querySelector(".modal-close")
      .addEventListener("click", closeModal);

    // 点击遮罩关闭
    subtitleModal.addEventListener("click", (e) => {
      if (e.target === subtitleModal) closeModal();
    });

    // ESC 关闭
    const escHandler = (e) => {
      if (e.key === "Escape") {
        closeModal();
        document.removeEventListener("keydown", escHandler);
      }
    };
    document.addEventListener("keydown", escHandler);
  }

  function renderPreview(index) {
    currentPreviewIndex = index;
    const item = capturedSubtitles[index];
    if (!item) return;

    const body = item.data.body;
    const text =
      currentFormat === "srt" ? subtitleToSrt(body) : subtitleToSmartText(body);

    const previewEl = subtitleModal.querySelector("#subtitle-preview-text");
    const infoEl = subtitleModal.querySelector("#subtitle-info-text");

    previewEl.textContent = text;

    const lineCount = body?.length || 0;
    const label = getSubtitleLabel(item.data);
    infoEl.textContent = `${label} · 共 ${lineCount} 句`;
  }

  function copyCurrentSubtitle() {
    const item = capturedSubtitles[currentPreviewIndex];
    if (!item) return;

    const body = item.data.body;
    const text =
      currentFormat === "srt" ? subtitleToSrt(body) : subtitleToSmartText(body);
    const copyBtn = subtitleModal.querySelector("#subtitle-copy-btn");

    const onSuccess = () => {
      copyBtn.textContent = "✅ 已复制";
      copyBtn.classList.add("copied");
      console.log(`${N}✅ 字幕已复制到剪贴板`);
      setTimeout(() => {
        copyBtn.textContent = "复制全部";
        copyBtn.classList.remove("copied");
      }, 2000);
    };

    try {
      GM_setClipboard(text);
      onSuccess();
    } catch (e) {
      navigator.clipboard
        .writeText(text)
        .then(onSuccess)
        .catch(() => {
          console.error(`${N}❌ 复制失败`);
        });
    }
  }

  function closeModal() {
    subtitleModal?.remove();
    subtitleModal = null;
  }
  // -------------------------------------------------- UI - END

  // -------------------------------------------------- init - START
  waitForBodyAndInit();

  function waitForBodyAndInit() {
    // document-start 时 body 可能还不存在，等它出现后注入样式即可
    // 按钮本身在首次捕获到字幕时才懒创建
    if (!document.body) {
      const observer = new MutationObserver(() => {
        if (document.body) {
          observer.disconnect();
          injectStyles();
        }
      });
      observer.observe(document.documentElement, { childList: true });
    }
  }
  // -------------------------------------------------- init - END
})();
