// ==UserScript==
// @name         B站 自动播放 & 网页全屏
// @version      0.13
// @description  Bilibili Autoplay & FullScreen
// @author       Erimus
// @include      http*://*bilibili.com/video/*
// @grant        none
// @namespace    https://greasyfork.org/users/46393
// ==/UserScript==

(function() {
    'use strict';

    console.log('=== autoplay & fullscreen')

    //把判断条件改为计数，防止网络不好时长时间Loading，或者播了数秒，判断为已播放，其实暂停了的情况。
    let playing = 0
    let play_count_limit = 60
    let fullscreen = false

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
            clearInterval(main);
        }
    }, 500);

})();
