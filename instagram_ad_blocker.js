// ==UserScript==
// @name         Instagram AD Blocker
// @version      0.1
// @description  Remove AD in instagram feed
// @author       Erimus
// @namespace    https://greasyfork.org/users/46393
// @icon         https://www.google.com/s2/favicons?sz=64&domain=instagram.com

// @match        *://www.instagram.com*
// ==/UserScript==

// @require      https://raw.githubusercontent.com/Erimus-Koo/tamper_monkey/master/instagram_ad_blocker.js?v=1026
// @require      file://D:\OneDrive\05ProgramProject\tamper_monkey\instagram_ad_blocker.js
// @require      file:///Users/erimus/OneDrive/05ProgramProject/tamper_monkey/instagram_ad_blocker.js

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
    kwargs = {},
    autoDisconnect = false
  ) {
    const handledElements = new Set();

    // 创建一个观察器实例
    const observer = new MutationObserver((mutationsList, observer) => {
      mutationsList.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            // 确保是元素节点
            if (node.matches(selector)) {
              // console.debug(`${N}🚨 node:`, node);
              processElement(node, observer);
            }
            // 也检查子元素
            node.querySelectorAll(selector).forEach((target) => {
              // console.debug(`${N}🚨 target:`, target);
              processElement(target, observer);
            });
          }
        });
      });
    });

    function processElement(target, observer) {
      if (!handledElements.has(target)) {
        handledElements.add(target);
        runAfterElementFound(target, kwargs);
        if (autoDisconnect) {
          observer.disconnect();
        }
      }
    }

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
          console.log(`${N}FOUND AD 💥💥💥`);
          ele.classList.add("spam");
          ele.style.height = 0;
          ele.style.overflow = "hidden";
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
