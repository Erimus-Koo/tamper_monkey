// ==UserScript==
// @name         Browser Info to <body>
// @description  Add browser info(platform & etc.) to body, for css selecting.
// @include      *
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
    document.body.setAttribute('ua-os', os)
    document.body.setAttribute('ua-browser', browser)
    document.body.setAttribute('ua-chrome-ver', chrome_ver)

})(document)
