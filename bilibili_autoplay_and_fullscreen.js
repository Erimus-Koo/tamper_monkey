// ==UserScript==
// @name         B站 自动播放 & 网页全屏
// @version      0.14
// @description  Bilibili Autoplay & FullScreen
// @author       Erimus
// @include      http*://*bilibili.com/video/*
// @grant        none
// @namespace    https://greasyfork.org/users/46393
// ==/UserScript==

(function() {
    'use strict';

    console.log('=== autoplay & fullscreen')

    // 把是否在播放的判断条件改为计数。
    // 防止网络不好长时间Loading，出现播了一点，判断为已播放，其实暂停了的情况。
    let playing = 0
    // 现在是折中的方法，只判断3次，防止Loading造成的暂停。
    // 但是1.5秒内用户点击暂停后，会继续播放。
    let play_count_limit = 3
    let fullscreen = false

    // TODO 判断用户点击，比如用户主动点击暂停，则中断所有自动操作。
    // let video_wrap
    // let listener_created = false
    // let stop_automatic = function() {
    //     console.log('=== stop automatic')
    //     clearInterval(main)
    //     video_wrap[0].removeEventListener('click', stop_automatic)
    // }
    // if (!listener_created) {
    //     video_wrap = document.getElementsByClassName('video-state-pause')
    //     if (video_wrap) {
    //         video_wrap[0].addEventListener('click', stop_automatic)
    //         document.body.addEventListener('click', function(e) { console.log(e) })
    //         listener_created = true
    //     }
    // }
    // 监听按键
    // document.addEventListener('onkeydown', stop_automatic)

    let main = setInterval(function() {

        if (!fullscreen) {
            // find full screen button
            let fullScreenBtn = document.getElementsByClassName('bilibili-player-video-web-fullscreen')
            console.log('=== Full Screen Button:', fullScreenBtn)
            if (fullScreenBtn) {
                // check fullscreen status
                let closed = fullScreenBtn[0].className.includes('closed')
                console.log('=== Closed:', closed)
                if (closed) {
                    console.log('=== fullscreen OK')
                    fullscreen = true
                } else {
                    fullScreenBtn[0].click()
                }
            }
        }

        if (playing < play_count_limit) {
            // find start button on player area bottom
            let playBtn = document.getElementsByClassName('bilibili-player-video-btn-start');
            console.log('=== Play Button:', playBtn)
            if (playBtn) {
                // check play status
                let check = playBtn[0].className.includes('video-state-pause')
                console.log('=== Playing check:', check)
                if (!check) {
                    playing++
                    console.log('=== playing', playing)
                } else {
                    playBtn[0].click()
                }
            }
        }

        if (playing >= play_count_limit && fullscreen) {
            console.log('=== quit loop')
            clearInterval(main)
            // video_wrap.removeEventListener('click', stop_automatic)
        }

    }, 200);

})();
