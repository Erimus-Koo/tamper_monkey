// ==UserScript==
// @name         B站 自动播放 & 网页全屏
// @version      0.16
// @description  Bilibili Autoplay & FullScreen 增加跳转页面监听
// @author       Erimus
// @include      http*://*bilibili.com/video/*
// @grant        none
// @namespace    https://greasyfork.org/users/46393
// ==/UserScript==

(function() {
    'use strict';

    console.log('=== autoplay & fullscreen')

    // 监听页面跳转事件
    let _wr = function(type) {
        let orig = history[type]
        return function() {
            let rv = orig.apply(this, arguments),
                e = new Event(type)
            e.arguments = arguments
            window.dispatchEvent(e)
            return rv
        }
    }
    history.pushState = _wr('pushState')
    window.addEventListener('pushState', function(e) {
        let new_url = e.arguments[2]
        console.log('Push State:', new_url)
        // 页面内切P，为保证操作连续性，不全屏。
        if (!new_url.includes('?p=')) {
            fullscreen_and_autoplay()
        }
    });

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
                console.log('=== Full Screen Button:', fullScreenBtn)
                if (fullScreenBtn) {
                    // check fullscreen status
                    let closed = fullScreenBtn.className.includes('closed')
                    console.log('=== Closed:', closed)
                    if (closed) {
                        console.log('=== fullscreen OK')
                        fullscreen = true
                    } else {
                        fullScreenBtn.click()
                    }
                }
            }

            if (playing < play_count_limit) {
                // find start button on player area bottom
                let playBtn = document.querySelector('.bilibili-player-video-btn-start');
                console.log('=== Play Button:', playBtn)
                if (playBtn) {
                    // check play status
                    let check = playBtn.className.includes('video-state-pause')
                    console.log('=== Playing check:', check)
                    if (!check) {
                        playing++
                        console.log('=== playing', playing)
                    } else {
                        playBtn.click()
                    }
                }
            }

            if (playing >= play_count_limit && fullscreen) {
                console.log('=== quit loop')
                clearInterval(main)
                // video_wrap.removeEventListener('click', stop_automatic)
            }

        }, 200);
    }

    // 初次进入页面时运行
    fullscreen_and_autoplay()

})();
