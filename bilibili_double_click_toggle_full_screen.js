// ==UserScript==
// @name         B站 双击全屏
// @version      0.1
// @description  因为B站现存好几种播放器，如果有某些页面无效，请反馈给我具体页面。
// @author       Erimus
// @include      http*.bilibili.com/video/*
// @include      http*.bilibili.com/bangumi/*
// @namespace    https://greasyfork.org/users/46393
// ==/UserScript==

// 在播放器获得焦点时，B站默认有一个快解键F可以切换全屏。
(function() {
    'use strict';

    const SN = '[B站 双击全屏]' // script name
    console.log(SN, '油猴脚本开始')

    const elementDict = {
            'video': { // 普通视频 H5播放器
                'click_area': '.bilibili-player-video video', //双击生效区
                'fs_btn': '.bilibili-player-video-btn-fullscreen', //全屏按钮
                'play_btn': '.bilibili-player-video-btn-start' //播放按钮
            }
        }
    let thisPlayer // 当前播放器

    let init = function() {
        let find_btns_and_add_listener = setInterval(function() {
            console.debug(SN, 'Init:', document.URL)
            // 目前这套可以兼容一般视频和番剧，但可能无法兼容全部，这个参数先留着。
            // if (document.URL.includes('/video/')) {
            //     thisPlayer = 'video'
            // }
            thisPlayer = 'video'

            let click_area = document.querySelector(elementDict[thisPlayer]['click_area']),
                fs_btn = document.querySelector(elementDict[thisPlayer]['fs_btn']),
                play_btn = document.querySelector(elementDict[thisPlayer]['play_btn'])
            console.debug(SN, 'click_area:', click_area)
            console.debug(SN, 'fs_btn:', fs_btn)
            console.debug(SN, 'play_btn:', play_btn)
            if (click_area && fs_btn && play_btn) {
                console.log(SN, 'All buttons found!')
                clearInterval(find_btns_and_add_listener)

                // 区分单击和双击，避免双击当中触发短暂的两次单击。
                click_area.addEventListener('dblclick', dblclick)
                click_area.addEventListener('click', click)

                let wait_for_second

                function click(e) {
                    e.stopPropagation()
                    clearTimeout(wait_for_second)
                    wait_for_second = setTimeout(function() {
                        console.log(SN, '单击', play_btn)
                        play_btn.click() // 250毫秒之后 确定继续传递单击行为
                    }, 250)
                }

                function dblclick(e) {
                    clearTimeout(wait_for_second)
                    console.log(SN, '双击', fs_btn)
                    fs_btn.click() // toggle full screen
                }
            }
        }, 500)
    }
    init()

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

})();
