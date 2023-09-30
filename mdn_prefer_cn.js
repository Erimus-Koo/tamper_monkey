// ==UserScript==
// @name         MDN 优先使用中文
// @description  MDN 教程如果打开的是非中文页面，自动尝试切换到中文。
// @match        *://developer.mozilla.org/*
// @version      0.1
// @author       Erimus
// @grant        none
// @namespace    https://greasyfork.org/users/46393
// @require      https://raw.githubusercontent.com/Erimus-Koo/tamper_monkey/master/mdn_prefer_cn.js
// ==/UserScript==

// @require      file://D:\OneDrive\05ProgramProject\tamper_monkey\mdn_prefer_cn.js
// @require      file:///Users/erimus/OneDrive/05ProgramProject/tamper_monkey/mdn_prefer_cn.js
// @require      https://raw.githubusercontent.com/Erimus-Koo/tamper_monkey/master/mdn_prefer_cn.js

(function (document) {
  // -------------------------------------------------- common - START
  const log = (...args) => console.log("[MDN]", ...args);
  const debug = (...args) => console.debug("[MDN]", ...args);
  log("油猴脚本开始");

  // 判断链接是否含有zh-CN
  if (!window.location.href.includes("zh-CN")) {
    // 尝试点击语言切换按钮
    const languageSwitcherButton = document.querySelector(
      "#languages-switcher-button"
    );
    if (languageSwitcherButton) {
      languageSwitcherButton.click();

      setTimeout(() => {
        // 在展开的语言列表内寻找 a[data-locale="zh-CN"]
        const languageList = document.querySelectorAll(".language-menu a");
        debug("languageList:", languageList);
        let found = false;
        for (const language of languageList) {
          debug("Lang:", language.getAttribute("data-locale"));
          if (language.getAttribute("data-locale") === "zh-CN") {
            language.click();
            found = true;
            break;
          }
        }

        // 如果没找到，则点击前一步的语言切换按钮，关闭菜单
        if (!found) {
          languageSwitcherButton.click();
        }
      }, 500);
    }
  }
})(document);
