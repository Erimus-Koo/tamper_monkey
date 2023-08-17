// ==UserScript==
// @name         B站上单播放器 Mongolian Player
// @version      0.1.5
// @description  B站播放器优化。添加了一些 youtube 和 potplayer 的快捷键。修复了多P连播，增加了自动播放记忆位置等功能。
// @author       Erimus
// @match        *://*.bilibili.com/video/*
// @match        *://*.bilibili.com/bangumi/play/*
// @match        *://*.bilibili.com/medialist/play/*
// @match        *://*.bilibili.com/list/*
// @namespace    https://greasyfork.org/users/46393
// ==/UserScript==

/* 功能说明
====================
快捷键

a: 全屏（f 优先给 vim 用）
w: 网页全屏
t: 宽屏
i: 画中画
d: 弹幕开关
双击: 切换全屏

m: 静音

c: 播放加速 每次10%
v: 播放减速 每次10%（x 优先给 vim 用）
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

    let log = function(...args) { console.log('[B站上单播放器]', ...args) }
    let debug = function(...args) { console.debug('[B站上单播放器]', ...args) }
    log('油猴脚本开始')

    // 监听页面跳转事件
    let _wr = (type) => {
        let orig = history[type]
        return () => {
            let rv = orig.apply(this, arguments),
                e = new Event(type)
            e.arguments = arguments
            window.dispatchEvent(e)
            return rv
        }
    }
    // history.pushState = _wr('pushState')
    // history.replaceState = _wr('replaceState')

    let videoObj //播放器元素
    let keyPressed = {} //按下的所有键

    // 缩写
    let find = (selector) => { return document.querySelector(selector) }
    let find_n_click = (selector) => {
        log(`cmd: document.querySelector('${selector}').click()`)
        document.querySelector(selector).click()
    }

    // 按键选择器
    let eleDict = {
        'fullscreen': '.bpx-player-ctrl-full', //全屏
        'webFullscreen': '.bpx-player-ctrl-web', //网页全屏
        'theaterMode': '.bpx-player-ctrl-wide', //宽屏
        'miniPlayer': '.bpx-player-ctrl-pip', //画中画
        'mute': '.bpx-player-ctrl-volume-icon', //静音
        'danmaku': '.bui-danmaku-switch-input', //弹幕开关
        'playPrev': '.bpx-player-ctrl-prev', //播放上一P
        'playNext': '.bpx-player-ctrl-next', //播放下一P
        'playerWrapper': '.bpx-player-video-wrap', //播放器可双击区域
        'collect': '.collect', //收藏
    }

    // 番剧模式下 播放器元素名称不同
    if (document.URL.indexOf('bangumi/play') != -1) {
        eleDict.fullscreen = '.squirtle-video-fullscreen' //全屏
        eleDict.webFullscreen = '.squirtle-pagefullscreen-inactive' //网页全屏
        eleDict.theaterMode = '.squirtle-video-widescreen' //宽屏
        eleDict.miniPlayer = '.squirtle-video-pip' //画中画
        eleDict.mute = '.squirtle-volume-mute' //静音
        eleDict.danmaku = '.bpx-player-dm-switch input' //弹幕开关
        eleDict.playNext = '.squirtle-video-next' //播放下一P
        eleDict.playerWrapper = '.bpx-player-video-wrap' //播放器可双击区域
    }


    // 稍后播模式下 播放器元素名称不同
    if (document.URL.indexOf('medialist/play') != -1) {
        eleDict.fullscreen = '.bilibili-player-video-btn-fullscreen' //全屏
        eleDict.webFullscreen = '.bilibili-player-video-web-fullscreen' //网页全屏
        eleDict.theaterMode = '.bilibili-player-video-btn-widescreen' //宽屏
        eleDict.miniPlayer = '.bilibili-player-video-btn-pip' //画中画
        eleDict.mute = '.squirtle-volume-mute' //静音
        eleDict.danmaku = '.bilibili-player-video-danmaku-switch' //弹幕开关
        eleDict.playNext = '.bilibili-player-video-btn-next' //播放下一P
        eleDict.playerWrapper = '.bilibili-player-dm-tip-wrap' //播放器可双击区域
    }

    // 快捷键对应按键
    const shortcutDict = {
        'a': eleDict.fullscreen, //全屏
        'w': eleDict.webFullscreen, //网页全屏
        't': eleDict.theaterMode, //宽屏
        'i': eleDict.miniPlayer, //画中画
        // 'm': eleDict.mute, //静音(播放器自带 加了会变点两次)
        // 'd': eleDict.danmaku, //弹幕开关
        's': eleDict.collect, //收藏
    }

    // 改变并记录速度
    let changePlaySpeed = function(v = 0) {
        const LS_playSpeed = 'mongolian_player_playback_speed' // 播放速度的存储名
        // debug(`ls speed: ${localStorage.getItem(LS_playSpeed)}`)
        let playSpeed = parseFloat(localStorage.getItem(LS_playSpeed)) || 1 // 播放速度
        //参数绝对值小于1时调速 大于1则理解为重置
        playSpeed = (Math.abs(v) < 1) ? (playSpeed + v) : 1
        playSpeed = Number(playSpeed.toFixed(2))
        if (v != 0) { debug(`playSpeed(${v}): ${playSpeed}`) }
        localStorage.setItem(LS_playSpeed, playSpeed)
        videoObj.playbackRate = playSpeed
    }

    // 记录音量
    let changeVideoVolume = function(v = 0) {
        const LS_videoVolume = 'mongolian_player_video_volume' // 播放音量的存储名
        // debug(`ls volume: ${localStorage.getItem(LS_videoVolume)}`)
        let volume = parseFloat(localStorage.getItem(LS_videoVolume)) || 0.5 // 播放速度
        volume = Math.min(Math.max(volume + v, 0), 1)
        volume = Number(volume.toFixed(2))
        if (v != 0) { debug(`volume(${v}): ${volume}`) }
        localStorage.setItem(LS_videoVolume, volume)
        // 因为B站本身已经有了调音功能 所以只记录 不改变音量 不然会改变多次
        if (v == 0) { videoObj.volume = volume }
    }

    let pressKeyDown = function(e) {
        if (e && e.key) {
            debug('keyDown e:', e)
            keyPressed[e.key] = true
            debug('keyDown keyPressed:', keyPressed)
            // 如果光标在输入框里，快捷键不生效
            if (e.target.tagName === 'TEXTAREA' ||
                (e.target.tagName === 'INPUT' && ["text", "password", "url", "search", "tel", "email"].includes(e.target.type))
            ) { return }
            // 设置快捷键
            if (e.key in shortcutDict) {
                find_n_click(shortcutDict[e.key]) //字典里定义的快捷键
            } else if (e.shiftKey && e.key == 'ArrowLeft') { //shift+l 上一P
                find_n_click(eleDict.playPrev)
            } else if (e.shiftKey && e.key == 'ArrowRight') { //shift+r 下一P
                find_n_click(eleDict.playNext)
            } else if (e.key == 'ArrowUp') { //记录音量
                changeVideoVolume(0.1)
            } else if (e.key == 'ArrowDown') { //记录音量
                changeVideoVolume(-0.1)
            } else if (e.key === 'c') { //加速
                changePlaySpeed(0.1)
            } else if (e.key === 'v') { //减速
                changePlaySpeed(-0.1)
            } else if (e.key === 'z') { //重置速度
                changePlaySpeed(99)
            } else if ('1234567890'.indexOf(e.key) != -1 && Object.keys(keyPressed).length === 1) { //进度条跳转
                videoObj.currentTime = videoObj.duration / 10 * parseInt(e.key)
            } else {
                return // 如果没有命中任何快捷键就退出
            }
            // 如果命中任何快捷键 就阻止传递
            if (e.key === 'w') { e.stopPropagation() } //阻止投币快捷键
        }
    }

    let pressKeyUp = function(e) {
        debug('keyUp e:', e)
        delete keyPressed[e.key]
        debug('keyUp keyPressed:', keyPressed)
    }

    window.onfocus = function() { // 当窗口获得焦点时
        debug('Ctrl+数字切出tab页不会清空按键，所以重新进入时清空一下。')
        keyPressed = {}; // 清空
    };

    let init = function() {
        // 寻找视频播放器 添加功能
        let wait_for_video_player_init = setInterval(() => {
            debug('Init:', document.URL)

            let click_area = find(eleDict.playerWrapper)
            videoObj = find(`${eleDict.playerWrapper} video`)
            debug('click_area:', click_area)
            debug('videoObj:', videoObj)

            if (click_area && videoObj) {
                log('视频播放器加载完毕!')
                clearInterval(wait_for_video_player_init)

                // 双击切换全屏
                click_area.addEventListener('dblclick', function(e) {
                    e.stopPropagation()
                    log('双击切换全屏')
                    find_n_click(eleDict.fullscreen)
                })

                // 载入保存的播放速度
                changePlaySpeed(0)
            }
        }, 500)

        // 添加快捷键监听
        document.addEventListener('keydown', pressKeyDown);
        document.addEventListener('keyup', pressKeyUp);

        // 有些元素需要延迟载入 所以让它找一会儿
        let addAutoPlayNext = false //自动分P 是否含有多P
        let jumpToSavedTime = false //进度记录 是否存有进度

        let find_more = setInterval(() => {
            // 自动切P （自动播放关闭，当视频播放结束时自动按下一段按钮。）
            // B站自动切P现在会自动播放推荐视频，此处应有蒙古上单名言。
            if (!addAutoPlayNext) {
                let nextBtn = find(eleDict.playNext)
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
                debug('Continue Play Button:', continuedBtn)
                if (continuedBtn) {
                    jumpToSavedTime = true
                    // 不跳转到其它话(上次看到 xx章节) 只在当前视频中跳转进度
                    // 有时候没看片尾 会记录上一集的片尾位置之类的
                    let continuedText = find('.bilibili-player-video-toast-item-text').innerHTML
                    debug('Continue Text:', continuedText)
                    if (continuedText.indexOf(' ') == -1) {
                        continuedBtn.click()
                    }
                }
            }
        }, 200)

        // 无论是否找到 10秒后都停止搜寻
        setTimeout(() => { clearInterval(find_more) }, 10000)

        // 持续尝试 直到成功
        let isFullScreen = false //自动网页全屏 当前是否全屏
        let try_until_success = setInterval(() => {

            // 自动网页全屏 开始
            if (!isFullScreen) {
                // check fullscreen status
                if (find(eleDict.playerWrapper).clientWidth ==
                    document.body.clientWidth) {
                    log('fullscreen OK')
                    isFullScreen = true
                } else {
                    find_n_click(eleDict.webFullscreen)
                }
            }
            // 自动网页全屏 结束（不需要的删掉这段）

            if (isFullScreen) {
                clearInterval(try_until_success)
            }
        }, 500)

        // 定期执行，让播放速度和音量统一为设定值
        // 连播目前检测不到 不会重新执行油猴
        // 或是开了多个窗口 调整了其中一个的速度 其他窗口速度并不会跟着变
        setInterval(() => {
            changePlaySpeed()
            changeVideoVolume()
        }, 5000)
    }
    init()

})();
