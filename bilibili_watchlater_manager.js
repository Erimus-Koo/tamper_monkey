// ==UserScript==
// @name         B站稍后播管理器
// @version      0.1.0
// @description  稍后播增强：自动删除已播放、列表自动刷新、按钮可聚焦（配合Vim使用）
// @author       Erimus
// @namespace    https://greasyfork.org/users/46393
// @icon         https://www.google.com/s2/favicons?sz=64&domain=bilibili.com

// @match        *://www.bilibili.com/watchlater/*/list
// @match        *://www.bilibili.com/list/watchlater
// @match        *://www.bilibili.com/?*
// @match        *://t.bilibili.com/*
// @match        *://space.bilibili.com/*
// ==/UserScript==

/* 功能说明
====================
稍后播增强功能

1. 自动删除已播放视频
   - 播放完成后自动删除当前视频
   - 自动播放下一个视频
   - 支持单P和多P视频

2. 列表页自动化
   - 列表为空时自动刷新
   - 有视频时自动跳转到播放页

3. 按钮可聚焦（配合Vim使用）
   - 首页的稍后播按钮
   - 动态页的稍后播按钮
   - 个人页的稍后播按钮
   - 播放页右侧列表的视频项

4. 快捷键
   - [S]: 手动删除当前视频
   - [Shift + ←]: 播放上一个视频
   - [Shift + →]: 播放下一个视频

5. 自动开启连播
   - 进入稍后播页面自动开启连播
====================
*/

(function () {
  ("use strict");

  // -------------------------------------------------- common - START
  const N = "[稍后播管理器] ";
  console.log(`${N}油猴脚本开始`);

  const find = (selector) => {
    return document.querySelector(selector);
  };

  const find_n_click = (selector) => {
    console.log(`${N}cmd: document.querySelector('${selector}').click()`);
    const target = document.querySelector(selector);
    target?.click();
  };
  // -------------------------------------------------- common - END

  // -------------------------------------------------- Observer - START
  // 观察对象，等待其出现后，运行函数
  function observe_and_run(
    selector,
    runAfterElementFound,
    autoDisconnect = true,
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

  // -------------------------------------------------- 判断页面类型 - START
  const getPageProperty = () => {
    // 获取页面名称 用于分类等
    const prop = {};
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
  // -------------------------------------------------- 判断页面类型 - END

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
      const displayThenClick = (delBtn) => {
        if (delBtn) {
          delBtn.style.display = "block"; // 或根据实际需求 restore 原样式
          delBtn.click();
        }
      };
      let deletedLastVideo = false;
      if (videoType == "single") {
        displayThenClick(currentP.querySelector(".del-btn"));
        deletedLastVideo = true;
      } else if (videoType == "multi") {
        if (isLastSubP) {
          displayThenClick(currentP.querySelector(".del-btn"));
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

    if (prop.name == "home") {
      // 首页 稍后播
      btnList = btnList.concat(".bili-watch-later");
    } else if (prop.name == "activity") {
      // 动态页
      btnList = btnList.concat(
        ".bili-dyn-card-video__mark", //稍后播
        ".relevant-topic-container__item", //话题
        ".bili-dyn-list__notification", //列表顶部的有新动态
        ".bili-dyn-list-notification", //列表顶部的有新动态
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
  // -------------------------------------------------- 让对象可聚焦 - END

  // -------------------------------------------------- 切换视频 - START
  const switchVideo = (direction) => {
    // direction: 1=下一个, -1=上一个
    console.log(`${N}切换视频: ${direction === 1 ? "下一个" : "上一个"}`);

    if (!document.URL.includes("list/watchlater")) {
      console.debug(`${N}不在稍后播页面`);
      return;
    }

    // 直接点击播放器的上一个/下一个按钮
    const btnSelector =
      direction === 1 ? ".bpx-player-ctrl-next" : ".bpx-player-ctrl-prev";
    const btn = document.querySelector(btnSelector);

    if (btn) {
      btn.click();
      console.log(`${N}✅ 已点击播放器按钮: ${btnSelector}`);
    } else {
      console.log(`${N}❌ 未找到播放器按钮: ${btnSelector}`);
    }
  };
  // -------------------------------------------------- 切换视频 - END

  // -------------------------------------------------- shortcut - START
  let keyPressed = {}; //按下的所有键 目的是为了区分 1 和 ctrl+1 这种情况

  let keyActionsStopPropagation = {
    // 从稍后播删除当前播放的视频
    s: deleteFinishedVideo,
    // 切换视频
    "ArrowLeft,Shift": () => switchVideo(-1), // 上一个
    "ArrowRight,Shift": () => switchVideo(1), // 下一个
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
          e.target.type,
        ))
    ) {
      return;
    }

    // 设置快捷键
    if (keys in keyActionsStopPropagation) {
      //运行自定义函数的快捷键
      console.log(`${N}✅ 触发快捷键: ${keys}`);
      e.preventDefault(); // 阻止默认行为
      e.stopPropagation(); // 阻止事件冒泡
      keyActionsStopPropagation[keys]();
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

  // -------------------------------------------------- init - START
  // 初始化动作
  const init = function () {
    console.debug(`${N}Init:`, window.location.href);

    const prop = getPageProperty();

    // ------------------------------ 稍后播播放页 - START
    if (prop.name == "watchlater") {
      // 自动开启连播
      console.log(N, "✅ 稍后播页面，准备自动删除和连播");

      // 监听视频结束事件
      observe_and_run(".bpx-player-video-wrap video", (videoObj) => {
        videoObj.addEventListener("ended", () => {
          console.debug(`${N}Video ended, deleting...`);
          deleteFinishedVideo();
        });
      });

      // 添加快捷键监听（使用捕获阶段，优先于B站的处理）
      document.addEventListener("keydown", pressKeyDown, true); // capture: true
      document.addEventListener("keyup", pressKeyUp, true); // capture: true
    }
    // ------------------------------ 稍后播播放页 - END

    // 稍后播按钮可聚焦
    makeElementFocusable();

    // 稍后播列表页自动化
    if (prop.name == "watchlater-list") {
      autoRefreshWatchLaterList();
    }
  };
  init();
  // -------------------------------------------------- init - END
})();
