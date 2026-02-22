// ==UserScript==
// @name         Better NotebookLM
// @namespace    http://tampermonkey.net/
// @version      0.0.4
// @description  Save and restore textarea content
// @author       Erimus
// @match        https://notebooklm.google.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=google.com

// @grant        GM_setValue
// @grant        GM_getValue

// ==/UserScript==

/*
README

功能说明：
- 在 NotebookLM 的报告创建对话框中添加"保存"按钮
- 点击"保存"按钮可以保存当前 textarea 中的内容
- 下次打开对话框时会自动填充之前保存的内容

使用方法：
1. 在 NotebookLM 中打开任意笔记本
2. 点击创建报告功能，打开报告创建对话框
3. 在 textarea 中输入你的提示词
4. 点击"保存"按钮保存当前内容
5. 下次打开对话框时会自动填充保存的内容

触发条件：
- 脚本会在检测到 h1 标题、textarea 输入框和主要按钮同时出现时激活
- "保存"按钮会被插入到主要按钮（通常是"Create"按钮）的前面

注意事项：
- 保存的内容会持久化存储在浏览器中
- 每次保存会覆盖之前的内容
- 脚本仅在 notebooklm.google.com 域名下生效
*/

(function () {
  "use strict";

  // 保存和获取文本
  const STORAGE_KEY = "Notebook Custom Prompt";

  // 显示临时提示
  function showTooltip(element, message, duration = 2000) {
    const tooltip = document.createElement("div");
    tooltip.textContent = message;
    tooltip.style.cssText = `
      position: absolute;
      background: #333;
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 10000;
      pointer-events: none;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;

    // 定位到按钮上方
    const rect = element.getBoundingClientRect();
    tooltip.style.left = rect.left + "px";
    tooltip.style.top = rect.top - 35 + "px";

    document.body.appendChild(tooltip);

    setTimeout(() => {
      if (tooltip.parentNode) {
        tooltip.parentNode.removeChild(tooltip);
      }
    }, duration);
  }

  // 监控对话框、textarea 和 button 同时出现
  const observer = new MutationObserver(() => {
    const dialogContainer = document.querySelector(
      'div[class="mat-mdc-dialog-inner-container mdc-dialog__container"]',
    );
    const textarea = document.querySelector(
      'textarea[aria-label="Input to describe the kind of report to create"]',
    );
    const primaryButton = document.querySelector('button[color="primary"]');

    console.log("Observer triggered:", {
      dialogContainer: !!dialogContainer,
      textarea: !!textarea,
      primaryButton: !!primaryButton,
    });

    if (dialogContainer && textarea && primaryButton) {
      // 检查当前 primaryButton 的父元素中是否已经有保存按钮
      const existingSaveBtn = primaryButton.parentElement.querySelector(
        "[data-save-button-added]",
      );

      if (existingSaveBtn) {
        console.log("Save button already exists, skipping");
        return;
      }

      console.log(
        "All elements found, adding save button and filling textarea",
      );

      // 创建保存按钮
      const saveBtn = document.createElement("button");
      saveBtn.textContent = "Save Prompt";
      saveBtn.setAttribute("data-save-button-added", "true");
      saveBtn.style.cssText = `
        margin-right: 8px;
        font-size: 14px;
        background: none;
        border: none;
        color: #999;
        cursor: pointer;
        padding: 8px 12px;
        display: inline-block;
        opacity: 1;
        visibility: visible;
        position: relative;
        z-index: 1;
      `;

      saveBtn.onclick = () => {
        const content = textarea.value;
        localStorage.setItem(STORAGE_KEY, content);
        console.log("Saved content:", content);
        showTooltip(saveBtn, "已保存内容");
      };

      // 将保存按钮插入到 primary button 的前一个兄弟元素位置
      primaryButton.parentElement.insertBefore(saveBtn, primaryButton);
      console.log("Save button added successfully", saveBtn);

      // 自动填充 textarea（如果有保存的内容）
      const savedText = localStorage.getItem(STORAGE_KEY) || "";
      console.log("Attempting to fill textarea with saved text:", savedText);

      if (savedText && !textarea.value) {
        textarea.value = savedText;
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        console.log("Filled textarea with saved content");
      } else {
        console.log(
          "Not filling textarea - either no saved text or textarea already has content",
        );
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
})();
