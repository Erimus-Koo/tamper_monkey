// ==UserScript==
// @name         Instagram AD Blocker
// @version      0.1
// @description  Remove AD in instagram feed
// @author       Erimus
// @namespace    https://greasyfork.org/users/46393
// @icon         https://www.google.com/s2/favicons?sz=64&domain=instagram.com

// @match        *://www.instagram.com*
// ==/UserScript==

(function () {
  ("use strict");

  // -------------------------------------------------- common - START
  const N = "[📸]";
  console.log(`${N} 油猴脚本开始`);

  // -------------------------------------------------- Observer - START
  // 观察对象，等待其出现后，运行函数
  function observe_and_run(
    selector,
    runAfterElementFound,
    autoDisconnect = true
  ) {
    const handledElements = new Set();

    // 创建一个观察器实例
    const observer = new MutationObserver((mutationsList, observer) => {
      // console.log("🍎 Changed:", selector, mutationsList);
      // 如果页面上的元素a已经加载
      document.querySelectorAll(selector).forEach((target) => {
        if (autoDisconnect) {
          observer.disconnect(); // 只处理第一个就停止观察
        }

        // 只在找到时处理一次
        if (!handledElements.has(target)) {
          handledElements.add(target);
          runAfterElementFound(target); // 运行你的函数
        }
      });
    });

    // 开始观察document，观察子节点和后代节点的添加或者删除
    const config = { childList: true, attributes: true, subtree: true };
    observer.observe(document.body, config);
  }
  // -------------------------------------------------- Observer - END

  // -------------------------------------------------- Find & Block - START
  const keywordList = ["赞助内容"];
  const find_and_block_ad = (ele) => {
    for (let span of ele.querySelectorAll("span")) {
      for (let kw of keywordList) {
        if (span.textContent.includes(kw)) {
          ele.style.display = "none";
          return;
        }
      }
    }
  };
  // -------------------------------------------------- Find & Block - END

  // -------------------------------------------------- init - START
  // Find article and block ad
  observe_and_run(`article`, find_and_block_ad);
  // -------------------------------------------------- init - END
})();
