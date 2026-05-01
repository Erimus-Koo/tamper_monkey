// ==UserScript==
// @name         Shanghai Library Toolkit
// @version      0.1.0
// @description  Convert Shanghai Library's Book Meta Data to Markdown Front Matter. Filter rent available libraries.
// @author       Erimus
// @namespace    https://greasyfork.org/users/46393
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle

// @match        *://*.library.sh.cn/*
// ==/UserScript==

/* 功能说明
====================
*/

(function () {
  ("use strict");

  // -------------------------------------------------- common - START
  N = "[📖] ";
  console.log(`${N}油猴脚本开始`);

  const list2yaml = (arr) => arr.map((c) => `  - ${c}`).join(`\n`);
  const currentUrl = window.location.href;
  const getUrl = () => window.location.href;
  // -------------------------------------------------- common - END

  // -------------------------------------------------- Copy Meta - START
  const meta2md = () => {
    // 读取书名
    let title = document.querySelector(".media-body>h3").textContent.trim();
    title = title.replace(/[\s\/]+$/, ""); //remove right side useless letters
    console.debug(`${N}title:`, title);

    // 获取当前页面的网址
    const url = window.location.href.split("?")[0];
    console.debug(`${N}url:`, url);

    // 读取作者
    const authorList = Array.from(
      document.querySelectorAll(
        'span.author-data[property="author"],span.author-data[property="creator"]',
      ),
    )?.map((a) => a.querySelector("a").textContent.trim());
    console.debug(`${N}authorList:`, authorList);

    // 读取译者等
    let contributorDict = {};
    Array.from(
      document.querySelectorAll('span.author-data[property="contributor"]'),
    ).forEach((a) => {
      let name = a.querySelector("a")?.textContent.trim();
      let role = a
        .querySelector("a + span")
        ?.textContent.replace(/[()（）]/g, "")
        .trim();
      if (["译", "訳"].includes(role)) {
        role = "Translator";
      }
      if (role) {
        if (!(role in contributorDict)) {
          contributorDict[role] = [];
        }
        contributorDict[role].push(name);
      }
    });
    console.debug(`${N}contributorDict:`, contributorDict);
    let contributorMeta = "";
    for (role in contributorDict) {
      contributorMeta += `${role}:\n`;
      contributorMeta += list2yaml(contributorDict[role]);
    }

    // 获取通用信息
    let metaDict = {};
    Array.from(document.querySelectorAll("#table-detail tr")).forEach((row) => {
      const th = row.querySelector("th").textContent.replace(/:/g, "").trim();
      const td = row.querySelector("td").textContent.trim();
      metaDict[th] = td;
    });
    console.debug(`${N}metaDict:`, metaDict, metaDict["ISBN"]);

    // 读取封面
    let cover =
      window.location.origin +
      document
        .querySelector('img[referrerpolicy="no-referrer"]')
        .getAttribute("src");

    // 根据规则转换格式
    const frontMatter = `---
Title: "${title}"
Author:
${list2yaml(authorList)}
Publisher: ${metaDict["出版社"] || metaDict["Published"]}
Publication Date: ${metaDict["出版时间"] || metaDict["Publication Dates"]}
ISBN: "${metaDict["ISBN"]}"
索书号: ${metaDict["索书号"] || metaDict["Call Number"]}
上图网址: ${url}
tags: 
${contributorMeta}
coverUrl: ${cover}
---

# ${title}

![Cover|200](${cover})
`;

    // 复制到剪贴板
    navigator.clipboard.writeText(frontMatter);
  };

  if (currentUrl.includes("library.sh.cn/Record")) {
    // 在当前页面添加复制信息按钮，点击即把信息复制到剪切板。
    const button = document.createElement("button");
    button.innerText = "Copy Meta";
    button.style.position = "fixed";
    button.style.bottom = "1em";
    button.style.right = "1em";
    button.style.zIndex = "1000";
    button.style.padding = "1em";
    button.style.backgroundColor = "#06FC";
    button.style.color = "#fff";
    button.style.border = "none";
    button.style.borderRadius = "1em";
    button.style.cursor = "pointer";

    document.body.appendChild(button);

    button.addEventListener("click", meta2md);
  }
  // -------------------------------------------------- Copy Meta - END

  // -------------------------------------------------- Observer - START
  // 观察对象，等待其出现后，运行函数
  function observe_and_run(
    selector,
    runAfterElementFound,
    autoDisconnect = true,
  ) {
    console.log(`Start Observing`);
    const handledElements = new Set();

    const observer = new MutationObserver(() => {
      let found = false;

      document.querySelectorAll(selector).forEach((target) => {
        if (!handledElements.has(target)) {
          handledElements.add(target);
          runAfterElementFound(target);
          found = true;
        }
      });

      // 处理完第一个匹配元素后断开观察
      if (autoDisconnect && found) {
        observer.disconnect();
      }
    });

    const config = { childList: true, attributes: true, subtree: true };
    observer.observe(document.body, config);
  }
  // -------------------------------------------------- Observer - END

  // -------------------------------------------------- Get Available - START
  // 查看全部馆藏
  const getAllBtn = "#locationOptions~p>button.btn-primary";
  const showAllAvailable = (btn) => {
    btn.click();
  };

  const libSelector = ".holdings-tab .branch";
  const hideUnavailable = (lib) => {
    {
      let libAvailable = false;
      for (let loc of lib.querySelectorAll(".location-item")) {
        let locAvailable = false;
        loc.querySelectorAll("tr").forEach((tr, i) => {
          //skip table header
          if (i != 0) {
            const td = tr.querySelectorAll("td");
            let hasLoan = false;
            let hasReturned = false;
            let hasReserve = false;

            // 遍历每个td，检查文本内容
            td.forEach((cell) => {
              const text = cell.textContent;
              if (
                text.includes("外借") ||
                text.includes("Reference Circulation Collection") ||
                text.includes("General loan materials")
              ) {
                hasLoan = true;
              }
              if (text.includes("已归还") || text.includes("Available")) {
                hasReturned = true;
              }
              if (
                text.includes("预约") ||
                text.toLowerCase().includes("reserve")
              ) {
                hasReserve = true;
              }
            });

            // 满足条件即 available
            if ((hasLoan && hasReturned) || hasReserve) {
              libAvailable = true;
              locAvailable = true;
            }
          }
        });
        if (!locAvailable) loc.setAttribute("available", false);
      }
      if (!libAvailable) lib.setAttribute("available", false);
    }
  };

  if (currentUrl.includes("library.sh.cn/Record")) {
    // click show all available btn
    observe_and_run(getAllBtn, showAllAvailable);

    // hide unavailable
    observe_and_run(libSelector, hideUnavailable, false);
    GM_addStyle(`*[available="false"]{opacity:.5;}`);
    // 点击预约后出现的弹窗 被嵌套在场馆里 需要特殊处理让它不透明
    GM_addStyle(
      `*[available="false"]:has(#placeHoldRemind[style="display: block;"]){opacity:1;}`,
    );
  }

  // -------------------------------------------------- Get Available - END

  // -------------------------------------------------- Add External Link - START
  // titleDict = {urlKeyword: titleSelector}
  const titleDict = {
    // 搜索结果
    "https://vufind.library.sh.cn/Search/Results": ".result-body a.title",
    // 借阅排行榜
    "https://www.library.sh.cn/info/billboard": "dt.book-info",
    // 书籍详情
    "library.sh.cn/Record": ".media-body>h3",
    // 我的借阅
    "https://www.library.sh.cn/myLibrary/borrowBooks": ".c-title>.name",
  };

  let titleSelector = titleDict[currentUrl];
  if (!titleSelector) {
    for (let [key, value] of Object.entries(titleDict)) {
      if (currentUrl.includes(key)) {
        titleSelector = value;
        break;
      }
    }
  }

  if (titleSelector) {
    const addExternalLink = (titleDom) => {
      const title = titleDom.textContent.trim();
      console.log("🚀 ~ title:", title);
      const doubanUrl = `https://search.douban.com/book/subject_search?search_text=${title}&cat=1001`;
      const zlibUrl = `https://z-library.sk/s/?q=${title}`;
      const link = `<div class="external-link">
<a href="${doubanUrl}">豆瓣</a> <a href="${zlibUrl}">Z-Lib</a>
</div>`;
      console.debug(`${N} 🚨 link:`, link);
      titleDom.insertAdjacentHTML("afterend", link);
    };
    observe_and_run(titleSelector, addExternalLink, false);

    GM_addStyle(`
.external-link a {
display:inline-block;
font-size: 14px;
padding: 4px 8px;
margin: 0 4px 4px 0; 
border-radius: 9em; 
background: #0f03;
}`);
  }
  // -------------------------------------------------- Add External Link - END
})();
