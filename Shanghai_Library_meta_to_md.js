// ==UserScript==
// @name         Shanghai Library meta to md
// @version      0.1.0
// @description  Convert Shanghai Library's Book Meta Data to Markdown Front Matter
// @author       Erimus
// @match        *://*.library.sh.cn/Record/*
// @namespace    https://greasyfork.org/users/46393
// ==/UserScript==

/* 功能说明
====================
*/

(function () {
  ("use strict");

  // -------------------------------------------------- common - START
  const log = (...args) => console.log("[上图信息提取]", ...args);
  const debug = (...args) => console.debug("[上图信息提取]", ...args);
  log("油猴脚本开始");

  const list2yaml = (arr) => arr.map((c) => `  - ${c}`).join(`\n`);

  // -------------------------------------------------- common - END

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

  const meta2md = () => {
    // 读取书名
    const title = document.querySelector(".media-body>h3").textContent.trim();
    debug("title:", title);

    // 获取当前页面的网址
    const url = window.location.href.split("?")[0];
    debug("url:", url);

    // 读取作者
    const authorList = Array.from(
      document.querySelectorAll(
        'span.author-data[property="author"],span.author-data[property="creator"]'
      )
    )?.map((a) => a.querySelector("a").textContent.trim());
    debug("authorList:", authorList);

    // 读取译者等
    let contributorDict = {};
    Array.from(
      document.querySelectorAll('span.author-data[property="contributor"]')
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
    debug("contributorDict:", contributorDict);
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
    debug("metaDict:", metaDict, metaDict["ISBN"]);

    // 读取封面
    let cover =
      window.location.origin +
      document
        .querySelector('img[referrerpolicy="no-referrer"]')
        .getAttribute("src");

    // 根据规则转换格式
    const frontMatter = `---
Author:
${list2yaml(authorList)}
Publisher: ${metaDict["出版社"]}
ISBN: ${metaDict["ISBN"]}
索书号: ${metaDict["索书号"]}
上图网址: ${url}
tags: 
${contributorMeta}
---
![Cover|200](${cover})
`;

    // 复制到剪贴板
    navigator.clipboard.writeText(frontMatter);
  };

  button.addEventListener("click", meta2md);
})();
