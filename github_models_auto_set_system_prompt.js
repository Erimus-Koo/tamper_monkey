// ==UserScript==
// @name         Github Models - Auto Set System Prompt
// @version      0.1.4
// @description  自动记忆并填写系统提示词
// @author       Erimus
// @namespace    https://greasyfork.org/users/46393
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @grant        GM_addStyle

// @match        https://github.com/marketplace/models/*/playground
// ==/UserScript==

(function () {
  "use strict";

  const N = "[🗑] ";
  console.log(`${N}油猴脚本开始`);

  const CONFIG_KEY = "system-prompt";
  const DEFAULT_PROMPT = "你是一个智能助手";

  /**
   * 获取保存的提示词，如果不存在，则返回默认提示词。
   */
  function getSavedPrompt() {
    return localStorage.getItem(CONFIG_KEY) || DEFAULT_PROMPT;
  }

  /**
   * 保存提示词到 localStorage。
   * @param {string} prompt - 要保存的提示词。
   */
  function savePrompt(prompt) {
    localStorage.setItem(CONFIG_KEY, prompt);
    console.log(`${N}提示词已保存:`, prompt);
  }

  /**
   * 初始化脚本功能。
   */
  function init() {
    console.log(`${N}初始化脚本...`);

    // 等待文本框加载，因为某些页面可能需要动态渲染。
    const observer = new MutationObserver(() => {
      const textarea = document.querySelector('textarea[name="systemPrompt"]');
      if (textarea) {
        console.log(`${N}找到文本框，初始化功能...`);

        // 停止监听，因为目标已经找到
        observer.disconnect();

        // 在文本框中填入已保存的提示词 延迟一点 不然会被覆盖
        const savedPrompt = getSavedPrompt();
        setTimeout(() => {
          // 模拟 React 的输入
          Object.getOwnPropertyDescriptor(
            Object.getPrototypeOf(textarea),
            "value"
          ).set.call(textarea, savedPrompt);

          // 派发 'input' 事件
          textarea.dispatchEvent(new Event("input", { bubbles: true }));

          console.log(`${N}已填入并触发 input 事件`);
        }, 1000);

        // 监听用户输入，自动保存新的提示词
        textarea.addEventListener("input", () => {
          console.log(`${N}检测到提示词更新:`, textarea.value);
          savePrompt(textarea.value);
        });
      }
    });

    // 开始监听 DOM 变化
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // 启动脚本
  init();
})();
