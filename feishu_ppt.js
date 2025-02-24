// ==UserScript==
// @name         Feishu PPT Formatter
// @namespace    https://greasyfork.org/users/46393
// @version      1.0
// @description  Batch format fonts and positions of Feishu PPT
// @author       Erimus
// @match        https://*.feishu.cn/wiki/*
// @match        https://*.feishu.cn/slides/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=feishu.cn
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle

// @require      file:///Users/erimus/OneDrive/05ProgramProject/tamper_monkey/feishu_ppt.js
// ==/UserScript==

(function () {
  ("use strict");

  // -------------------------------------------------- common - START
  const N = "[🎨] ";
  console.log(`${N}油猴脚本开始`);

  const cfgKey = "feishu_ppt_formatter";
  // -------------------------------------------------- common - END

  // -------------------------------------------------- add format button - START
  const add_format_button = () => {
    // 创建“Format”按钮
    const fmtBtn = document.createElement("button");
    fmtBtn.textContent = "Format";
    fmtBtn.style.padding = "4px 11px";
    fmtBtn.style.backgroundColor = "rgb(20, 86, 240)";
    fmtBtn.style.color = "#fff";
    fmtBtn.style.border = "1px solid rgb(20, 86, 240)";
    fmtBtn.style.borderRadius = "6px";
    fmtBtn.style.cursor = "pointer";
    fmtBtn.style.position = "fixed";
    fmtBtn.style.bottom = "40px";
    fmtBtn.style.left = "40px";
    fmtBtn.style.fontWeight = "600";
    fmtBtn.style.zIndex = "9999";
    fmtBtn.id = "feishu_ppt_formatter_btn";
    // 点击按钮时执行的操作
    fmtBtn.addEventListener("click", () => {
      console.log(`${N}点击了按钮`);
      // format_blocks_in_page();
      // processActiveSlideElementsWithSimulation();
      changeInputValue("SpacingLine", 2);
      font_family("Barlow");
    });
    // add to body
    document.body.appendChild(fmtBtn);
  };
  add_format_button();
  // -------------------------------------------------- add format button - END
  // -------------------------------------------------- find and format blocks - START

  const format_blocks_in_page = () => {
    const blockList = document.querySelectorAll(".active-slide .shape-block");
    console.log(`${N}找到 ${blockList.length} 个 block`);
    for (let i = 0; i < blockList.length; i++) {
      const block = blockList[i];
      // get block position then click the top left corner
      const rect = block.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      console.log(`点击 block ${i} 的坐标 (${x}, ${y})`);
    }
  };
  // -------------------------------------------------- find and format blocks - END

  const font_family = (fontFamily) => {
    const ffBtn = document.querySelector('div[data-test-id="FontFamily"]');
    if (ffBtn) {
      ffBtn.click();
      const targetFont = document.querySelector(
        `div[data-test-id="${fontFamily}"]`
      );
      if (targetFont) {
        targetFont.click();
      } else {
        alert(`找不到 ${fontFamily} 字体，请先在 PPT 中使用 ${fontFamily} 。`);
      }
    }
  };

  function changeInputValue(id, value) {
    // 找到目标 input 元素
    const inputElement = document.querySelector(
      `div[data-test-id="${id}"] input`
    );

    if (!inputElement) {
      console.error("未找到目标 input 元素");
      return;
    }

    // 模拟用户输入
    // inputElement.focus();
    inputElement.value = value;
    const inputEvent = new Event("input", { bubbles: true, cancelable: true });
    inputElement.dispatchEvent(inputEvent);
    inputElement.blur();

    console.log(`已将值设置为 ${value}，并触发了 input 事件`);
  }

  format_blocks_in_page();
})();
