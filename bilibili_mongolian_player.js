// ==UserScript==
// @name         B站上单播放器 Mongolian Player
// @version      0.2.0
// @description  B站播放器优化。添加了一些 youtube 和 potplayer 的快捷键。修复了多P连播。添加了播放速度和音量的记忆及同步。
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
k: 宽屏（vim占用 需要使用可以去vim屏蔽 我不用这个模式）
i: 画中画（vim占用 需要使用可以去vim屏蔽）

c: 播放加速 每次10%
v: 播放减速 每次10%（x 优先给 vim 用）
z: 播放恢复原速

0 ~ 9: 切换到相应的百分比进度（如按2等于跳到20%进度）

shift + right: 下一P
shift + left:  上一P

====================
其它功能

- 开播自动网页全屏
  * 这个是我个人使用习惯，有单独一个chrome窗口在副屏播放视频。
  * 如不需要的可以自行注释掉底部相关代码。

- 多P自动连播（不会自动播放推荐视频）
  鉴于越来越多UP把视频加入选集，自动连播会播放全部历史视频，所以默认不连播。
  可以点击原本视频右侧的【开启自动连播】字样开启连播。
  因为大部分需要连播的场景是新关注了UP或者打开了教程等，手动开启应该可以接受。

====================
从定制转变为B站逐渐支持的（也许有人不知道的）功能

f: 全屏
d: 弹幕开关
m: 静音
[: 上一P
]: 下一P
双击: 切换全屏
自动开播: 可以在播放器设置里开启（非自动切集）
自动跳转到上次记录的播放位置
*/

// 在播放器获得焦点时，B站默认有一个快解键F可以切换全屏。
(function () {
    "use strict";

    // -------------------------------------------------- common - START
    const log = (...args) => console.log("[B站上单播放器]", ...args);
    const debug = (...args) => console.debug("[B站上单播放器]", ...args);
    log("油猴脚本开始");

    let videoObj; //播放器元素 全局

    const find = (selector) => {
        return document.querySelector(selector);
    };
    const find_n_click = (selector) => {
        log(`cmd: document.querySelector('${selector}').click()`);
        const target = document.querySelector(selector);
        if (target) {
            target.click();
        } //linter不支持?.语法 凑合一下
    };
    // -------------------------------------------------- common - END

    // -------------------------------------------------- shortcut - START
    let keyPressed = {}; //按下的所有键 目的是为了区分 1 和 ctrl+1 这种情况

    // 按键选择器 {按键名称:选择器}
    let eleDict = {
        fullscreen: ".bpx-player-ctrl-full", //全屏
        webFullscreen: ".bpx-player-ctrl-web", //网页全屏
        theaterMode: ".bpx-player-ctrl-wide", //宽屏
        miniPlayer: ".bpx-player-ctrl-pip", //画中画
        mute: ".bpx-player-ctrl-volume-icon", //静音
        danmaku: ".bui-danmaku-switch-input", //弹幕开关
        playPrev: ".bpx-player-ctrl-prev", //播放上一P
        playNext: ".bpx-player-ctrl-next", //播放下一P
        playerWrapper: ".bpx-player-video-wrap", //播放器可双击区域
        collect: ".collect", //收藏
    };

    // 番剧模式下 播放器元素名称不同
    if (document.URL.indexOf("bangumi/play") != -1) {
        eleDict.fullscreen = ".squirtle-video-fullscreen"; //全屏
        eleDict.webFullscreen = ".squirtle-pagefullscreen-inactive"; //网页全屏
        eleDict.theaterMode = ".squirtle-video-widescreen"; //宽屏
        eleDict.miniPlayer = ".squirtle-video-pip"; //画中画
        eleDict.mute = ".squirtle-volume-mute"; //静音
        eleDict.danmaku = ".bpx-player-dm-switch input"; //弹幕开关
        eleDict.playNext = ".squirtle-video-next"; //播放下一P
        eleDict.playerWrapper = ".bpx-player-video-wrap"; //播放器可双击区域
    }

    // 稍后播模式下 播放器元素名称不同
    if (document.URL.indexOf("medialist/play") != -1) {
        eleDict.fullscreen = ".bilibili-player-video-btn-fullscreen"; //全屏
        eleDict.webFullscreen = ".bilibili-player-video-web-fullscreen"; //网页全屏
        eleDict.theaterMode = ".bilibili-player-video-btn-widescreen"; //宽屏
        eleDict.miniPlayer = ".bilibili-player-video-btn-pip"; //画中画
        eleDict.mute = ".squirtle-volume-mute"; //静音
        eleDict.danmaku = ".bilibili-player-video-danmaku-switch"; //弹幕开关
        eleDict.playNext = ".bilibili-player-video-btn-next"; //播放下一P
        eleDict.playerWrapper = ".bilibili-player-dm-tip-wrap"; //播放器可双击区域
    }

    // 改变并记录速度
    const changePlaySpeed = function (v = 0) {
        const LS_playSpeed = "mongolian_player_playback_speed"; //播放速度的存储名
        let playSpeed = parseFloat(localStorage.getItem(LS_playSpeed)) || 1; //读取播放速度
        //参数绝对值小于1时调速 大于1则理解为重置
        playSpeed = Math.abs(v) < 1 ? playSpeed + v : 1;
        playSpeed = Number(playSpeed.toFixed(2));
        if (v != 0) {
            debug(`playSpeed(${v}): ${playSpeed}`);
        }
        localStorage.setItem(LS_playSpeed, playSpeed);
        videoObj.playbackRate = playSpeed;
    };

    // 记录音量
    const changeVideoVolume = function (v = 0) {
        const LS_videoVolume = "mongolian_player_video_volume"; // 播放音量的存储名
        let volume = parseFloat(localStorage.getItem(LS_videoVolume)) || 0.5; // 读取音量
        volume = Math.min(Math.max(volume + v, 0), 1);
        volume = Number(volume.toFixed(2));
        if (v != 0) {
            debug(`volume(${v}): ${volume}`);
        }
        localStorage.setItem(LS_videoVolume, volume);
        // 因为B站本身已经有了调音功能 所以只记录 不改变音量 不然会改变多次
        if (v == 0) {
            videoObj.volume = volume;
        }
    };

    // 快捷键对应按键
    const shortcutDict = {
        a: eleDict.fullscreen, //全屏
        w: eleDict.webFullscreen, //网页全屏
        k: eleDict.theaterMode, //宽屏
        i: eleDict.miniPlayer, //画中画
        // 'm': eleDict.mute, //静音(播放器自带 加了会变点两次)
        // 'd': eleDict.danmaku, //弹幕开关
        s: eleDict.collect, //收藏
    };
    let keyActionsStopPropagation = {
        // 变速（x留给vimium关闭网页）
        c: () => changePlaySpeed(0.1),
        v: () => changePlaySpeed(-0.1),
        z: () => changePlaySpeed(99),
        // 跳P
        "ArrowLeft,Shift": () => find_n_click(eleDict.playPrev),
        "ArrowRight,Shift": () => find_n_click(eleDict.playNext),
    };
    //进度条跳转
    for (let i = 0; i <= 9; i++) {
        keyActionsStopPropagation[i.toString()] = () =>
            (videoObj.currentTime = (videoObj.duration / 10) * i);
    }
    // 以下是不需要阻止事件传播的按键
    // 比如音量调整，阻止了会失去原本的提示浮窗
    const keyActions = {
        // 调整音量
        ArrowUp: () => changeVideoVolume(0.1),
        ArrowDown: () => changeVideoVolume(-0.1),
    };
    const pressKeyDown = function (e) {
        debug("keyDown e:", e);
        keyPressed[e.key] = true;
        debug("keyDown keyPressed:", keyPressed);
        const keys = Object.keys(keyPressed).sort().toString();
        debug("keyDown keys:", keys); //如果多按键会变成"a,b"

        // 如果光标在输入框里，快捷键不生效
        if (
            e.target.tagName === "TEXTAREA" ||
            (e.target.tagName === "INPUT" &&
                ["text", "password", "url", "search", "tel", "email"].includes(
                    e.target.type,
                ))
        ) {
            return;
        }

        // 设置快捷键
        if (keys in shortcutDict) {
            //字典里定义的直接搜索并点击的快捷键
            find_n_click(shortcutDict[keys]);
            e.stopPropagation();
        } else if (keys in keyActionsStopPropagation) {
            //运行自定义函数的快捷键
            keyActionsStopPropagation[keys]();
            e.stopPropagation();
        } else if (keys in keyActions) {
            //不需要阻止传递的快捷键
            keyActions[keys]();
        }
    };

    const pressKeyUp = function (e) {
        debug("keyUp e:", e);
        delete keyPressed[e.key];
        debug("keyUp keyPressed:", keyPressed);
    };

    window.onfocus = function () {
        // 当窗口获得焦点时
        debug("Ctrl+数字切出tab页不会清空按键，所以重新进入时清空一下。");
        keyPressed = {}; // 清空
    };
    // -------------------------------------------------- shortcut - END

    // -------------------------------------------------- 自动连播 - START
    let autoPlayNextVideo = false;
    function setupButton(
        button,
        defaultText = "开启连播",
        activeText = "正在连播",
    ) {
        button.style.background = "#06f";
        button.style.color = "#fff";
        button.style.padding = ".25em .5em";
        button.style.borderRadius = ".25em";
        button.style.cursor = "pointer";
        button.textContent = defaultText;

        // 点击连播切换状态
        button.addEventListener("click", function (event) {
            autoPlayNextVideo = !autoPlayNextVideo;
            // 开启连播设置颜色为红色
            this.style.background = autoPlayNextVideo ? "#f33" : "#06f";
            this.textContent = autoPlayNextVideo ? activeText : defaultText;
            event.stopPropagation();
        });
    }
    function addAutoPlayNextBtn(nextBtn) {
        // listTitle 是播放列表右上角的原连播按钮左侧的文字
        const listTitle = document.querySelector(".next-button .txt");
        const newBtn = document.createElement("a");

        setupButton(listTitle);
        setupButton(newBtn);

        newBtn.id = "autoPlayNextVideo";
        nextBtn.parentNode.insertBefore(newBtn, nextBtn); //insert btn

        // 强制让播放栏在暂停/播完时显示
        const style = document.createElement("style");
        // 以下选择器是要同时满足视频暂停 和控制栏隐藏 目前只适配了常规视频
        const hiddenSelector = ".bpx-state-paused .bpx-player-control-bottom";
        style.textContent = `${hiddenSelector}{opacity:1!important}
#autoPlayNextVideo{position:absolute;top:-4rem;left:1rem;font-size:1rem;line-height:2;padding:0 1rem;}`;
        document.head.appendChild(style);

        debug("自动连播:", autoPlayNextVideo);
    }
    // -------------------------------------------------- 自动连播 - END

    // -------------------------------------------------- init - START
    // 观察对象，等待其出现后，运行函数
    function observe_and_run(selector, runAfterElementFound) {
        // 创建一个观察器实例
        const observer = new MutationObserver((mutationsList, observer) => {
            // 如果页面上的元素a已经加载
            let target = document.querySelector(selector);
            if (target) {
                observer.disconnect(); // 停止观察
                runAfterElementFound(target); // 运行你的函数
            }
        });

        // 开始观察document，观察子节点和后代节点的添加或者删除
        const config = { childList: true, attributes: true, subtree: true };
        observer.observe(document, config);
    }

    // 初始化动作（以前B站跳转油猴不会重载，所以抽象，现在似乎已无必要）
    const init = function () {
        debug("Init:", document.URL);

        // 寻找视频对象 载入播放速度
        observe_and_run(`${eleDict.playerWrapper} video`, (target) => {
            videoObj = find(`${eleDict.playerWrapper} video`); //global
            changePlaySpeed(0); // 载入保存的播放速度

            // 自动切P （自动播放关闭，当视频播放结束时自动按下一P按钮。）
            // B站自动连播现在会自动播放推荐视频，包括播放列表以外的内容，
            // 单P视频也会连播，此处应有蒙古上单名言。
            videoObj.addEventListener("ended", () => {
                debug("Video ended, try play next...");
                if (autoPlayNextVideo) {
                    find_n_click(eleDict.playNext);
                }
            });

            videoObj.addEventListener("play", () => {
                debug("Video start to play ▶");
                changePlaySpeed();
                changeVideoVolume();
            });
        });

        // 寻找网页全屏按钮并自动网页全屏
        observe_and_run(eleDict.webFullscreen, (fullScreenBtn) => {
            fullScreenBtn.click();
        });

        // 寻找播放下一个按钮并插入开关
        observe_and_run(eleDict.playNext, addAutoPlayNextBtn);

        // 添加快捷键监听
        document.addEventListener("keydown", pressKeyDown);
        document.addEventListener("keyup", pressKeyUp);

        // 定期执行，让播放速度和音量统一为设定值
        // 连播目前检测不到 不会重新执行油猴
        // 或是开了多个窗口 调整了其中一个的速度 其他窗口速度并不会跟着变
        setInterval(() => {
            changePlaySpeed();
            changeVideoVolume();
        }, 10000);

        // 阿B已自带以下功能，但不确定是否所有播放器都支持，暂留

        // 寻找视频播放器 添加双击切换全屏
        // observe_and_run(eleDict.playerWrapper, (click_area) => {
        //     click_area.addEventListener('dblclick', function(e) {
        //         e.stopPropagation()
        //         log('双击切换全屏')
        //         find_n_click(eleDict.fullscreen)
        //     })
        // })

        // 自动跳到上次播放位置
        // observe_and_run('.bilibili-player-video-toast-item-jump',continuedBtn=>{
        //     // 不跳转到其它话(上次看到 xx章节) 只在当前视频中跳转进度
        //     // 有时候没看片尾 会记录上一集的片尾位置之类的
        //     let continuedText = find('.bilibili-player-video-toast-item-text').innerHTML
        //     debug('Continue Text:', continuedText)
        //     if (continuedText.includes(' ')) {
        //         continuedBtn.click()
        //     }
        // })
    };
    init();
    // -------------------------------------------------- init - END
})();
