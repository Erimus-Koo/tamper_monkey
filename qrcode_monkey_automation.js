// ==UserScript==
// @name         QRCode Monkey Automation
// @namespace    http://tampermonkey.net/
// @version      2026-01-23
// @description  Auto paste url & set styles & generate
// @author       Erimus
// @match        https://www.qrcode-monkey.com/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=qrcode-monkey.com
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  // 等待页面和相关DOM加载
  function waitForLabels(labels, callback) {
    const interval = setInterval(() => {
      let foundAll = labels.every((labelText) => findLabel(labelText));
      if (foundAll) {
        clearInterval(interval);
        callback();
      }
    }, 500);
  }

  // 根据label文本查找label DOM对象
  function findLabel(text) {
    let labels = document.querySelectorAll("label");
    for (let label of labels) {
      if (label.textContent.trim() === text) {
        return label;
      }
    }
    return null;
  }

  // 执行点击操作
  function clickShape(labelText, shapeIndex) {
    let label = findLabel(labelText);
    if (!label) return;
    // 找最近的兄弟.form-group.shape-group
    let group = label.nextElementSibling;
    while (
      group &&
      (!group.classList.contains("form-group") ||
        !group.classList.contains("shape-group"))
    ) {
      group = group.nextElementSibling;
    }
    if (!group) return;
    // 寻找.shape元素
    let shapes = group.querySelectorAll(".shape");
    if (shapes.length >= shapeIndex) {
      shapes[shapeIndex - 1].click();
    }
  }

  waitForLabels(["Body Shape", "Eye Frame Shape", "Eye Ball Shape"], () => {
    clickShape("Body Shape", 7);
    clickShape("Eye Frame Shape", 12);
    clickShape("Eye Ball Shape", 13);

    // 填入剪贴板内容到input#qrcodeUrl
    if (navigator.clipboard) {
      navigator.clipboard.readText().then((text) => {
        let input = document.querySelector("input#qrcodeUrl");
        if (input) {
          input.value = text;
          // 点击生成二维码按钮
          document.querySelector("#button-create-qr-code")?.click();
        }
      });
    } else {
      // 如果浏览器不支持Clipboard API，直接点击生成
      document.querySelector("#button-create-qr-code")?.click();
    }
  });
})();
