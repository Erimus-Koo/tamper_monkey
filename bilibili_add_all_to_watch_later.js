// ==UserScript==
// @name         B站 播放全部（全部加入稍后看并播放）
// @version      0.1
// @description  仅在Bilibili用户主页的投稿页有效，把视频全部加入稍后再看，并且播放。
// @author       Erimus
// @include      http*://space.bilibili.com/*
// @grant        none
// @namespace    https://greasyfork.org/users/46393
// ==/UserScript==

(function() {
    'use strict';

    console.log('=== play all videos in this page')
    let wl_btns = []

    let find_wl_btns = setInterval(function() {
        let current_url = document.URL
        // 如果在顶部判断网址，从用户主页切过来时不会响应。所以在这边判断。
        if (current_url.includes('/video')) {
            console.log('=== in video page')
            // 搜索页面上的稍后播放按钮
            // 这里会重复添加，列表模式/缩略图模式各有一份，随它去。
            wl_btns = document.getElementsByClassName('i-watchlater')
            if (wl_btns) {
                console.log('=== Watch Later Button Found:', wl_btns)
                clearInterval(find_wl_btns)
                add_play_all_btn()
            }
        }
    }, 500)

    let add_play_all_btn = function() {
        // 添加在分类后面
        let header = document.getElementById('submit-video-type-filter')
        // 创建按钮
        let btn = document.createElement('a')
        btn.innerHTML = '播放本页全部视频'
        btn.setAttribute('style', 'color:#00a1d6;')
        btn.setAttribute('id', 'play_all')
        // 延迟添加按钮，不然会出现在第二位。
        setTimeout(function() {
            header.appendChild(btn)
            document.getElementById('play_all').addEventListener('click', play_all)
        }, 500)

    }

    var play_all = function() {
        console.log('=== Play All')
        // 点击所有稍后再看的按钮
        for (let i = 0; i < wl_btns.length; i++) {
            wl_btns[i].click()
        }
        // 打开稍后再看页面
        window.open('https://www.bilibili.com/watchlater/')
    }

})();
