// ==UserScript==
// @name         QRCode Monkey Automation
// @namespace    http://tampermonkey.net/
// @version      0.0.3
// @description  Auto paste url & set styles & generate
// @author       Erimus
// @match        https://www.qrcode-monkey.com/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=qrcode-monkey.com
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  // 判断串是否为url
  function isURL(str) {
    return /^https?:\/\/[^\s]+$/i.test(str.trim());
  }

  function waitForLabels(labels, callback) {
    const interval = setInterval(() => {
      let foundAll = labels.every((labelText) => findLabel(labelText));
      if (foundAll) {
        clearInterval(interval);
        callback();
      }
    }, 500);
  }

  function findLabel(text) {
    let labels = document.querySelectorAll("label");
    for (let label of labels) {
      if (label.textContent.trim() === text) {
        return label;
      }
    }
    return null;
  }

  function clickShape(labelText, shapeIndex) {
    let label = findLabel(labelText);
    if (!label) return;
    let group = label.nextElementSibling;
    while (
      group &&
      (!group.classList.contains("form-group") ||
        !group.classList.contains("shape-group"))
    ) {
      group = group.nextElementSibling;
    }
    if (!group) return;
    let shapes = group.querySelectorAll(".shape");
    if (shapes.length >= shapeIndex) {
      shapes[shapeIndex - 1].click();
    }
  }

  waitForLabels(["Body Shape", "Eye Frame Shape", "Eye Ball Shape"], () => {
    clickShape("Body Shape", 7);
    clickShape("Eye Frame Shape", 12);
    clickShape("Eye Ball Shape", 13);

    if (navigator.clipboard) {
      navigator.clipboard.readText().then((text) => {
        // 检查内容格式
        if (!isURL(text)) {
          alert("剪贴板内容不是合法的URL！");
          return;
        }
        let input = document.querySelector("input#qrcodeUrl");
        if (input) {
          input.value = text.trim();
          input.dispatchEvent(new Event("input", { bubbles: true }));

          // 延迟点击生成按钮，确保页面处理完input
          setTimeout(() => {
            document.querySelector("#button-create-qr-code")?.click();
          }, 500); // 延迟500ms，可根据实际情况调整
        }
      });
    } else {
      document.querySelector("#button-create-qr-code")?.click();
    }
  });
})();
