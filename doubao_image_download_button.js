// ==UserScript==
// @name         豆包图片下载
// @namespace    https://greasyfork.org/users/46393
// @version      0.1
// @description  拦截豆包 AI 生图的图片地址，提供下载按钮
// @author       Erimus
// @match        https://www.doubao.com/chat/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=doubao.com
// @grant        none
// ==/UserScript==

// @require      file:///Users/erimus/OneDrive/05ProgramProject/tamper_monkey/doubao_image_download_button.js
// @require      https://raw.githubusercontent.com/Erimus-Koo/tamper_monkey/master/doubao_image_download_button.js?v=1

/**
 * 豆包改版后用 canvas 渲染图片，无法直接拿 img.src
 * 三路拦截：fetch / XHR / Image.src
 */

(function () {
  "use strict";

  const SN = "🖼️ [豆包图片下载]";
  console.log(SN, "脚本启动");

  let latestUrl = null;
  let latestSize = null; // bytes，null 表示未知

  function isTargetImageUrl(url) {
    return typeof url === "string" && url.includes("byteimg.com");
  }

  function formatSize(bytes) {
    if (!bytes) return "";
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}M`;
    return `${Math.round(bytes / 1024)}K`;
  }

  function onNewImageCaptured(source, url, size = null) {
    const shortName = url.split("/").pop().split("?")[0];
    console.log(SN, `✅ [${source}] ${shortName}`, size ? formatSize(size) : "");
    latestUrl = url;
    latestSize = size;
    updateUI();
  }

  // ---- 拦截 fetch ----
  const _originalFetch = window.fetch;
  window.fetch = function (...args) {
    const url = (args[0] instanceof Request ? args[0].url : args[0]) || "";
    if (!isTargetImageUrl(url)) return _originalFetch.apply(this, args);
    const promise = _originalFetch.apply(this, args);
    promise.then((res) => {
      const size = parseInt(res.headers.get("content-length") || "0", 10) || null;
      onNewImageCaptured("fetch", url, size);
    }).catch(() => {
      onNewImageCaptured("fetch", url, null);
    });
    return promise;
  };

  // ---- 拦截 XHR ----
  const _originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    if (isTargetImageUrl(url)) onNewImageCaptured("XHR", url, null);
    return _originalOpen.apply(this, [method, url, ...rest]);
  };

  // ---- 拦截 Image.src ----
  const _OriginalImage = window.Image;
  window.Image = function (...args) {
    const img = new _OriginalImage(...args);
    const _desc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");
    Object.defineProperty(img, "src", {
      set(val) {
        if (isTargetImageUrl(val)) onNewImageCaptured("Image.src", val, null);
        _desc.set.call(this, val);
      },
      get() { return _desc.get.call(this); },
      configurable: true,
    });
    return img;
  };
  window.Image.prototype = _OriginalImage.prototype;

  // ---- UI ----
  const wrapper = document.createElement("div");
  Object.assign(wrapper.style, {
    position: "fixed",
    bottom: "8px",
    right: "8px",
    zIndex: "9999",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "2px",
    maxWidth: "80px",
  });

  // 缩略图：平时显示，hover 时隐藏（不遮挡操作）
  const thumb = document.createElement("img");
  Object.assign(thumb.style, {
    width: "80px",
    height: "auto",
    borderRadius: "4px",
    border: "1px solid #fff4",
    display: "none",         // 未捕获时不占位
    opacity: "1",
    pointerEvents: "none",
    transition: "opacity 0.15s",
  });
  wrapper.appendChild(thumb);

  // 下载按钮：始终可见
  const btn = document.createElement("button");
  btn.innerText = "下载图片";
  Object.assign(btn.style, {
    padding: "2px 10px",
    borderRadius: "4px",
    backgroundColor: "#06f9",
    color: "white",
    border: "none",
    cursor: "pointer",
    fontSize: "12px",
    lineHeight: "1.5",
    width: "100%",
  });
  wrapper.appendChild(btn);
  document.body.appendChild(wrapper);

  // hover 时隐藏缩略图，不遮挡按钮操作
  wrapper.addEventListener("mouseenter", () => {
    thumb.style.opacity = "0";
  });
  wrapper.addEventListener("mouseleave", () => {
    thumb.style.opacity = "1";
  });

  function updateUI() {
    if (!latestUrl) {
      thumb.style.display = "none";
      btn.innerText = "下载图片";
      btn.style.backgroundColor = "#06f9";
      return;
    }
    // 更新缩略图 src（display:block 让它占位，opacity 由 hover 控制）
    thumb.src = latestUrl;
    thumb.style.display = "block";
    // 更新按钮文字
    const sizeStr = latestSize ? `(${formatSize(latestSize)})` : "";
    btn.innerText = `下载${sizeStr}`;
    btn.style.backgroundColor = "#0af9";
  }

  btn.addEventListener("click", function () {
    if (!latestUrl) {
      alert("还没捕获到图片，请滚动到目标图片");
      return;
    }
    downloadUrl(latestUrl);
  });

  function downloadUrl(url) {
    const filename = url.split("/").pop().split("?")[0] || "download.jpg";
    console.log(SN, "⬇️ 开始下载:", filename);
    _originalFetch(url)
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          URL.revokeObjectURL(a.href);
          document.body.removeChild(a);
        }, 1500);
      })
      .catch((err) => {
        console.error(SN, "下载失败:", err);
        window.open(url, "_blank");
      });
  }

  // ---- 快捷键 Ctrl+Q / Alt+Q / Alt+1 ----
  document.addEventListener("keydown", function (e) {
    if (
      (e.ctrlKey && e.key.toLowerCase() === "q") ||
      (e.altKey && e.key.toLowerCase() === "q") ||
      (e.altKey && e.key.toLowerCase() === "1")
    ) {
      console.log(SN, "⌨️ 快捷键触发下载");
      btn.click();
    }
  });
})();
