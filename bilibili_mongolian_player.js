// ==UserScript==
// @name         B站上单播放器
// @version      0.1.1
// @description  B站播放器优化。添加了一些 youtube 和 potplayer 的快捷键。修复了多P连播，播放位置记忆等功能。
// @author       Erimus
// @include      http*.bilibili.com/video/*
// @include      http*.bilibili.com/bangumi/*
// @namespace    https://greasyfork.org/users/46393
// ==/UserScript==

/* 功能说明
====================
快捷键

w: 网页全屏
t: 宽屏
i: 画中画
d: 弹幕开关
双击: 切换全屏

m: 静音

c: 播放加速 每次10%
x: 播放减速 每次10%
z: 播放恢复原速

0 ~ 9: 切换到相应的百分比进度（如按2等于跳到20%进度）

shift + right: 下一P

====================
其它功能

- 多 P 自动连播（不会自动播放推荐视频）
- 自动跳转到上次记录的播放位置
- 开播自动网页全屏
  * 这个是我个人使用习惯，有单独一个chrome窗口在副屏播放视频。
  * 如不需要的可以自行注释掉底部相关代码。

====================
B站本就支持的（也许有人不知道的）功能

f: 全屏
[: 上一P
]: 下一P
自动开播: 可以在播放器设置里开启（非自动切集）
*/

// 在播放器获得焦点时，B站默认有一个快解键F可以切换全屏。
(function() {
    'use strict';

    const SN = '[B站上单播放器]' // script name
    console.log(SN, '油猴脚本开始')

    let videoObj

    // 缩写
    let find = (selector) => { return document.querySelector(selector) }
    let find_n_click = (selector) => { find(selector).click() }

    // 按键快捷键
    const shortcutDict = {
        'w': '.bilibili-player-video-web-fullscreen', //网页全屏
        't': '.bilibili-player-video-btn-widescreen', //宽屏
        'm': '.bilibili-player-iconfont-volume', //静音
        'i': '.bilibili-player-video-btn-pip', //画中画
        'd': '.bilibili-player-video-danmaku-switch>input', //弹幕开关
    }

    let pressKeyborder = function(e) {
        if (e && e.key) {
            console.debug(SN, 'e:', e)
            if (e.key in shortcutDict) {
                find_n_click(shortcutDict[e.key])
            } else if (e.shiftKey && e.key == 'ArrowRight') { //shift+r 下一P
                find_n_click('.bilibili-player-iconfont-next')
            } else if (e.key === 'c') { //加速
                videoObj.playbackRate += 0.1
            } else if (e.key === 'x') { //减速
                videoObj.playbackRate -= 0.1
            } else if (e.key === 'z') { //重置速度
                videoObj.playbackRate = 1
            } else if ('1234567890'.indexOf(e.key) != -1) { //切进度条
                videoObj.currentTime = videoObj.duration / 10 * parseInt(e.key)
            }
        }
    }

    let init = function() {
        let wait_for_video_player_init = setInterval(() => {
            console.debug(SN, 'Init:', document.URL)

            let click_area = find('.bilibili-player-video-wrap')
            videoObj = find('video:first-child')
            console.debug(SN, 'click_area:', click_area)
            console.debug(SN, 'videoObj:', videoObj)

            if (click_area && videoObj) {
                console.log(SN, '视频播放器加载完毕!')
                clearInterval(wait_for_video_player_init)

                // 双击切换全屏
                click_area.addEventListener('dblclick', function(e) {
                    e.stopPropagation()
                    console.log(SN, '双击切换全屏')
                    find_n_click('.bilibili-player-video-btn-fullscreen')
                })
            }
        }, 500)

        // 有些元素需要延迟载入 所以让它找一会儿
        let addAutoPlayNext = false //自动分P 是否含有多P
        let jumpToSavedTime = false //进度记录 是否存有进度
        let isFullScreen = false //自动网页全屏 当前是否全屏

        let find_more = setInterval(() => {
            // 自动切P （自动播放关闭，当视频播放结束时自动按下一段按钮。）
            // B站自动切P现在会自动播放推荐视频，此处应有蒙古上单名言。
            if (!addAutoPlayNext) {
                let nextBtn = find('.bilibili-player-iconfont-next')
                if (nextBtn) {
                    setInterval(() => {
                        if (videoObj.duration - videoObj.currentTime <= 0) {
                            nextBtn.click()
                        }
                    }, 1000)
                    addAutoPlayNext = true
                }
            }

            // 自动跳到上次播放位置
            if (!jumpToSavedTime) {
                let continuedBtn = find('.bilibili-player-video-toast-item-jump')
                console.debug(SN, 'Continue Play Button:', continuedBtn)
                if (continuedBtn) {
                    jumpToSavedTime = true
                    // 不跳转到其它话(上次看到 xx章节) 只在当前视频中跳转进度
                    // 有时候没看片尾 会记录上一集的片尾位置之类的
                    let continuedText = find('.bilibili-player-video-toast-item-text').innerHTML
                    console.debug(SN, 'Continue Text:', continuedText)
                    if (continuedText.indexOf(' ') == -1) {
                        continuedBtn.click()
                    }
                }
            }

            // 自动网页全屏 开始
            if (!isFullScreen) {
                let fsBtn = find('.bilibili-player-video-web-fullscreen')
                console.debug(SN, 'fullscreenBtn:', fsBtn)
                // check fullscreen status
                if (fsBtn.className.includes('closed')) {
                    console.log(SN, 'fullscreen OK')
                    isFullScreen = true
                } else {
                    fsBtn.click()
                }
            }
            // 自动网页全屏 结束（不需要的删掉这段）

        }, 200)

        // 无论是否找到 10秒后都停止搜寻
        setTimeout(() => { clearInterval(find_more) }, 10000)

        // 添加快捷键监听
        document.addEventListener('keydown', pressKeyborder);
    }
    init()

})();
