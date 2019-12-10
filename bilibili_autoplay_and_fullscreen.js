// ==UserScript==
// @name         B站 自动播放 & 网页全屏
// @version      0.17
// @description  Bilibili Autoplay & FullScreen 增加跳转页面监听
// @author       Erimus
// @include      http*://*bilibili.com/video/*
// @include      http*://*bilibili.com/bangumi/play/*
// @namespace    https://greasyfork.org/users/46393
// ==/UserScript==

(function() {
    'use strict';

    const SN = '[B站 自动播放 & 网页全屏]' // script name
    console.log(SN, '油猴脚本开始')

    // 监听页面跳转事件
    let _wr = function(type) {
        let orig = history[type + SN]
        return function() {
            let rv = orig.apply(this, arguments),
                e = new Event(type + SN)
            e.arguments = arguments
            window.dispatchEvent(e)
            return rv
        }
    }
    history.pushState = _wr('pushState')
    history.replaceState = _wr('replaceState')

    let fullscreen_and_autoplay = function() {
        // 把是否在播放的判断条件改为计数。
        // 防止长时间Loading时，播了一点点，判定为已播放，其实暂停Loading的情况。
        let playing = 0
        // 现在是折中的方法，只判断3次，防止Loading造成的暂停。
        // 但是这一小段时间内，用户点击暂停后，会继续自动播放。
        let play_count_limit = 3
        let fullscreen = false

        let main = setInterval(function() {

            if (!fullscreen) {
                // find full screen button
                let fullScreenBtn = document.querySelector('.bilibili-player-video-web-fullscreen')
                console.debug(SN, 'Full Screen Button:', fullScreenBtn)
                if (fullScreenBtn) {
                    // check fullscreen status
                    let closed = fullScreenBtn.className.includes('closed')
                    console.debug(SN, 'Closed:', closed)
                    if (closed) {
                        console.log(SN, 'fullscreen OK')
                        fullscreen = true
                    } else {
                        fullScreenBtn.click()
                    }
                }
            }

            if (playing < play_count_limit) {
                // find start button on player area bottom
                let playBtn = document.querySelector('.bilibili-player-video-btn-start');
                console.debug(SN, 'Play Button:', playBtn)
                if (playBtn) {
                    // check play status
                    let check = playBtn.className.includes('video-state-pause')
                    console.debug(SN, 'Playing check:', check)
                    if (!check) {
                        playing++
                        console.log(SN, 'Playing:', playing)
                    } else {
                        playBtn.click()
                    }
                }
            }

            if (playing >= play_count_limit && fullscreen) {
                console.log(SN, 'Finish')
                clearInterval(main)
            }

        }, 200);
    }

    // 初次进入页面时运行
    fullscreen_and_autoplay()

})();
