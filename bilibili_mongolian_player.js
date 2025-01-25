// ==UserScript==
// @name         B站上单播放器 Mongolian Player
// @version      0.1.5
// @description  B站播放器优化。添加了一些 youtube 和 potplayer 的快捷键。修复了多P连播，增加了自动播放记忆位置等功能。
// @author       Erimus
// @namespace    https://greasyfork.org/users/46393
// @icon         https://www.google.com/s2/favicons?sz=64&domain=bilibili.com

// @match        *://*.bilibili.com/video/*
// @match        *://*.bilibili.com/bangumi/play/*
// @match        *://*.bilibili.com/medialist/play/*
// @match        *://*.bilibili.com/list/*
// @match        *://*.bilibili.com/festival/*
// @match        *://t.bilibili.com/*
// @match        *://www.bilibili.com/?*
// @match        *://www.bilibili.com/watchlater/*/list
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

- 稍后看自动删除播放完的视频
  删除后会自动播放下一个视频，历史记录可以去独立页面查询。
  
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
  ("use strict");

  // -------------------------------------------------- common - START
  const N = "[B站上单播放器] ";
  console.log(`${N}油猴脚本开始`);

  let videoObj; //播放器元素 全局

  const find = (selector) => {
    return document.querySelector(selector);
  };
  const find_n_click = (selector) => {
    console.log(`${N}cmd: document.querySelector('${selector}').click()`);
    const target = document.querySelector(selector);
    target?.click();
  };

  // 信息提示窗
  let notifyDelay;

  function notify(
    content,
    originSelector = "body",
    offsetX = 0,
    offsetY = 0,
    delay = 3
  ) {
    // 检查已有的通知容器
    let notificationElement = document.querySelector(
      `.notification[data-target="${originSelector}"]`
    );
    if (notificationElement) {
      console.debug(`${N}notify existed`);
      clearTimeout(notifyDelay);
    } else {
      // create notification
      notificationElement = document.createElement("div");
      notificationElement.className = "notification";
      notificationElement.setAttribute("data-target", originSelector);
      document.body.appendChild(notificationElement);
    }
    console.debug(N, "noti ele:", notificationElement);
    notificationElement.innerHTML = content; //更新消息
    console.debug(N, "update notify conent");

    // 消息出现的定位点
    const origin = document.querySelector(originSelector);
    const rect = origin?.getBoundingClientRect();
    console.debug(`${N}Notify origin: left=${rect?.left} top=${rect?.top}`);
    notificationElement.style.left = `${rect ? rect.left + offsetX : 20}px`;
    notificationElement.style.top = `${rect ? rect.top + offsetY : 20}px`;
    console.debug(`${N}style:`, notificationElement.style);

    // 添加样式
    const existingStyle = document.querySelector(
      `style[data-target="${originSelector}"]`
    );
    if (!existingStyle) {
      const style = document.createElement("style");
      style.textContent = `.${notificationElement.className}{
      position:absolute;z-index:999999;
      font-size:1rem;color:#fff;background:#000c;
      padding:.5em 1em;border-radius:.5em;
    }`;
      style.setAttribute("data-target", originSelector);
      document.head.appendChild(style);
    }

    // 设置浮窗的淡出效果
    notifyDelay = setTimeout(() => {
      notificationElement.remove();
    }, delay * 1000); // 3秒后触发淡出效果
  }
  // -------------------------------------------------- common - END

  // -------------------------------------------------- Observer - START
  // 观察对象，等待其出现后，运行函数
  function observe_and_run(
    selector,
    runAfterElementFound,
    autoDisconnect = true
  ) {
    const handledElements = new Set();

    // 创建一个观察器实例
    const observer = new MutationObserver((mutationsList, observer) => {
      // console.log("🍎 Changed:", selector, mutationsList);
      // 如果页面上的元素a已经加载
      document.querySelectorAll(selector).forEach((target) => {
        if (autoDisconnect) {
          observer.disconnect(); // 只处理第一个就停止观察
        }

        // 只在找到时处理一次
        if (!handledElements.has(target)) {
          handledElements.add(target);
          runAfterElementFound(target); // 运行你的函数
        }
      });
    });

    // 开始观察document，观察子节点和后代节点的添加或者删除
    const config = { childList: true, attributes: true, subtree: true };
    observer.observe(document.body, config);
  }
  // -------------------------------------------------- Observer - END

  // -------------------------------------------------- 判断是否视频播放页 - START
  const getPageProperty = () => {
    // 获取页面名称 用于分类等
    prop = {};
    const url = document.URL;

    // 视频播放器页面
    const pathDict = {
      video: "video",
      bangumi: "video",
      medialist: "unknown",
      list: "playAllVideo", //of certain author
      "list/watchlater": "watchlater",
      festival: "festival",
    };
    for (let path in pathDict) {
      if (url.includes(`www.bilibili.com/${path}`)) {
        prop.type = "player"; //含播放器的页面
        prop.name = pathDict[path];
      }
    }

    // 首页
    if (url.match(/www\.bilibili\.com\/?($|\?)/)) {
      prop.name = "home";
    }
    if (url.includes(`t.bilibili.com`)) {
      prop.name = "activity";
    }
    if (url.includes(`www.bilibili.com/watchlater`)) {
      prop.name = "watchlater-list";
    }
    if (url.includes(`space.bilibili.com`)) {
      prop.name = "space";
    }
    console.debug(N, "🚨 prop:", prop);
    return prop;
  };
  // -------------------------------------------------- 判断是否视频播放页 - END

  // -------------------------------------------------- 播放速度 - START
  let isDefaultSpeed = false; //for toggle
  const excludedChannels = ["音乐", "舞蹈"];

  const getVideoChannel = () => {
    return document.querySelector(".firstchannel-tag a")?.textContent;
  };

  const setSpeed = (speed) => {
    if (videoObj) {
      if (videoObj.playbackRate === speed) return;
      videoObj.playbackRate = speed;
      const content = `播放速度: ${speed}<br><code style="color:#f90;font-size:.9em">C:加速 V:减速 Z:还原</code>`;
      notify(content, ".bpx-player-ctrl-playbackrate", 0, -100);
    }
  };

  // 改变并记录速度
  const changePlaySpeed = function (v = 0) {
    const LS_playSpeed = "mongolian_player_playback_speed"; //播放速度的存储名
    let playSpeed = parseFloat(localStorage.getItem(LS_playSpeed)) || 1; //读取播放速度
    if (v === 0) {
      // v===0 则不改变速度 直接载入存储的速度
      // 但不改变音乐区的默认播放速度
      const videoChannel = getVideoChannel(); //视频所在的频道、分类
      console.debug(`${N}Video Channel:`, videoChannel);
      if (excludedChannels.includes(videoChannel)) return;

      setSpeed(isDefaultSpeed ? 1 : playSpeed);
    } else if (Math.abs(v) > 1) {
      // v大于1则理解为在当前速度和存储速度间切换
      isDefaultSpeed = !isDefaultSpeed;
      setSpeed(isDefaultSpeed ? 1 : playSpeed);
    } else {
      // v小于1时调速
      playSpeed = Math.max(playSpeed + v, 0);
      playSpeed = Number(playSpeed.toFixed(2));
      console.debug(`${N}playSpeed(${v}): ${playSpeed}`);
      localStorage.setItem(LS_playSpeed, playSpeed);
      setSpeed(playSpeed);
    }
  };
  // -------------------------------------------------- 播放速度 - END

  // -------------------------------------------------- 音量控制 - START
  const changeVideoVolume = function (v = 0) {
    const LS_videoVolume = "mongolian_player_video_volume"; // 播放音量的存储名
    let volume = parseFloat(localStorage.getItem(LS_videoVolume)) || 0.5; // 读取音量
    volume = Math.min(Math.max(volume + v, 0), 1);
    volume = Number(volume.toFixed(2));
    if (v != 0) {
      console.debug(`${N}volume(${v}): ${volume}`);
    }
    localStorage.setItem(LS_videoVolume, volume);
    // 因为B站本身已经有了调音功能 所以只记录 不改变音量 不然会改变多次
    if (v == 0 && videoObj) {
      videoObj.volume = volume;
    }
  };
  // -------------------------------------------------- 音量控制 - END

  // -------------------------------------------------- 稍後再看播放页 - START
  const deleteFinishedVideo = () => {
    if (document.URL.includes("list/watchlater")) {
      // 判断当前是列表中的最后一个视频
      let videoType = "single"; //当前播放的项是单P还是多P
      const videoList = document.querySelectorAll(".action-list-item-wrap");
      let currentP = document.querySelector(".siglep-active"); // 单P 列表中的项 还拼错了
      let multiPList; //多P的列表
      let currentSubP; //多P的子项
      if (currentP) {
        videoType = "single";
        currentP = currentP.closest(".action-list-item-wrap");
      } else {
        currentSubP = document.querySelector(".multip-list-item-active");
        // 向父级找到当前播放的视频对象 找到含.action-list-item-wrap的
        if (currentSubP) {
          videoType = "multi";
          currentP = currentSubP.closest(".action-list-item-wrap");
          multiPList = currentP.querySelectorAll(".multip-list-item");
        }
      }
      console.debug(`${N}videoType:`, videoType);

      // 判断当前是否是列表最后一个视频
      const isLastVideo = currentP == videoList[videoList.length - 1];
      // 判断当前是否是分P的最后一个视频
      const isLastSubP =
        videoType == "multi" &&
        currentSubP == multiPList[multiPList.length - 1];
      console.debug(`${N}isLastVideo:`, isLastVideo);

      // 点击删除
      let deletedLastVideo = false;
      if (videoType == "single") {
        currentP.querySelector(".del-btn")?.click();
        deletedLastVideo = true;
      } else if (videoType == "multi") {
        if (isLastSubP) {
          currentP.querySelector(".del-btn")?.click();
        } else {
          currentSubP.nextElementSibling.click();
        }
      }

      // 删除了最后一个视频之后
      if (deletedLastVideo) {
        if (videoList.length == 1) {
          // 删除了列表仅有的一个视频删除后跳转到稍后看列表
          window.location.href = "https://www.bilibili.com/watchlater/#/list";
        } else {
          // 如果列表不止一个视频 删了最后一个 点击第一个
          if (isLastVideo) {
            videoList[0].querySelector(".actionlist-item-inner")?.click();
          }
        }
      }
    }
  };
  // -------------------------------------------------- 稍後再看播放页 - END

  // -------------------------------------------------- 稍後再看列表页 - START
  const autoRefreshWatchLaterList = () => {
    // 如果稍后播列表内无视频，则自动刷新。如果有则开始播放。
    if (getPageProperty().name == "watchlater-list") {
      // 视频列表是后加载的 进入页面直接获取不到 所以等5秒
      setInterval(() => {
        if (
          document.querySelector(".av-item") || //2024
          document.querySelector(".video-card") //2025
        ) {
          // 如果有视频则前往播放页
          window.location.href = "https://www.bilibili.com/list/watchlater";
        } else {
          // 没有就等一会儿刷新
          setInterval(() => window.location.reload(), 60000);
        }
      }, 5000);
    }
  };
  // -------------------------------------------------- 稍後再看列表页 - END

  // -------------------------------------------------- 让对象可聚焦 - START
  // 这个部分很多需要配合stylus修改display来实现，不然vimnium会找不到
  const makeElementFocusable = () => {
    const focusable = (element) => {
      element.setAttribute("tabindex", "0");
      element.setAttribute("role", "button");
      element.style.display = "inline-flex";
    };
    let btnList = [];
    const prop = getPageProperty();
    if (prop.type == "player") {
      btnList = btnList.concat(".bpx-player-follow"); // 关注按钮
    }
    if (prop.name == "home") {
      // 首页 稍后播
      btnList = btnList.concat(".bili-watch-later");
    } else if (prop.name == "activity") {
      // 动态页
      btnList = btnList.concat(
        ".bili-dyn-card-video__mark", //稍后播
        ".relevant-topic-container__item" //话题
      );
    } else if (prop.name == "watchlater") {
      // 稍后再看播放页 右侧播放列表中的视频项
      btnList = btnList.concat(".actionlist-item-inner");
    } else if (prop.name == "space") {
      // 个人页 视频列表
      btnList = btnList.concat(".i-watchlater");
    }
    console.debug(N, "🚨 btnList:", btnList);
    for (const selector of btnList) {
      observe_and_run(selector, focusable, false);
    }
  };

  const removeFocusable = () => {
    const a2span = (ele) => {
      if (ele.tagName.toLowerCase() === "a") {
        const span = document.createElement("span");
        span.innerHTML = ele.innerHTML;
        Array.from(ele.attributes).forEach((attr) => {
          if (!["href", "target"].includes(attr.name)) {
            span.setAttribute(attr.name, attr.value);
          }
        });
        // 用 <span> 替换 <a>
        ele.parentNode.replaceChild(span, ele);
      }
    };
    const prop = getPageProperty();
    if (prop.name == "home") {
      // 首页
      observe_and_run(".bili-video-card__info--tit>a", a2span, false);
    }
  };
  // -------------------------------------------------- 让对象可聚焦 - END

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
  if (window.location.href.includes("bangumi/play")) {
    eleDict.fullscreen = ".bpx-player-ctrl-full"; //全屏
    eleDict.webFullscreen = ".bpx-player-ctrl-web"; //网页全屏
    eleDict.theaterMode = ".bpx-player-ctrl-wide"; //宽屏
    eleDict.miniPlayer = ".bpx-player-ctrl-pip"; //画中画
    eleDict.mute = ".bpx-player-ctrl-volume"; //静音
    eleDict.danmaku = ".bpx-player-dm-switch input"; //弹幕开关
    eleDict.playPrev = ".bpx-player-ctrl-prev"; //播放上一P
    eleDict.playNext = ".bpx-player-ctrl-next"; //播放下一P
    eleDict.playerWrapper = ".bpx-player-video-wrap"; //播放器可双击区域
  }

  // 快捷键对应按键
  const shortcutDict = {
    a: eleDict.fullscreen, //全屏
    w: eleDict.webFullscreen, //网页全屏
    k: eleDict.theaterMode, //宽屏
    i: eleDict.miniPlayer, //画中画
    // 'm': eleDict.mute, //静音(播放器自带 加了会变点两次)
    // 'd': eleDict.danmaku, //弹幕开关
    // s: eleDict.collect, //收藏
  };
  let keyActionsStopPropagation = {
    // 变速（x留给vimium关闭网页）
    c: () => changePlaySpeed(0.1), //加速
    v: () => changePlaySpeed(-0.1), //减速
    z: () => changePlaySpeed(99), //toggle 默认速度
    // 跳P
    "ArrowLeft,Shift": () => find_n_click(eleDict.playPrev),
    "ArrowRight,Shift": () => find_n_click(eleDict.playNext),
    // 从稍后播删除当前播放的视频
    s: deleteFinishedVideo,
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
    console.debug(`${N}keyDown e:`, e);
    keyPressed[e.key] = true;
    console.debug(`${N}keyDown keyPressed:`, keyPressed);
    const keys = Object.keys(keyPressed).sort().toString();
    console.debug(`${N}keyDown keys:`, keys); //如果多按键会变成"a,b"

    // 如果光标在输入框里，快捷键不生效
    if (
      e.target.tagName === "TEXTAREA" ||
      (e.target.tagName === "INPUT" &&
        ["text", "password", "url", "search", "tel", "email"].includes(
          e.target.type
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
    console.debug(`${N}keyUp e:`, e);
    delete keyPressed[e.key];
    console.debug(`${N}keyUp keyPressed:`, keyPressed);
  };

  window.onfocus = function () {
    // 当窗口获得焦点时
    // console.debug(`${N}Ctrl+数字切出tab页不会清空按键，所以重新进入时清空一下。`);
    keyPressed = {}; // 清空
  };
  // -------------------------------------------------- shortcut - END

  // -------------------------------------------------- 自动连播 - START
  let autoPlayNext = 0; //0=stop; 1=next; -1=prev
  let btnStatusList = ["开启连播", "正序连播中", "倒序连播中"];

  const setupPlayNextButton = (button) => {
    // 添加样式
    const existingStyle = document.querySelector(`style[data-id="playNext"]`);
    if (!existingStyle) {
      const style = document.createElement("style");
      style.setAttribute("data-id", "playNext");

      style.textContent = `
      .auto-play-next-video{
        position:relative;cursor:pointer;line-height:1.5;
        padding:.25em .75em;margin:0 .25em;border-radius:3em;
        background:#06fc;color:#fff!important;
      }
      .auto-play-next-video:hover{background:#06f}

      .auto-play-next-video.active{background:#f33c}
      .auto-play-next-video.active:hover{background:#f33}

      .auto-play-next-video::after{
        content:"仅连播列表内的视频";white-space:nowrap;
        display:none;position:absolute;top:-120%;left:0;
        padding:.25em .75em;border-radius:3em;background:#0009;
      }
      .auto-play-next-video:hover::after{display:block;}
    `;
      // 给进度栏的按钮追加样式
      style.textContent += `.bpx-player-control-bottom .auto-play-next-video{
        position:absolute;top:-3rem;left:1rem;font-size:1rem;}`;
      // 修复列表顶部布局
      style.textContent += `.video-sections-head_first-line
      .first-line-right{flex:none;}`;
      // 暂停时强制显示视频控制栏
      style.textContent += `.bpx-state-paused
      .bpx-player-control-bottom{opacity:1!important}`;
      document.head.appendChild(style);
    }

    // 点击连播切换状态
    button.addEventListener("click", function (event) {
      autoPlayNext = (autoPlayNext + 1) % btnStatusList.length;
      updateBtnStatus();
      event.stopPropagation();
    });
  };

  const updateBtnStatus = () => {
    document.querySelectorAll(".auto-play-next-video").forEach((node) => {
      if (autoPlayNext == 0) {
        node.classList.remove("active");
      } else {
        node.classList.add("active");
      }
      node.innerHTML = btnStatusList[autoPlayNext];
    });
  };

  const addAutoPlayNextBtn = (nextBtn) => {
    // listTitle 是播放列表右上角的原连播按钮左侧的文字
    const listTitle = document.querySelector(".next-button .txt");
    if (listTitle) {
      listTitle.className = "auto-play-next-video";
      setupPlayNextButton(listTitle);
    }

    const newBtn = document.createElement("a");
    setupPlayNextButton(newBtn);
    newBtn.className = "auto-play-next-video";
    nextBtn.parentNode.insertBefore(newBtn, nextBtn); //insert btn

    updateBtnStatus();
    console.debug(`${N}自动连播:`, autoPlayNext);
  };

  function playNextVideo(mode) {
    // B站的列表（播放全部 稍后播）默认会循环播放，为了点播放量B脸都不要了。
    // 这里先判断如果是顺序播放，并且当前为列表最后一个视频，则不再继续播。
    // mode 1=正序 2=倒序
    const loopDiv = document.querySelector(
      '.action-list-header div[title="列表循环"]'
    );
    if (loopDiv) {
      // 获取播放列表
      const itemWraps = document.querySelectorAll(
        ".action-list-inner .action-list-item-wrap"
      );
      // 获取最后一个 action-list-item-wrap 元素
      const lastItemWrap = itemWraps[mode == 1 ? itemWraps.length - 1 : 0];
      // 检查最后一个元素是否含有 siglep-active 类
      if (lastItemWrap.querySelector(".siglep-active")) {
        console.debug(`${N}This is the last video`);
        return;
      }
    }
    // 点击下一个视频
    find_n_click(mode == 1 ? eleDict.playNext : eleDict.playPrev);
  }
  // -------------------------------------------------- 自动连播 - END

  // -------------------------------------------------- init - START
  // 初始化动作（以前B站跳转油猴不会重载，所以抽象，现在似乎已无必要）
  const init = function () {
    console.debug(`${N}Init:`, window.location.href);

    const prop = getPageProperty();

    // ------------------------------ isPlayerPage - START
    if (prop.type == "player") {
      if (window.location.href.includes("watchlater")) {
        // 判断当前页面 如果是稍后播 则自动开启连播
        autoPlayNext = 1;
        btnStatusList = ["开启连播", "连播中"];
        updateBtnStatus();
        console.log(N, "✅ autoPlayNext:", autoPlayNext);
      }

      // 寻找视频对象 载入播放速度
      observe_and_run(`${eleDict.playerWrapper} video`, (target) => {
        videoObj = find(`${eleDict.playerWrapper} video`); //global

        changePlaySpeed(0); // 载入保存的播放速度

        // 自动切P （自动播放关闭，当视频播放结束时自动按下一P按钮。）
        // B站自动连播现在会自动播放推荐视频，包括播放列表以外的内容，
        // 单P视频也会连播，此处应有蒙古上单名言。
        videoObj.addEventListener("ended", () => {
          console.debug(`${N}Video ended, try play next...`);
          if (autoPlayNext) {
            if (prop.name == "watchlater") {
              deleteFinishedVideo();
            } else {
              playNextVideo(autoPlayNext);
            }
          }
        });

        videoObj.addEventListener("play", () => {
          console.debug(`${N}Video start to play ▶`);
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
    } // ------------------------------ isPlayerPage - END

    // 稍后播按钮
    makeElementFocusable();
    if (["home", "activity"].includes(prop.name)) {
      removeFocusable();
    }

    // 稍后播列表页自动化
    if (prop.name == "watchlater-list") {
      autoRefreshWatchLaterList();
    }

    // 阿B已自带以下功能，但不确定是否所有播放器都支持，暂留

    // 寻找视频播放器 添加双击切换全屏
    // observe_and_run(eleDict.playerWrapper, (click_area) => {
    //     click_area.addEventListener('dblclick', function(e) {
    //         e.stopPropagation()
    //         console.log('双击切换全屏')
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
