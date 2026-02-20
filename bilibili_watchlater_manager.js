// ==UserScript==
// @name         B站稍后播管理器
// @version      0.1.0
// @description  稍后播增强：自动删除已播放、列表自动刷新、按钮可聚焦（配合Vim使用）
// @author       Erimus
// @namespace    https://greasyfork.org/users/46393
// @icon         https://www.google.com/s2/favicons?sz=64&domain=bilibili.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest

// @match        *://www.bilibili.com/watchlater/list*
// @match        *://www.bilibili.com/list/watchlater*
// @match        *://www.bilibili.com/?*
// @match        *://t.bilibili.com/*
// @match        *://space.bilibili.com/*

// @require      https://cdn.jsdelivr.net/npm/js-yaml@4/dist/js-yaml.min.js
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
      "list/watchlater": "watchlater", // 稍后播播放页
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
    // 动态页（关注列表）
    if (url.includes(`t.bilibili.com`)) {
      prop.name = "activity";
    }
    // 稍后播列表页（注意：要在 list/watchlater 之后判断，避免被覆盖）
    if (url.includes(`www.bilibili.com/watchlater/list`)) {
      prop.name = "watchlater-list";
    }
    // 个人空间
    if (url.includes(`space.bilibili.com`)) {
      prop.name = "space";
    }
    console.debug(N, "🚨 prop:", prop, "url:", url);
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
    // 功能：如果稍后播列表内无视频，则自动刷新。如果有视频则跳转到播放页自动播放。

    // 1. 检查当前页面是否是稍后播列表页
    if (getPageProperty().name == "watchlater-list") {
      console.log(`${N}检测到稍后播列表页，启动自动刷新/播放逻辑`);

      // 获取刷新次数
      const REFRESH_COUNT_KEY = "bilibili_watchlater_refresh_count";
      let refreshCount = parseInt(
        localStorage.getItem(REFRESH_COUNT_KEY) || "0",
      );
      console.log(`${N}当前刷新次数: ${refreshCount}/10`);

      // 2. 视频列表是后加载的，进入页面直接获取不到，所以等5秒后再检查
      setInterval(() => {
        console.log(`${N}检查稍后播列表是否有视频...`);

        // 3. 检查页面上是否有视频卡片（兼容2024和2025版本的选择器）
        const hasVideo2024 = document.querySelector(".av-item");
        const hasVideo2025 = document.querySelector(".video-card");

        if (hasVideo2024 || hasVideo2025) {
          // 4. 如果有视频，跳转到播放页（会自动播放第一个视频）
          console.log(
            `${N}发现视频，跳转到播放页: https://www.bilibili.com/list/watchlater`,
          );
          // 重置刷新次数
          localStorage.removeItem(REFRESH_COUNT_KEY);
          window.location.href = "https://www.bilibili.com/list/watchlater";
        } else {
          // 5. 如果没有视频，检查刷新次数
          if (refreshCount >= 10) {
            console.log(`${N}已刷新10次，列表仍为空，停止刷新`);
            localStorage.removeItem(REFRESH_COUNT_KEY);
            return;
          }

          // 6. 增加刷新次数并等60秒后刷新页面
          refreshCount++;
          localStorage.setItem(REFRESH_COUNT_KEY, refreshCount.toString());
          console.log(`${N}列表为空，60秒后刷新页面 (第${refreshCount}次)`);
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

  // -------------------------------------------------- shortcut - START
  let keyPressed = {}; //按下的所有键 目的是为了区分 1 和 ctrl+1 这种情况

  let keyActionsStopPropagation = {
    // 从稍后播删除当前播放的视频
    s: deleteFinishedVideo,
  };

  const pressKeyDown = function (e) {
    console.debug(`${N}keyDown e:`, e);

    // 获取真实的事件目标（包括 Shadow DOM 内部的元素）
    const path = e.composedPath ? e.composedPath() : [e.target];

    console.debug(`${N}event path:`, path);

    // 检查事件路径中是否有可编辑元素
    const isInEditableElement = path.some((element) => {
      if (!element.tagName) return false; // 跳过非元素节点

      return (
        element.contentEditable === "true" ||
        element.isContentEditable ||
        element.tagName === "TEXTAREA" ||
        (element.tagName === "INPUT" &&
          ["text", "password", "url", "search", "tel", "email"].includes(
            element.type,
          ))
      );
    });

    if (isInEditableElement) {
      console.debug(`${N}在输入框内，忽略快捷键`);
      return;
    }

    keyPressed[e.key] = true;
    console.debug(`${N}keyDown keyPressed:`, keyPressed);
    const keys = Object.keys(keyPressed).sort().toString();
    console.debug(`${N}keyDown keys:`, keys); //如果多按键会变成"a,b"

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

  // -------------------------------------------------- 自动收藏到稍后播 - START
  const STORAGE_KEY = "bilibili_auto_collect_data";

  // Gist 配置
  const GIST_KEY = "bilibili_watchlater_gist";
  const defaultGistSetting = { id: "", file: "", token: "" };
  const rawGistCfg = GM_getValue(GIST_KEY, JSON.stringify(defaultGistSetting));
  let gistData = JSON.parse(rawGistCfg);

  // 自动收藏状态
  let isRunning = false;
  let isPaused = false;
  let processedCount = 0;

  // 获取存储的数据
  const getStorageData = () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        subscribedAuthorsText: "", // 原始文本，包含注释
        subscribedAuthors: [], // 清洗后的作者列表
        lastStopId: "",
        addedIds: [],
        updateTime: "", // 用于Gist同步
      };
    }
    const data = JSON.parse(raw);
    if (!data.updateTime) data.updateTime = "";
    return data;
  };

  // 保存数据
  const saveStorageData = (data) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  // 解析作者列表（从文本中提取纯作者名）
  const parseAuthors = (text) => {
    return text
      .split("\n")
      .map((line) => line.split("//")[0].trim()) // 去掉行内注释
      .filter((line) => line && !line.includes("-----"));
  };

  // Gist 同步功能
  const fetchGistContent = async () => {
    try {
      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: "GET",
          url: `https://api.github.com/gists/${gistData.id}`,
          headers: {
            Authorization: `token ${gistData.token}`,
            Accept: "application/vnd.github.v3+json",
          },
          onload: (response) => {
            if (response.status === 200) {
              const _gist = JSON.parse(response.responseText);
              const _content = _gist.files[gistData.file].content;
              const configData = jsyaml.load(_content);
              resolve(configData);
            } else {
              reject(new Error("Error fetching Gist: " + response.statusText));
            }
          },
          onerror: (error) => {
            reject(error);
          },
        });
      });
    } catch (error) {
      console.error(`${N}Error fetching Gist:`, error);
      throw error;
    }
  };

  const uploadGistContent = async (newConfig) => {
    try {
      const newContent = jsyaml.dump(newConfig);
      console.log(`${N}上传到 Gist:`, newContent);

      const updatedData = {
        files: {
          [gistData.file]: { content: newContent },
        },
      };

      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: "PATCH",
          url: `https://api.github.com/gists/${gistData.id}`,
          headers: {
            Authorization: `token ${gistData.token}`,
            Accept: "application/vnd.github.v3+json",
          },
          data: JSON.stringify(updatedData),
          onload: (response) => {
            if (response.status === 200) {
              resolve("Gist updated successfully!");
            } else {
              reject(new Error("Error updating Gist: " + response.statusText));
            }
          },
          onerror: (error) => {
            reject(error);
          },
        });
      });
    } catch (error) {
      console.error(`${N}Error updating Gist:`, error);
      throw error;
    }
  };

  const syncGist = async () => {
    if (!gistData.id || !gistData.file || !gistData.token) {
      console.log(`${N}Gist 未配置，跳过同步`);
      return;
    }

    try {
      const data = getStorageData();
      const gistConfig = await fetchGistContent();

      if (!gistConfig.updateTime) gistConfig.updateTime = "";
      if (!data.updateTime) data.updateTime = "";

      console.log(
        `${N}📥 Gist时间: ${gistConfig.updateTime}, 本地时间: ${data.updateTime}`,
      );

      // 本地配置较新
      if (data.updateTime > gistConfig.updateTime) {
        const uploadData = {
          subscribedAuthorsText: data.subscribedAuthorsText,
          updateTime: new Date().toISOString(),
        };
        const message = await uploadGistContent(uploadData);
        console.log(`${N}👆 本地较新，上传到 Gist:`, message);

        // 更新本地时间
        data.updateTime = uploadData.updateTime;
        saveStorageData(data);
      }
      // Gist 较新
      else if (gistConfig.updateTime > data.updateTime) {
        console.log(`${N}👇 Gist 较新，更新本地`);
        data.subscribedAuthorsText = gistConfig.subscribedAuthorsText || "";
        data.subscribedAuthors = parseAuthors(data.subscribedAuthorsText);
        data.updateTime = gistConfig.updateTime;
        saveStorageData(data);
      } else {
        console.log(`${N}💚 Gist 和本地时间相同`);
      }
    } catch (error) {
      console.error(`${N}Gist 同步失败:`, error);
    }
  };

  // 提取视频ID和标题
  const extractVideoId = (item) => {
    const link = item.querySelector(".bili-dyn-card-video");
    if (!link) return null;
    const href = link.getAttribute("href");
    const match = href?.match(/\/video\/([^\/]+)/);
    return match ? match[1] : null;
  };

  const extractVideoTitle = (item) => {
    const titleEle = item.querySelector(".bili-dyn-card-video__title");
    return titleEle ? titleEle.textContent.trim() : "";
  };

  // 检查是否应该跳过
  const shouldSkip = (item) => {
    const authorEle = item.querySelector(".bili-dyn-title__text");
    if (!authorEle) {
      console.log(`${N}跳过：没有作者名`);
      return true;
    }

    const badge = item.querySelector(".bili-dyn-card-video__badge");
    if (badge && badge.textContent.trim() === "充电专属") {
      console.log(`${N}跳过：充电专属`);
      return true;
    }

    return false;
  };

  // 处理单个item
  const processItem = async (item, subscribedAuthors, addedIds) => {
    if (shouldSkip(item)) return false;

    const videoId = extractVideoId(item);
    const videoTitle = extractVideoTitle(item);

    if (!videoId) {
      console.log(`${N}跳过：无法提取视频ID`);
      return false;
    }

    if (addedIds.includes(videoId)) {
      console.log(`${N}跳过：已添加过 - ${videoTitle} (${videoId})`);
      item.classList.add("added-to-watch-later");
      return false;
    }

    const authorEle = item.querySelector(".bili-dyn-title__text");
    const author = authorEle.textContent.trim();

    if (!subscribedAuthors.includes(author)) {
      return false;
    }

    console.log(`${N}✅ 匹配作者: ${author}, 视频: ${videoTitle} (${videoId})`);

    const watchLaterBtn = item.querySelector(".bili-dyn-card-video__mark");
    if (watchLaterBtn) {
      watchLaterBtn.click();
      item.classList.add("added-to-watch-later");
      console.log(
        `${N}✅ 已添加到稍后播: ${author} - ${videoTitle} (${videoId})`,
      );
      return videoId;
    }

    return false;
  };

  // 开始自动收藏
  const startAutoCollect = async (fromStart = false) => {
    if (isRunning) {
      isPaused = !isPaused;
      updateButtonState();
      console.log(`${N}${isPaused ? "⏸ 暂停" : "▶ 继续"}`);
      return;
    }

    isRunning = true;
    isPaused = false;
    processedCount = 0;
    updateButtonState();

    const data = getStorageData();
    const subscribedAuthors = data.subscribedAuthors;

    if (subscribedAuthors.length === 0) {
      alert("请先设置订阅作者！");
      isRunning = false;
      updateButtonState();
      return;
    }

    console.log(
      `${N}🚀 开始自动收藏，订阅作者: ${subscribedAuthors.join(", ")}`,
    );

    const stopId = fromStart ? "" : data.lastStopId;
    const maxItems = fromStart ? 100 : stopId ? 300 : 100;

    if (stopId) {
      console.log(`${N}上次停止位置ID: ${stopId}`);
    } else {
      console.log(`${N}从头开始扫描`);
    }

    let firstId = "";
    const newAddedIds = [];
    let processedItemCount = 0;

    // 动态获取items，因为列表会随着滚动而增长
    while (processedItemCount < maxItems) {
      while (isPaused && isRunning) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (!isRunning) break;

      // 每次循环重新获取当前的item列表
      const items = document.querySelectorAll(".bili-dyn-list__item");
      if (processedItemCount >= items.length) {
        console.log(`${N}⏹ 已处理所有可见动态`);
        break;
      }

      const item = items[processedItemCount];

      // 先滚动到item并等待1秒，触发动态加载
      item.scrollIntoView({ behavior: "smooth", block: "center" });
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const videoId = extractVideoId(item);
      const videoTitle = extractVideoTitle(item);

      // 记录第一个视频的ID作为下次的停止位置
      if (processedItemCount === 0 && videoId) {
        firstId = videoId;
        console.log(
          `${N}记录本次第一个视频作为下次停止位置: ${videoTitle} (${videoId})`,
        );
      }

      // 如果遇到上次记录的停止位置，说明已经扫描到旧内容了
      if (stopId && videoId === stopId) {
        console.log(`${N}⏹ 到达上次停止位置: ${videoTitle} (${stopId})`);
        break;
      }

      // 如果已经添加过，标记但继续扫描（不停止）
      if (videoId && data.addedIds.includes(videoId)) {
        console.log(`${N}跳过已添加: ${videoTitle} (${videoId})`);
        item.classList.add("added-to-watch-later");
        processedItemCount++;
        continue;
      }

      const result = await processItem(item, subscribedAuthors, data.addedIds);
      if (result) {
        newAddedIds.push(result);
        processedCount++;
      }

      processedItemCount++;
      console.log(`${N}已扫描 ${processedItemCount} 个动态`);
    }

    if (firstId) {
      data.lastStopId = firstId;
    }
    if (newAddedIds.length > 0) {
      data.addedIds = [...newAddedIds, ...data.addedIds].slice(0, 100);
    }
    saveStorageData(data);

    // 更新页面上的停止位置标记
    if (firstId) {
      // 移除所有旧的停止位置标记
      document.querySelectorAll(".last-stop-position").forEach((item) => {
        item.classList.remove("last-stop-position");
      });

      // 给新的停止位置添加标记
      document.querySelectorAll(".bili-dyn-list__item").forEach((item) => {
        const videoId = extractVideoId(item);
        if (videoId === firstId) {
          item.classList.add("last-stop-position");
        }
      });
    }

    console.log(
      `${N}✅ 完成！扫描了 ${processedItemCount} 个动态，添加了 ${processedCount} 个视频`,
    );
    isRunning = false;
    isPaused = false;
    updateButtonState();
  };

  // 更新按钮状态
  const updateButtonState = () => {
    const btn = document.getElementById("btn-run");
    if (!btn) return;

    const icons = {
      play: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="6 3 20 12 6 21 6 3"/></svg>`,
      pause: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`,
    };

    if (isRunning) {
      if (isPaused) {
        btn.className = "auto-collect-btn paused";
        btn.innerHTML = `${icons.play}<span>继续</span>`;
      } else {
        btn.className = "auto-collect-btn running";
        btn.innerHTML = `${icons.pause}<span>暂停</span>`;
      }
    } else {
      btn.className = "auto-collect-btn";
      btn.innerHTML = `${icons.play}<span>开始</span>`;
    }
  };

  // 初始化自动收藏功能
  const initAutoCollect = () => {
    if (!document.URL.includes("t.bilibili.com")) return;

    console.log(`${N}✅ 初始化自动收藏功能`);

    // 添加样式
    const style = document.createElement("style");
    style.textContent = `
      .bili-dyn-list__item{position:relative}
      .added-to-watch-later{opacity:.5;transition:opacity .3s}
      .added-to-watch-later:hover{opacity:1}
      .added-to-watch-later .bili-dyn-card-video__stat:after{
        content:'已加入稍后再看';color:#F69;
      }
      #auto-collect-controls{position:fixed;left:8px;top:74px;z-index:9999;display:flex;flex-direction:column;gap:8px}
      .auto-collect-btn{display:flex;align-items:center;gap:6px;padding:8px 12px;background:#00a1d6;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,.15);transition:all .3s}
      .auto-collect-btn:hover{background:#00b5e5;transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,.2)}
      .auto-collect-btn.running{background:#fb7299}
      .auto-collect-btn.paused{background:#ff9800}
      #auto-collect-modal{display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,.6);z-index:10000;justify-content:center;align-items:center}
      #auto-collect-modal.show{display:flex}
      .auto-collect-dialog{background:#fff;border-radius:1em;padding:1.5em;width:500px;max-width:90vw;height:80vh;display:flex;flex-flow:column nowrap;}
      .auto-collect-dialog *{box-sizing:border-box;}
      .auto-collect-dialog>*{flex:none;}
      .auto-collect-dialog>.tab-content{flex:1!important;overflow-y:auto;}
      .auto-collect-dialog h3{margin:0 0 16px;font-size:18px;color:#333}
      .auto-collect-dialog h4{margin:16px 0 8px;font-size:14px;color:#666}
      .auto-collect-dialog .tab-buttons{display:flex;gap:1px;margin-bottom:16px;background:#0001;padding:1px;}
      .auto-collect-dialog .tab-btn{flex:1;padding:10px;background:#f0f0f0;border:none;border-radius:6px;cursor:pointer;font-size:14px;color:#666}
      .auto-collect-dialog .tab-btn.active{background:#00a1d6;color:#fff;font-weight:600}
      .auto-collect-dialog .tab-content{display:none}
      .auto-collect-dialog .tab-content.active{display:flex;flex-flow:column nowrap;height:100%;}
      .auto-collect-dialog textarea{width:100%;height:100%;padding:12px;border:1px solid #ddd;border-radius:6px;font-size:14px;resize:vertical;font-family:sans-serif;}
      .auto-collect-dialog .hint{margin:12px 0;font-size:12px;color:#999}
      .auto-collect-dialog .gist-section{margin-top:16px;padding-top:16px;border-top:1px solid #eee}
      .auto-collect-dialog .gist-section input{width:100%;padding:8px 12px;margin-bottom:8px;border:1px solid #ddd;border-radius:6px;font-size:14px}
      .auto-collect-dialog .btn-gist-sync{width:100%;padding:10px;background:#28a745;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px;margin-top:4px}
      .auto-collect-dialog .btn-gist-sync:hover{background:#218838}
      .auto-collect-dialog .btn-clear-record{width:100%;padding:10px;background:#ff6b6b;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px;margin-top:12px}
      .auto-collect-dialog .btn-clear-record:hover{background:#ff5252}
      .last-stop-position:after{
        content:'上次看到这里';position:absolute;top:0;left:50%;transform:translateX(-50%);background:#000;color:#FFF;padding:.125em .5em;border-radius:0 0 .5em .5em;
      }
      .last-stop-position .bili-dyn-item{outline:2px solid #000}
      .auto-collect-dialog .buttons{display:flex;gap:12px;margin-top:16px}
      .auto-collect-dialog button{flex:1;padding:10px;border:none;border-radius:6px;cursor:pointer;font-size:14px}
      .auto-collect-dialog .btn-save{background:#00a1d6;color:#fff}
      .auto-collect-dialog .btn-cancel{background:#e5e5e5;color:#666}
    `;
    document.head.appendChild(style);

    // 创建控制按钮
    const container = document.createElement("div");
    container.id = "auto-collect-controls";
    const icons = {
      play: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="6 3 20 12 6 21 6 3"/></svg>`,
      settings: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,
    };
    container.innerHTML = `
      <button class="auto-collect-btn" id="btn-run">${icons.play}<span>开始</span></button>
      <button class="auto-collect-btn" id="btn-settings">${icons.settings}<span>设置</span></button>
    `;
    document.body.appendChild(container);

    // 创建设置弹窗
    const modal = document.createElement("div");
    modal.id = "auto-collect-modal";
    modal.innerHTML = `
      <div class="auto-collect-dialog">
        <h3>自动添加到稍后播 - 设置</h3>
        <div class="tab-buttons">
          <button class="tab-btn active" data-tab="authors">订阅作者</button>
          <button class="tab-btn" data-tab="settings">高级设置</button>
        </div>
        <div class="tab-content active" data-tab="authors">
          <textarea id="authors-input" placeholder="一行一个作者名\n支持 // 注释\n空行会被忽略"></textarea>
          <div class="hint">提示：输入你想自动添加到稍后播的UP主名字，一行一个<br>支持 // 开头的注释行，空行会被自动过滤</div>
        </div>
        <div class="tab-content" data-tab="settings">
          <div class="gist-section">
            <h4>💾 Gist 云同步</h4>
            <input id="gist-id" placeholder="Gist ID (32位字符)" value="">
            <input id="gist-file" placeholder="文件名 (xxx.yaml)" value="">
            <input id="gist-token" type="password" placeholder="Token (ghp_...)" value="">
            <button class="btn-gist-sync">从 Gist 同步</button>
          </div>
          <div class="gist-section">
            <h4>🗑️ 清除记录</h4>
            <button class="btn-clear-record">清除上次停止位置</button>
            <div class="hint">清除后下次运行将从头扫描100条</div>
          </div>
        </div>
        <div class="buttons">
          <button class="btn-cancel">取消</button>
          <button class="btn-save">保存</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // 绑定事件
    // Tab切换
    modal.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.onclick = () => {
        const tab = btn.dataset.tab;
        modal
          .querySelectorAll(".tab-btn, .tab-content")
          .forEach((el) => el.classList.remove("active"));
        modal
          .querySelector(`.tab-btn[data-tab="${tab}"]`)
          .classList.add("active");
        modal
          .querySelector(`.tab-content[data-tab="${tab}"]`)
          .classList.add("active");
      };
    });

    document.getElementById("btn-run").onclick = () => {
      const data = getStorageData();

      // 如果列表为空，打开设置
      if (!data.subscribedAuthors || data.subscribedAuthors.length === 0) {
        modal.classList.add("show");
        alert("请先在设置中添加订阅作者！");
        return;
      }

      // 如果没有stopId，提示用户
      if (!data.lastStopId) {
        const confirmed = confirm(
          "首次运行将扫描最新的100条动态。\n\n" +
            "下次运行时会自动从本次停止的位置继续扫描。\n\n" +
            "是否开始？",
        );
        if (!confirmed) return;
      }

      startAutoCollect(false);
    };

    document.getElementById("btn-settings").onclick = () => {
      // 每次打开设置时重新读取最新数据
      const data = getStorageData();
      modal.querySelector("#authors-input").value =
        data.subscribedAuthorsText || "";
      modal.querySelector("#gist-id").value = gistData.id;
      modal.querySelector("#gist-file").value = gistData.file;
      modal.querySelector("#gist-token").value = gistData.token;
      modal.classList.add("show");
    };

    modal.querySelector(".btn-clear-record").onclick = () => {
      if (
        confirm(
          "确定要清除上次停止位置记录吗？\n\n清除后下次运行将从头扫描100条。",
        )
      ) {
        const data = getStorageData();
        data.lastStopId = "";
        saveStorageData(data);
        console.log(`${N}✅ 已清除停止位置记录`);
        alert("已清除记录！");
      }
    };
    modal.querySelector(".btn-cancel").onclick = () =>
      modal.classList.remove("show");
    modal.querySelector(".btn-save").onclick = async () => {
      const text = document.getElementById("authors-input").value;
      const authors = parseAuthors(text);
      const data = getStorageData(); // 重新读取最新数据
      data.subscribedAuthorsText = text; // 保存原始文本（包含注释）
      data.subscribedAuthors = authors; // 保存清洗后的作者列表
      data.updateTime = new Date().toISOString(); // 更新时间
      saveStorageData(data);

      // 保存Gist配置
      gistData.id = modal.querySelector("#gist-id").value || "";
      gistData.file = modal.querySelector("#gist-file").value || "";
      gistData.token = modal.querySelector("#gist-token").value || "";
      GM_setValue(GIST_KEY, JSON.stringify(gistData));

      modal.classList.remove("show");
      console.log(`${N}✅ 已保存 ${authors.length} 个订阅作者`);

      // 同步到Gist
      await syncGist();
    };
    modal.querySelector(".btn-gist-sync").onclick = async () => {
      // 重新读取 Gist 配置
      const rawGistCfg = GM_getValue(
        GIST_KEY,
        JSON.stringify(defaultGistSetting),
      );
      gistData = JSON.parse(rawGistCfg);

      // 保存用户输入的 Gist 配置
      gistData.id = modal.querySelector("#gist-id").value || "";
      gistData.file = modal.querySelector("#gist-file").value || "";
      gistData.token = modal.querySelector("#gist-token").value || "";
      GM_setValue(GIST_KEY, JSON.stringify(gistData));

      if (!gistData.id || !gistData.file || !gistData.token) {
        alert("请先填写完整的 Gist 配置信息！");
        return;
      }

      try {
        const gistConfig = await fetchGistContent();
        const data = getStorageData(); // 重新读取最新数据
        data.subscribedAuthorsText = gistConfig.subscribedAuthorsText || "";
        data.subscribedAuthors = parseAuthors(data.subscribedAuthorsText);
        data.updateTime = gistConfig.updateTime || "";
        saveStorageData(data);

        // 更新界面
        modal.querySelector("#authors-input").value =
          data.subscribedAuthorsText;
        console.log(`${N}✅ 已从 Gist 同步配置`);
        alert("已从 Gist 同步配置！");
      } catch (error) {
        console.error(`${N}同步失败:`, error);
        alert("同步失败，请检查 Gist 配置是否正确！");
      }
    };
    modal.onclick = (e) => {
      if (e.target === modal) modal.classList.remove("show");
    };
    document.getElementById("btn-run").oncontextmenu = (e) => {
      e.preventDefault();
      if (confirm("确定要从头开始扫描吗？")) startAutoCollect(true);
    };

    // 页面加载时标记已添加的视频和上次停止位置
    observe_and_run(
      ".bili-dyn-list__item",
      (item) => {
        const data = getStorageData();
        const videoId = extractVideoId(item);
        if (videoId && data.addedIds.includes(videoId)) {
          item.classList.add("added-to-watch-later");
        }
        // 标记上次停止位置（只要扫描过就标记，不一定要添加过）
        if (videoId && data.lastStopId && videoId === data.lastStopId) {
          item.classList.add("last-stop-position");
        }
      },
      false,
    );

    // 监听 localStorage 变化（跨 tab 同步）
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEY) {
        console.log(`${N}检测到其他 tab 修改了数据，重新加载`);
        // 如果设置弹窗是打开的，更新显示
        if (modal.classList.contains("show")) {
          const data = getStorageData();
          modal.querySelector("#authors-input").value =
            data.subscribedAuthorsText || "";
        }
      }
    });

    // 初始化时同步Gist
    (async () => await syncGist())();
  };
  // -------------------------------------------------- 自动收藏到稍后播 - END

  // -------------------------------------------------- init - START
  // 初始化动作
  const init = function () {
    console.debug(`${N}Init:`, window.location.href);

    const prop = getPageProperty();

    // ------------------------------ 稍后播播放页 - START
    if (prop.name == "watchlater") {
      console.log(N, "✅ 稍后播页面");

      // 注意：稍后播的自动删除和连播功能已由 mongolian_player 脚本处理
      // 如果未安装 mongolian_player，视频播完后不会自动删除

      // 添加快捷键监听（使用捕获阶段，优先于B站的处理）
      document.addEventListener("keydown", pressKeyDown, true); // capture: true
      document.addEventListener("keyup", pressKeyUp, true); // capture: true
    }
    // ------------------------------ 稍后播播放页 - END

    // 稍后播按钮可聚焦
    makeElementFocusable();

    // 稍后播列表页自动化
    if (prop.name == "watchlater-list") {
      console.log(
        `${N}✅ 检测到稍后播列表页，调用 autoRefreshWatchLaterList()`,
      );
      autoRefreshWatchLaterList();
    }

    // 自动收藏功能（动态页）
    if (prop.name == "activity") {
      initAutoCollect();
    }
  };
  init();
  // -------------------------------------------------- init - END
})();
