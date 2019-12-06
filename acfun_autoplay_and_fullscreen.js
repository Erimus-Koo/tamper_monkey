// ==UserScript==
// @name         A站 自动播放 & 网页全屏
// @version      0.1
// @description  AcFun Autoplay & FullScreen
// @author       Erimus
// @include      http*://*acfun.cn/v/ac*
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

    let main = setInterval(function() {

        if (!fullscreen) {
            // find full screen button
            let fullScreenBtn = document.getElementsByClassName('fullscreen-web')
            console.log('=== Full Screen Button:', fullScreenBtn)
            if (fullScreenBtn) {
                // check fullscreen status
                let closed = fullScreenBtn[0].getElementsByClassName('btn-span')[0].getAttribute('data-bind-attr')
                console.log('=== Closed:', closed)
                // alert(1)
                if (closed=='web') {
                    console.log('=== fullscreen OK')
                    fullscreen = true
                } else {
                    fullScreenBtn[0].click()
                }
            }
        }

        if (playing < play_count_limit) {
            // find start button on player area bottom
            let playBtn = document.getElementsByClassName('btn-play');
            console.log('=== Play Button:', playBtn)
            if (playBtn) {
                // check play status
                let check = playBtn[0].getElementsByClassName('btn-span')[0].getAttribute('data-bind-attr')
                console.log('=== Playing check:', check)
                if (check=='play') {
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
