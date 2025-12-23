// ==UserScript==
// @name         模搭AIGC
// @namespace    http://tampermonkey.net/
// @version      2025-04-25
// @description  try to take over the world!
// @author       You
// @match        https://www.modelscope.cn/aigc/imageGeneration*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=modelscope.cn
// @grant        none

// @require      file://D:\OneDrive\05ProgramProject\tamper_monkey\modelscope_aigc.js
// @require      file:///Users/erimus/OneDrive/05ProgramProject/tamper_monkey/modelscope_aigc.js
// ==/UserScript==

// @require      file://D:\OneDrive\05ProgramProject\tamper_monkey\modelscope_aigc.js
// @require      file:///Users/erimus/OneDrive/05ProgramProject/tamper_monkey/modelscope_aigc.js
// @require      https://raw.githubusercontent.com/Erimus-Koo/tamper_monkey/master/modelscope_aigc.js?v=20250609

(function () {
  ("use strict");
  console.log("模搭AIGC 油猴脚本开始");

  // ========== Vimium Clickable: .muse-pic-item-footer > .tool ========== START

  // 让页面上的 .muse-pic-item-footer > .tool 能用 Vimium 键盘聚焦和点击
  const VIMIUM_TOOL_SELECTOR = ".muse-pic-item-footer .tool>span";

  function makeToolClickable(node) {
    console.log("tool btn:", node);
    if (node.dataset.vimiumReady) return;
    node.dataset.vimiumReady = "1";
    node.setAttribute("tabindex", "0");
    node.setAttribute("role", "button");
    node.style.cursor = "pointer";
  }

  // 首次处理已有目标元素
  document.querySelectorAll(VIMIUM_TOOL_SELECTOR).forEach(makeToolClickable);

  // 监听后续新增目标元素
  const vimiumToolObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          if (node.matches && node.matches(VIMIUM_TOOL_SELECTOR)) {
            makeToolClickable(node);
          }
          node.querySelectorAll &&
            node
              .querySelectorAll(VIMIUM_TOOL_SELECTOR)
              .forEach(makeToolClickable);
        }
      });
    });
  });
  vimiumToolObserver.observe(document.body, { childList: true, subtree: true });

  // ========== Vimium Clickable: .muse-pic-item-footer > .tool ========== END

  // ========== 快捷键图片下载按钮（Ctrl+Q Alt+Q Alt+1） ========== START

  // 快捷键：Ctrl+Q / Alt+Q / Alt+1 触发下载
  document.addEventListener("keydown", function (e) {
    // 判断快捷键（和豆包一样）
    const isMac =
      navigator.userAgentData && navigator.userAgentData.platform === "macOS";
    const modifier = isMac ? e.ctrlKey : e.altKey;
    const key = e.key.toLowerCase();

    if (
      (e.ctrlKey && key === "q") ||
      (e.altKey && key === "q") ||
      (e.altKey && key === "1")
    ) {
      // 尝试点击下载按钮
      const dlBtn = document.querySelector(
        '.successArea [data-autolog*="key=download"]'
      );
      if (dlBtn) {
        dlBtn.click();
        console.log("快捷键下载按钮已触发");
      } else {
        alert("找不到下载按钮！");
      }
    }
  });

  // ========== 快捷键图片下载按钮（Ctrl+Q Alt+Q Alt+1） ========== END

  // ========== 快捷键删除图片项（Ctrl+X Alt+X） ========== START

  let mouseY_modapic = 0; // 记录当前鼠标Y

  document.addEventListener("mousemove", (e) => {
    mouseY_modapic = e.clientY;
  });

  // 删除操作：定位到鼠标Y位置的.pictureItem，然后点击删除并聚焦确认按钮
  function modapic_deleteAtMouseY() {
    // 找到所有.pictureItem
    const blocks = Array.from(document.querySelectorAll(".pictureItem"));
    let targetBlock = null;

    for (let i = blocks.length - 1; i >= 0; i--) {
      const rect = blocks[i].getBoundingClientRect();
      if (mouseY_modapic >= rect.top && mouseY_modapic <= rect.bottom) {
        targetBlock = blocks[i];
        break;
      }
    }
    if (!targetBlock) {
      alert("无法定位到目标图片项");
      return;
    }

    // 找到该块里的删除按钮
    const delBtn = targetBlock.querySelector(
      '.muse-pic-item-footer [aria-label="delete"]'
    );
    if (!delBtn) {
      alert("图片项未找到删除按钮");
      return;
    }
    delBtn.click();

    // 等弹窗出来后，聚焦确认删除按钮
    setTimeout(() => {
      const confBtn = document.querySelector(
        '.ant-popconfirm-buttons [data-autolog="key=delete&clk=true"]'
      );
      if (confBtn) {
        confBtn.focus();
      }
    }, 500);
  }

  // 快捷键触发（Ctrl+X 或 Alt+X）删除
  document.addEventListener("keydown", function (e) {
    const key = e.key.toLowerCase();
    if ((e.ctrlKey && key === "x") || (e.altKey && key === "x")) {
      modapic_deleteAtMouseY();
    }
  });

  // ========== 快捷键删除图片项（Ctrl+X Alt+X） ========== END

  // ========== picHistoryArea 逐步批量删除无效图片按钮 ========== START

  function stepDeleteInvalidPic_inHistoryArea() {
    // 找到第一个无效图片
    const item = document.querySelector(
      '.picHistoryArea div[style*="https://img.alicdn.com/imgextra/i2/"]'
    );
    if (!item) {
      // alert("所有无效图片已删除完毕。");
      return;
    }

    // 删除按钮选择器
    const delBtn = item.querySelector(
      '[aria-label="delete"], .muse-pic-item-footer [aria-label="delete"]'
    );
    if (delBtn) {
      delBtn.click();

      // 等待弹窗，然后确认
      setTimeout(() => {
        const confirmBtn = document.querySelector(
          '.ant-popconfirm-buttons [data-autolog="key=delete&clk=true"]'
        );
        if (confirmBtn) {
          confirmBtn.click();
        }
        // 等1秒后再进行下一轮查找并删除
        setTimeout(() => {
          stepDeleteInvalidPic_inHistoryArea();
        }, 1000);
      }, 400);
    } else {
      // 如果没有找到删除按钮，直接等待1秒再查找下一个
      setTimeout(() => {
        stepDeleteInvalidPic_inHistoryArea();
      }, 1000);
    }
  }

  // 快捷键触发，比如 Alt+Shift+D
  document.addEventListener("keydown", function (e) {
    if (e.altKey && e.shiftKey && e.key.toLowerCase() === "d") {
      stepDeleteInvalidPic_inHistoryArea();
    }
  });

  // ========== picHistoryArea 逐步批量删除无效图片按钮 ========== END

  // ========== 快捷键生图按钮（Alt+R） ========== START

  document.addEventListener("keydown", function (e) {
    // 检查 Alt+R (不区分大小写)
    if (e.altKey && e.key.toLowerCase() === "r") {
      const genBtn = document.querySelector(
        '[data-autolog="key=startGeneration&clk=true"]'
      );
      if (genBtn) {
        genBtn.click();
        console.log("快捷键生图按钮已触发");
      } else {
        alert("找不到生图按钮！");
      }
    }
  });

  // ========== 快捷键生图按钮（Alt+R） ========== END

  // ========== Alt+Shift+R 自动填充描述并点击生图 ========== START

  async function fillDescriptionTextAreaWithClipboard() {
    const descArea = document.querySelector("#description");
    if (!descArea) {
      alert("未找到 #description 区域");
      return;
    }
    try {
      const clipText = await navigator.clipboard.readText();

      descArea.value = clipText;
      descArea.dispatchEvent(new Event("input", { bubbles: true }));
      descArea.dispatchEvent(new Event("change", { bubbles: true }));

      descArea.focus();
      descArea.select();
    } catch (e) {
      alert("无法读取剪贴板内容：" + e);
    }
  }

  document.addEventListener("keydown", function (e) {
    // Alt+Shift+R
    if (e.shiftKey && e.key.toLowerCase() === "r") {
      fillDescriptionTextAreaWithClipboard();
    }
  });

  // ========== Alt+Shift+R 自动填充描述并点击生图 ========== END
})();
