// ==UserScript==
// @name         Auto Scroll 自动滚屏
// @description  Auto Scroll Pages (double click / ctrl+arrow / alt+arrow)
// @include      *
// @version      0.18
// @author       Erimus
// @grant        none
// @namespace    https://greasyfork.org/users/46393
// ==/UserScript==

(function (document) {
  // speed controlled by the following 2 variables
  let scroll_interval = 50, // every xx ms
    scroll_distance = 1; // move xx pixel

  let scrolling = false, // status
    auto_scroll, // scroll function
    last_click = Date.now();

  // main function
  let toggle_scroll = function (direction) {
    scrolling = !scrolling;
    if (scrolling) {
      console.log("Start scroll", direction);
      direction = direction == "up" ? -1 : 1;
      auto_scroll = setInterval(function () {
        document.documentElement.scrollTop += direction * scroll_distance;
      }, scroll_interval);
    } else {
      console.log("Stop scroll");
      clearInterval(auto_scroll);
    }
  };

  // double click near edge can trigger (Prevent accidental touch)
  // 双击靠近页面边缘的位置可以触发滚屏 (防止误触发)
  let dblclick_check = (e) => {
    if (Date.now() - last_click < 500) {
      return;
    } //just stopped by click
    let range = 50; // effective range
    let w = window.innerWidth;
    let h = window.innerHeight;
    console.log(`double click: x=${e.x}/${w} | y=${e.y}/${h}`);
    // Except top edge, because of search bar is mostly at top.
    if (e.x < range || w - e.x < range || h - e.y < range) {
      toggle_scroll();
    }
  };

  // toogle scrolling by double click
  // if you want to trigger with double click , remove '//' before 'document'.
  // 双击触发
  document.body.addEventListener("dblclick", dblclick_check);

  // single click to stop scroll
  document.body.addEventListener("click", (e) => {
    if (scrolling && e.isTrusted) {
      scrolling = false;
      console.log("Stop scroll");
      clearInterval(auto_scroll);
      last_click = Date.now();
    }
  });

  // toogle scrolling by hotkey
  // if you want set your own hotkey, find the key code on following site.
  // 如果你想要设置其它快捷键，查看以下网址以找到对应的按键码。
  // https://www.w3.org/2002/09/tests/keys.html
  document.onkeydown = (e) => {
    let keyCode = e.code,
      fnKey = e.ctrlKey || e.metaKey || e.altKey;
    if (fnKey && keyCode === "ArrowDown") {
      console.log("Press Ctrl/Alt + Down arrow");
      toggle_scroll();
    } else if (fnKey && keyCode === "ArrowUp") {
      console.log("Press Ctrl/Alt + Up arrow");
      toggle_scroll("up");
    }
  };
})(document);
