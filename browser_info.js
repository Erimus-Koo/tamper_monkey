// ==UserScript==
// @name         Browser Info
// @description  Add browser info(platform & etc.) to html, for css selecting.
// @match        *://*/*
// @version      0.1
// @author       Erimus
// @grant        none
// @namespace    https://greasyfork.org/users/46393
// ==/UserScript==

(function (document) {
    // -------------------------------------------------- common - START
    const log = (...args) => console.log("[B站上单播放器]", ...args);
    const debug = (...args) => console.debug("[B站上单播放器]", ...args);
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

    // inject properties into body
    let html = document.querySelector("html");
    html.setAttribute("ua-os", os);
    html.setAttribute("ua-browser", browser);
    html.setAttribute("ua-chrome-ver", chrome_ver);

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
