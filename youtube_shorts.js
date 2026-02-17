// ==UserScript==
// @name         YouTube Shorts Auto Play
// @namespace    http://tampermonkey.net/
// @version      0.3.0
// @description  Auto play next shorts and dislike shortcut
// @author       You
// @match        https://www.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  const N = "[YouTube Shorts] ";

  console.log(`${N}=== Script loaded ===`);
  console.log(`${N}Current URL: ${window.location.href}`);

  // 判断是否在 Shorts 页面
  function isShortsPage() {
    return window.location.pathname.startsWith("/shorts/");
  }

  // 按 s 或 d 点击 dislike 按钮（仅在 Shorts 页面有效）
  document.addEventListener("keydown", (e) => {
    if (
      (e.key === "s" || e.key === "S" || e.key === "d" || e.key === "D") &&
      isShortsPage()
    ) {
      console.log(`${N}Detected "${e.key}" key press on Shorts page.`);

      const dislikeBtn = document.querySelector(
        'button[aria-label="Dislike this video"]',
      );
      if (dislikeBtn) {
        console.log(`${N}Clicking dislike button.`);
        dislikeBtn.click();

        // 0.5秒后自动点击下一个视频
        setTimeout(() => {
          console.log(`${N}Auto-clicking next after dislike.`);
          clickNext();
        }, 500);
      } else {
        console.error(`${N}Dislike button not found.`);
      }
    }
  });

  // 当前活动的视频处理器
  let currentVideoHandler = null;
  let lastVideoId = "";

  // 获取当前视频ID
  function getCurrentVideoId() {
    const match = window.location.pathname.match(/\/shorts\/([^\/]+)/);
    return match ? match[1] : null;
  }

  // 点击下一个视频按钮
  function clickNext() {
    const nextBtn = document.querySelector('button[aria-label="Next video"]');
    if (nextBtn) {
      console.log(`${N}Next button found, clicking.`);
      nextBtn.click();
    } else {
      console.error(`${N}Next button not found.`);
    }
  }

  // 创建视频处理器（每个视频独立的处理逻辑）
  function createVideoHandler(video, videoId) {
    console.log(`${N}Creating handler for video: ${videoId}`);

    let currentTime = 0;
    let lastTime = 0;
    let intervalId = null;
    let loadCheckIntervalId = null;
    let isActive = true;
    let isPlaying = false;
    let nearEnd = false; // 标记是否接近结束（最后3秒）
    const loadStartTime = Date.now();

    // 载入检测：判断视频是否开始播放
    const checkLoading = () => {
      if (!isActive) return;

      const now = Date.now();
      const duration = video.duration;

      // 检查视频是否有有效的 duration
      if (isNaN(duration) || duration === 0) {
        // 超过 10 秒还没准备好，跳过
        if (now - loadStartTime > 10000) {
          console.log(`${N}[${videoId}] Video not ready after 10s, skipping.`);
          cleanup();
          clickNext();
        }
        return;
      }

      // 检查视频是否在播放（currentTime 有变化）
      const videoCurrentTime = video.currentTime;
      if (videoCurrentTime > lastTime + 0.1) {
        // 视频开始播放了
        console.log(
          `${N}[${videoId}] Video started playing. Duration: ${duration.toFixed(2)}s`,
        );
        isPlaying = true;
        lastTime = videoCurrentTime;

        // 取消载入检测，开始播放监控
        if (loadCheckIntervalId) {
          clearInterval(loadCheckIntervalId);
          loadCheckIntervalId = null;
        }
        startPlaybackMonitor();
        return;
      }

      // 超过 10 秒还没开始播放，跳过
      if (now - loadStartTime > 10000) {
        console.log(`${N}[${videoId}] Video not playing after 10s, skipping.`);
        cleanup();
        clickNext();
      }
    };

    // 播放监控：监控播放进度
    const checkPlayback = () => {
      if (!isActive) return;

      currentTime = video.currentTime;
      const duration = video.duration;

      // 检测是否接近结束（最后3秒）
      if (currentTime >= duration - 3) {
        if (!nearEnd) {
          nearEnd = true;
          console.log(
            `${N}[${videoId}] Near end (${currentTime.toFixed(2)}s / ${duration.toFixed(2)}s)`,
          );
        }
      }

      // 如果已经标记为接近结束，且当前时间又回到开头（小于3秒），说明重播了
      if (nearEnd && currentTime < 3) {
        console.log(
          `${N}[${videoId}] Video restarted after reaching end (${currentTime.toFixed(2)}s), clicking next.`,
        );
        cleanup();
        clickNext();
        return;
      }

      lastTime = currentTime;
    };

    // 启动播放监控
    const startPlaybackMonitor = () => {
      console.log(`${N}[${videoId}] Starting playback monitor`);
      intervalId = setInterval(checkPlayback, 100);
    };

    // 启动载入检测
    const start = () => {
      console.log(`${N}[${videoId}] Starting load check`);
      loadCheckIntervalId = setInterval(checkLoading, 500);
    };

    // 清理资源
    const cleanup = () => {
      if (!isActive) return;

      console.log(`${N}[${videoId}] Cleaning up handler`);
      isActive = false;

      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }

      if (loadCheckIntervalId) {
        clearInterval(loadCheckIntervalId);
        loadCheckIntervalId = null;
      }

      if (currentVideoHandler === handler) {
        currentVideoHandler = null;
      }
    };

    const handler = {
      videoId,
      start,
      cleanup,
      isActive: () => isActive,
    };

    return handler;
  }

  // 处理新视频
  function handleNewVideo(video, videoId) {
    console.log(
      `${N}New video detected: ${videoId}, waiting for transition...`,
    );

    // 清理旧的处理器
    if (currentVideoHandler) {
      console.log(
        `${N}Cleaning up previous handler: ${currentVideoHandler.videoId}`,
      );
      currentVideoHandler.cleanup();
    }

    // 等待 1 秒让动画完成，然后再创建新的处理器
    setTimeout(() => {
      // 再次确认还是同一个视频（避免快速切换导致的问题）
      const currentId = getCurrentVideoId();
      if (currentId !== videoId) {
        console.log(
          `${N}Video changed during transition (${videoId} -> ${currentId}), skipping handler creation.`,
        );
        return;
      }

      console.log(`${N}Handling video: ${videoId}`);
      currentVideoHandler = createVideoHandler(video, videoId);
      currentVideoHandler.start();
    }, 1000);
  }

  // 全局 observer，持续监听视频元素
  const observer = new MutationObserver(() => {
    if (!isShortsPage()) return;

    const video = document.querySelector("#container video[src]");
    const currentVideoId = getCurrentVideoId();

    if (video && currentVideoId && currentVideoId !== lastVideoId) {
      console.log(`${N}Video ID changed: ${lastVideoId} -> ${currentVideoId}`);
      lastVideoId = currentVideoId;
      handleNewVideo(video, currentVideoId);
    }
  });

  // 开始观察
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src"],
  });

  // 初始检查（如果视频已经存在）
  if (isShortsPage()) {
    const video = document.querySelector("#container video[src]");
    const videoId = getCurrentVideoId();
    if (video && videoId) {
      lastVideoId = videoId;
      console.log(`${N}Initial video found. Video ID: ${videoId}`);
      handleNewVideo(video, videoId);
    }
  }

  console.log(`${N}Setup complete. Observer running.`);
})();
