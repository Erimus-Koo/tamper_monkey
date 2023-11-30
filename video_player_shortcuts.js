// ==UserScript==
// @name         Video Player Shortcuts
// @version      0.2.0
// @description  Add shortcut to video player
// @author       Erimus
// @match        *://*
// @namespace    https://greasyfork.org/users/46393
// ==/UserScript==

/* 功能说明
====================
快捷键

a: 全屏（f 优先给 vim 用）

c: 播放加速 每次10%
v: 播放减速 每次10%（x 优先给 vim 用）
z: 播放恢复原速

0 ~ 9: 切换到相应的百分比进度（如按2等于跳到20%进度）
*/

(function () {
  ("use strict");
  const blacklist = ["bilibili"];
  let videoObj = null; //当前正在播放的视频
  let videoObjAll = []; //所有播放器组
  let fullScreen = false; //当前的全屏状态

  // -------------------------------------------------- common - START
  const log = (...args) => console.log("[视频播放器增强]", ...args);
  const debug = (...args) => console.debug("[视频播放器增强]", ...args);
  log("油猴脚本开始");

  const find = (selector) => {
    return document.querySelector(selector);
  };
  const find_n_click = (selector) => {
    log(`cmd: document.querySelector('${selector}').click()`);
    const target = document.querySelector(selector);
    target?.click();
  };

  // 信息提示窗
  let notifyDelay;
  function notify(content, delay = 3) {
    // 检查已有的通知容器
    const notiName = "video-player-shortcut";
    let notificationElement = document.querySelector(
      `.notification[data-target="${notiName}"]`
    );
    if (notificationElement) {
      debug("⚠️ notify existed");
      clearTimeout(notifyDelay);
    } else {
      // create notification
      notificationElement = document.createElement("div");
      notificationElement.className = "notification";
      notificationElement.setAttribute("data-target", notiName);
      document.body.appendChild(notificationElement);
    }
    debug("Notification ele:", notificationElement);
    notificationElement.innerHTML = content; //更新消息
    debug("update notify conent");

    // 添加样式
    const existingStyle = document.querySelector(
      `style[data-target="${notiName}"]`
    );
    if (!existingStyle) {
      const style = document.createElement("style");
      style.textContent = `.${notificationElement.className}{
      position:fixed;z-index:999999;
      left:20px;bottom:20px;
      font-size:16px;color:#fff;background:#000c;
      padding:.5em 1em;border-radius:.5em;
    }`;
      style.setAttribute("data-target", notiName);
      document.head.appendChild(style);
    }

    // 设置浮窗的淡出效果
    notifyDelay = setTimeout(() => {
      notificationElement.remove();
    }, delay * 1000); // 3秒后触发淡出效果
  }
  // -------------------------------------------------- common - END

  // -------------------------------------------------- 播放速度 - START
  let isDefaultSpeed = false; //for toggle

  const setSpeed = (speed) => {
    if (videoObj.playbackRate === speed) return;
    videoObj.playbackRate = speed;
    const content = `播放速度: ${speed}<br><code style="color:#f90;font-size:.9em">C:加速 V:减速 Z:还原</code>`;
    if (videoObj.offsetWidth > 200 && videoObj.offsetHeight > 200) {
      notify(content);
    }
  };

  // 改变并记录速度
  const changePlaySpeed = function (v = 0) {
    const LS_playSpeed = "video_player_playback_speed"; //播放速度的存储名
    let playSpeed = parseFloat(localStorage.getItem(LS_playSpeed)) || 1; //读取播放速度
    if (v === 0) {
      // v===0 则不改变速度 直接载入存储的速度
      // 但不改变音乐区的默认播放速度
      setSpeed(isDefaultSpeed ? 1 : playSpeed);
    } else if (Math.abs(v) > 1) {
      // v大于1则理解为在当前速度和存储速度间切换
      isDefaultSpeed = !isDefaultSpeed;
      setSpeed(isDefaultSpeed ? 1 : playSpeed);
    } else {
      // v小于1时调速
      playSpeed = Math.max(playSpeed + v, 0);
      playSpeed = Number(playSpeed.toFixed(2));
      debug(`playSpeed(${v}): ${playSpeed}`);
      localStorage.setItem(LS_playSpeed, playSpeed);
      setSpeed(playSpeed);
    }
  };
  // -------------------------------------------------- 播放速度 - END

  // -------------------------------------------------- 音量控制 - START
  const changeVideoVolume = function (v = 0) {
    const LS_videoVolume = "video_player_video_volume"; // 播放音量的存储名
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
  // -------------------------------------------------- 音量控制 - END

  // -------------------------------------------------- 视频全屏 - START
  const videoFullScreen = () => {
    fullScreen = !fullScreen;
    // if (fullScreen) {
    //   if (videoObj.requestFullscreen) {
    //     videoObj.requestFullscreen();
    //   } else if (videoObj.mozRequestFullScreen) {
    //     // 兼容 Firefox
    //     videoObj.mozRequestFullScreen();
    //   } else if (videoObj.webkitRequestFullscreen) {
    //     // 兼容 Chrome, Safari 和 Opera
    //     videoObj.webkitRequestFullscreen();
    //   } else if (videoObj.msRequestFullscreen) {
    //     // 兼容 Internet Explorer 和 Edge
    //     videoObj.msRequestFullscreen();
    //   }
    // } else {
    //   if (document.exitFullscreen) {
    //     document.exitFullscreen();
    //   } else if (document.mozCancelFullScreen) {
    //     // 兼容 Firefox
    //     document.mozCancelFullScreen();
    //   } else if (document.webkitExitFullscreen) {
    //     // 兼容 Chrome, Safari 和 Opera
    //     document.webkitExitFullscreen();
    //   } else if (document.msExitFullscreen) {
    //     // 兼容 Internet Explorer 和 Edge
    //     document.msExitFullscreen();
    //   }
    // }
  };
  // -------------------------------------------------- 视频全屏 - END

  // -------------------------------------------------- shortcut - START
  let keyPressed = {}; //按下的所有键 目的是为了区分 1 和 ctrl+1 这种情况

  // 快捷键对应按键
  const shortcutDict = {
    a: videoFullScreen, //全屏
  };
  let keyActionsStopPropagation = {
    // 变速（x留给vimium关闭网页）
    c: () => changePlaySpeed(0.1), //加速
    v: () => changePlaySpeed(-0.1), //减速
    z: () => changePlaySpeed(99), //toggle 默认速度
  };
  //进度条跳转
  for (let i of Array(10).keys()) {
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

    // 如果光标在输入框里，快捷键不生效
    if (
      e.target.tagName === "TEXTAREA" ||
      (e.target.tagName === "INPUT" &&
        ["text", "password", "url", "search", "tel", "email"].includes(
          e.target.type
        ))
    )
      return;

    if (!videoObj) return; //还没有视频

    // 判断组合键
    keyPressed[e.key] = true;
    debug("keyDown keyPressed:", keyPressed);
    const keys = Object.keys(keyPressed).sort().toString();
    debug("keyDown keys:", keys); //如果多按键会变成"a,b"

    // 设置快捷键
    if (keys in shortcutDict) {
      //字典里定义的直接搜索并点击的快捷键
      shortcutDict[keys]();
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

  // -------------------------------------------------- init - START
  // 观察页面，如果出现新的video元素，则记录到列表中
  const observeVideos = () => {
    const videoElements = document.querySelectorAll("video");
    videoElements.forEach((videoElement) => {
      if (!videoObjAll.includes(videoElement)) {
        videoObjAll.push(videoElement);
        // console.debug("📷 Find new video element:", videoElement);
        videoElement.addEventListener("play", videoStartPlay);
      }
    });
  };

  const videoStartPlay = (e) => {
    // 更新当前正在播放的视频元素
    videoObj = e.target;
    console.debug("Current playing videoObj:", videoObj);

    // 读取播放器配置
    changePlaySpeed();
    changeVideoVolume();
  };

  // 初始化动作（以前B站跳转油猴不会重载，所以抽象，现在似乎已无必要）
  const init = function () {
    debug("Init:", document.URL);

    // 跳过黑名单的域名
    if (blacklist.some((kw) => window.location.href.includes(kw))) return;

    // 观察新添加的video元素
    observeVideos();

    // 使用MutationObserver观察新添加的video元素
    const observer = new MutationObserver(observeVideos);
    observer.observe(document.body, { childList: true, subtree: true });

    // 添加快捷键监听
    document.addEventListener("keydown", pressKeyDown);
    document.addEventListener("keyup", pressKeyUp);

    // 初次载入时可能会还没来得及监听 所以先遍历一次
    document.querySelectorAll("video").forEach((video) => {
      if (!video.paused) {
        videoObj = video;
        changePlaySpeed();
        changeVideoVolume();
      }
    });
  };
  init();
  // -------------------------------------------------- init - END
})();
