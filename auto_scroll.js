// ==UserScript==
// @name         Auto Scroll 自动滚屏
// @description  Auto Scroll Pages (double click / ctrl+arrow)
// @include      *
// @version      0.14
// @author       Erimus
// @grant        none
// @namespace    https://greasyfork.org/users/46393
// ==/UserScript==

(function(document) {

    // speed controlled by the following 2 variables
    let scroll_interval = 15, // every xx ms
        scroll_distance = 1 // move xx pixel

    let scrolling = false, // status
        auto_scroll // scroll function

    // main function
    let toggle_scroll = function(dire) {
        scrolling = !scrolling
        if (scrolling) {
            console.log('Start scroll', dire)
            dire = dire == 'up' ? -1 : 1
            auto_scroll = setInterval(function() {
                document.documentElement.scrollTop += (dire * scroll_distance)
            }, scroll_interval)
        } else {
            console.log('Stop scroll')
            clearInterval(auto_scroll)
        }
    }

    // toogle scrolling by double click
    // if you want to trigger with double click , remove '//' before 'document'.
    // 你想用双击触发，删除下一行前的 '//'。
    // document.body.addEventListener('dblclick', toggle_scroll)

    // single click to stop scroll
    document.body.addEventListener('click', function() {
        if (scrolling) {
            scrolling = false
            console.log('Stop scroll')
            clearInterval(auto_scroll)
        }
    })

    // toogle scrolling by hotkey
    // if you want set your own hotkey, find the key code on following site.
    // 如果你想要设置其它快捷键，查看以下网址以找到对应的按键码。
    // https://www.w3.org/2002/09/tests/keys.html
    document.onkeydown = function(e) {
        let keyCode = e.keyCode || e.which || e.charCode
        let ctrlKey = e.ctrlKey || e.metaKey
        if (ctrlKey && keyCode == 40) {
            console.log('Press Ctrl + Down arrow')
            toggle_scroll()
        } else if (ctrlKey && keyCode == 38) {
            console.log('Press Ctrl + Up arrow')
            toggle_scroll('up')
        }
    }

})(document)
