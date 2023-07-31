// ==UserScript==
// @name         Browser Info
// @description  Add browser info(platform & etc.) to html, for css selecting.
// @match        *://*/*
// @version      0.1
// @author       Erimus
// @grant        none
// @namespace    https://greasyfork.org/users/46393
// ==/UserScript==

(function(document) {

    let log = (...info) => { console.log(`[Browser Info] ${info.join(' ')}`) }

    // detect info via user-agent
    let ua = navigator.userAgent
    log('ua:', ua)

    os = ua.match(/(Windows|Macintosh|iPhone|Android)/)
    os = os[1] || 'unknown'
    log('os:', os)

    browser = ua.match(/(Chrome|Safari|Firefox)/)
    browser = browser[1] || 'unknown'
    log('browser:', browser)

    chrome_ver = ua.match(/((?<=Chrome\/)\d+)/)
    chrome_ver = chrome_ver[1] || '0'
    log('chrome_ver:', chrome_ver)

    // inject properties into body
    let html = document.querySelector('html')
    html.setAttribute('ua-os', os)
    html.setAttribute('ua-browser', browser)
    html.setAttribute('ua-chrome-ver', chrome_ver)

    // check for 10 times (some page will rewrite the attribute)
    // let count = 0
    // let checker = setInterval(()=>{
    //     if(!html.getAttribute('ua-os')){
    //         console.log('not found')
    //     }
    //     count ++
    //     if(count>20){clearInterval(checker)}
    // },500)
})(document)
