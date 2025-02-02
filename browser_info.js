// ==UserScript==
// @name         Browser Info
// @description  Add browser info(platform & etc.) to html, for css selecting.
// @match        *://*/*
// @version      0.1
// @author       Erimus
// @grant        none
// @namespace    https://greasyfork.org/users/46393
// @require      https://raw.githubusercontent.com/Erimus-Koo/tamper_monkey/master/browser_info.js?v=0930
// ==/UserScript==

// @require      file://D:\OneDrive\05ProgramProject\tamper_monkey\browser_info.js
// @require      file:///Users/erimus/OneDrive/05ProgramProject/tamper_monkey/browser_info.js
// @require      https://raw.githubusercontent.com/Erimus-Koo/tamper_monkey/master/browser_info.js

(function (document) {
  // -------------------------------------------------- common - START
  const log = (...args) => console.log("[Browser Info]", ...args);
  const debug = (...args) => console.debug("[Browser Info]", ...args);
  log("油猴脚本开始");

  // detect info via user-agent
  const ua = navigator.userAgent;
  log("ua:", ua);

  const os = ua.match(/(Windows|Macintosh|iPhone|Android)/)?.[1] ?? "unknown";
  log("os:", os);

  const browser = ua.match(/(Chrome|Safari|Firefox)/)?.[1] ?? "unknown";
  log("browser:", browser);

  const chrome_ver = ua.match(/((?<=Chrome\/)\d+)/)?.[1] ?? "0";
  log("chrome_ver:", chrome_ver);

  // get language
  const lang = navigator.language || navigator.userLanguage;
  log("lang:", lang);

  // get physical size
  const width = window.innerWidth;
  const height = window.innerHeight;
  const devicePixelRatio = window.devicePixelRatio;
  log(`Screen Size:${width}x${height} devicePixcelRatio:${devicePixelRatio}`);

  // inject properties into body
  let html = document.querySelector("html");
  html.setAttribute("ua-os", os);
  html.setAttribute("ua-browser", browser);
  html.setAttribute("ua-chrome-ver", chrome_ver);
  html.setAttribute("e-lang", lang);
  html.setAttribute("e-width", width);
  html.setAttribute("e-height", height);
  html.setAttribute("e-devicePixelRatio", devicePixelRatio);

  // check for 10 times (some page will rewrite the attribute)
  // let count = 0
  // let checker = setInterval(()=>{
  //     if(!html.getAttribute('ua-os')){
  //         console.log('not found')
  //     }
  //     count ++
  //     if(count>20){clearInterval(checker)}
  // },500)
})(document);
