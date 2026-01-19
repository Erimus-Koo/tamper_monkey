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
  let videoObj = null; //当前正在操作的视频（含音频）
  let videoObjAll = new Set(); //所有播放器组

  // -------------------------------------------------- common - START
  const LOG_PREFIX = `[视频播放器增强] `;
  console.log(LOG_PREFIX);

  const find = (selector) => {
    return document.querySelector(selector);
  };
  const find_n_click = (selector) => {
    console.log(`${LOG_PREFIX}cmd: document.querySelector('${selector}').click()`);
    const target = document.querySelector(selector);
    target?.click();
  };

  // 信息提示窗
  let notifyDelay;
  function notify(
    content, //innerHTML
    originEle, //定位对象 消息出现的位置 一般是视频对象
    delay = 3, //消息停留时间
    offsetX = 20,
    offsetY = 20
  ) {
    if (!originEle) originEle = document.body;

    // 检查已有的通知容器
    const notiName = "media-player-shortcut";
    let notificationElement = originEle.querySelector(
      `.notification[data-target="${notiName}"]`
    );
    if (notificationElement) {
      // console.debug("⚠️ notify existed");
      clearTimeout(notifyDelay);
    } else {
      // create notification
      notificationElement = document.createElement("div");
      notificationElement.className = "notification";
      notificationElement.setAttribute("data-target", notiName);
      // 如果是video或audio就加到父级 否则加到指定originEle
      const container =
        originEle.tagName.toLowerCase() === "video" ||
          originEle.tagName.toLowerCase() === "audio"
          ? originEle.parentElement
          : originEle;
      container.appendChild(notificationElement);
    }

    // Youtube 需要trustedType才能插入innerHTML
    let policy;
    const policyName = "mediaPlayerShortcutPolicy";
    if (window.trustedTypes) {
      if (trustedTypes.getPolicyNames().includes(policyName)) {
        try {
          policy = trustedTypes.createPolicy(policyName + "_alt", {
            createHTML: (string) => string,
          });
        } catch (e) {
          // ignore
        }
      } else {
        policy = trustedTypes.createPolicy(policyName, {
          createHTML: (string) => string,
        });
      }
    }

    // console.debug("Notification ele:", notificationElement);
    if (policy) {
      notificationElement.innerHTML = policy.createHTML(content);
    } else {
      notificationElement.innerHTML = content;
    }

    // 消息出现的定位点
    notificationElement.style.left = `${offsetX}px`;
    notificationElement.style.top = `${offsetY}px`;
    console.debug(`${LOG_PREFIX}style:`, notificationElement.style);

    // 添加样式
    const existingStyle = document.querySelector(
      `style[data-target="${notiName}"]`
    );
    if (!existingStyle) {
      const style = document.createElement("style");
      style.textContent = `.${notificationElement.className}{
      position:absolute;z-index:999999;
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
    if (!videoObj) return;
    if (videoObj.playbackRate === speed) return;
    videoObj.playbackRate = speed;
    const content = `播放速度: ${speed}<br><span style="color:#f90;font-size:.9em;font-family:'JetBrains Mono',Consolas,Menlo,sans-serif">C:加速 V:减速 Z:还原</span>`;
    if (videoObj instanceof HTMLVideoElement) {
      // video: 在较小的视频 如GIF 表情包等场景下 不提示
      if (videoObj.offsetWidth > 200 && videoObj.offsetHeight > 200) {
        notify(content, videoObj);
      } else {
        notify(content);
      }
    } else {
      // audio
      notify(content, videoObj);
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
      console.debug(`${LOG_PREFIX}playSpeed(${v}): ${playSpeed}`);
      localStorage.setItem(LS_playSpeed, playSpeed);
      setSpeed(playSpeed);
    }
  };
  // -------------------------------------------------- 播放速度 - END

  // -------------------------------------------------- 音量控制 - START
  const changeVideoVolume = function (v = 0) {
    if (!videoObj) return;
    const LS_videoVolume = "video_player_video_volume"; // 播放音量的存储名
    let volume = parseFloat(localStorage.getItem(LS_videoVolume)) || 0.5; // 读取音量
    volume = Math.min(Math.max(volume + v, 0), 1);
    volume = Number(volume.toFixed(2));
    if (v != 0) {
      console.log(`${LOG_PREFIX}volume(${v}): ${volume}`);
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
    // 自动寻找当前应该全屏的对象
    const target = videoObj || document.querySelector("video") || document.documentElement;

    const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);

    if (!isFull) {
      if (target.requestFullscreen) {
        target.requestFullscreen();
      } else if (target.mozRequestFullScreen) {
        target.mozRequestFullScreen();
      } else if (target.webkitRequestFullscreen) {
        target.webkitRequestFullscreen();
      } else if (target.msRequestFullscreen) {
        target.msRequestFullscreen();
      } else {
        console.warn(`${LOG_PREFIX}No fullscreen API found on target.`);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      } else {
        console.warn(`${LOG_PREFIX}No exitFullscreen API found.`);
      }
    }
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
    keyActionsStopPropagation[i.toString()] = () => {
      if (videoObj) videoObj.currentTime = (videoObj.duration / 10) * i;
    };
  }
  // console.debug("keyActionsStopPropagation:", keyActionsStopPropagation);
  // 以下是不需要阻止事件传播的按键
  // 比如音量调整，阻止了会失去原本的提示浮窗
  const keyActions = {
    // 调整音量
    ArrowUp: () => changeVideoVolume(0.1),
    ArrowDown: () => changeVideoVolume(-0.1),
  };

  const pressKeyDown = function (e) {
    // 如果光标在输入框里，快捷键不生效
    if (
      e.target.isContentEditable ||
      e.target.tagName === "TEXTAREA" ||
      e.target.tagName === "INPUT"
    )
      return;

    // 判断组合键
    keyPressed[e.key] = true;
    const keys = Object.keys(keyPressed).sort().toString();

    // 设置快捷键
    if (keys in shortcutDict) {
      console.log(`${LOG_PREFIX}Shortcut: ${keys}`);
      shortcutDict[keys]();
      e.stopPropagation();
      e.preventDefault();
    } else if (keys in keyActionsStopPropagation) {
      if (!videoObj) return;
      console.log(`${LOG_PREFIX}Action (StopProp): ${keys}`);
      keyActionsStopPropagation[keys]();
      e.stopPropagation();
      e.preventDefault();
    } else if (keys in keyActions) {
      if (!videoObj) return;
      console.log(`${LOG_PREFIX}Action: ${keys}`);
      keyActions[keys]();
    } else {
      // 在 iframe 中的话发送消息给父窗口
      if (window.self !== window.top) {
        const data = {
          type: "keyDown",
          event: {
            key: e.key,
            target: { tagName: e.target.tagName, type: e.target.type },
          },
        };
        window.top.postMessage(data, "*");
      }
    }
  };

  const pressKeyUp = function (e) {
    delete keyPressed[e.key];
    if (window.self !== window.top) {
      window.top.postMessage({ type: "keyUp" }, "*");
    }
  };

  const clearKeys = function () {
    keyPressed = {}; // 清空
  };

  window.onfocus = clearKeys;
  window.onblur = clearKeys;

  // -------------------------------------------------- shortcut - END

  // -------------------------------------------------- init - START
  // 观察页面，如果出现新的video元素，则记录到列表中
  const observeVideos = (mutationsList) => {
    // 不对youtube shorts处理
    if (window.location.href?.includes("youtube.com/shorts")) return;

    // 处理移除的元素防止内存泄漏
    if (mutationsList) {
      for (let mutation of mutationsList) {
        if (mutation.removedNodes.length) {
          mutation.removedNodes.forEach((node) => {
            if (node.tagName?.toLowerCase() === "video" || node.tagName?.toLowerCase() === "audio") {
              videoObjAll.delete(node);
              if (videoObj === node) videoObj = null;
            } else if (node.querySelectorAll) {
              node.querySelectorAll("video, audio").forEach((media) => {
                videoObjAll.delete(media);
                if (videoObj === media) videoObj = null;
              });
            }
          });
        }
      }
    }

    const mediaElements = document.querySelectorAll("video, audio");
    mediaElements.forEach((media) => {
      if (!videoObjAll.has(media)) {
        videoObjAll.add(media);

        // 增加主动抓取逻辑：播放时、点击时、聚焦时，都锁定该对象
        media.addEventListener("play", () => {
          videoStartPlay(media);
          if (window.self !== window.top) {
            window.top.postMessage({ type: "videoStarted" }, "*");
          }
        });
        media.addEventListener("mousedown", () => {
          videoObj = media; //点击即锁定
          console.debug(`${LOG_PREFIX}Locked videoObj via click:`, videoObj);
        });
        media.addEventListener("focus", () => {
          videoObj = media; //聚焦即锁定
          console.debug(`${LOG_PREFIX}Locked videoObj via focus:`, videoObj);
        });

        media.addEventListener("ended", () => {
          if (window.self !== window.top) {
            window.top.postMessage({ type: "videoEnded" }, "*");
          }
        });
      }
    });

    // 兜底方案：如果没有正在操作的对象，找一个正在播放的，或者找面积最大的
    if (!videoObj) {
      let playing = Array.from(videoObjAll).find(v => !v.paused);
      if (playing) {
        videoObj = playing;
      } else {
        // 尝试找面积最大的视频
        let largest = null;
        let maxArea = 0;
        document.querySelectorAll('video').forEach(v => {
          let area = v.offsetWidth * v.offsetHeight;
          if (area > maxArea) {
            maxArea = area;
            largest = v;
          }
        });
        if (largest) videoObj = largest;
      }
    }
  };

  const videoStartPlay = (media) => {
    videoObj = media;
    videoObj.focus();
    console.debug(`${LOG_PREFIX}Current playing videoObj:`, videoObj);
    changePlaySpeed();
    changeVideoVolume();
  };

  // 处理 iframe 外层消息事件
  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin && event.origin !== "null") return;
    if (event.data.action === "focusVideo") {
      console.debug("👆 Received focus request from outer page.");
      videoObj?.focus();
    }
  });

  const init = function () {
    if (blacklist.some((kw) => window.location.href?.includes(kw))) return;

    observeVideos();
    const observer = new MutationObserver((mutations) => observeVideos(mutations));
    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener("keydown", (e) => pressKeyDown(e), true); //使用捕获阶段，防止被页面脚本拦截
    document.addEventListener("keyup", (e) => pressKeyUp(e), true);

    // 初次载入
    document.querySelectorAll("video, audio").forEach((media) => {
      if (!media.paused) {
        videoObj = media;
        changePlaySpeed();
        changeVideoVolume();
      }
    });
  };
  init();
  // -------------------------------------------------- init - END

})();
