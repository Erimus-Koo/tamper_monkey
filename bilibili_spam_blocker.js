// ==UserScript==
// @name         B站上单播放器 Mongolian Player
// @version      0.1.5
// @description  B站播放器优化。添加了一些 youtube 和 potplayer 的快捷键。修复了多P连播，增加了自动播放记忆位置等功能。
// @author       Erimus
// @namespace    https://greasyfork.org/users/46393
// @icon         https://www.google.com/s2/favicons?sz=64&domain=bilibili.com
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle

// @match        *://www.bilibili.com
// @match        *://www.bilibili.com/?*
// @match        *://t.bilibili.com/*
// @match        *://www.bilibili.com/list/*
// @match        *://www.bilibili.com/video/*
// ==/UserScript==

/* 功能说明
====================
*/

// 在播放器获得焦点时，B站默认有一个快解键F可以切换全屏。
(function () {
  ("use strict");

  // -------------------------------------------------- common - START
  const N = "[🗑] ";
  console.log(`${N}油猴脚本开始`);

  const cfgKey = "bilibili_spam_blocker";
  const defaultConfig = {
    title: `
-------------------- 劣质教程
/终于把.*做成了(动画片|PPT)/
/(?=.*GPT)(?=.*免费)/ //同时包含GPT和免费
/就是.*的神/

-------------------- 奶头乐
/今日份快乐源泉/
/大型纪录片《.*》/
/卧槽.*找到原版/
`,
    author: `
-------------------- 营销号
/.*白帽黑客.*/
/张雪峰/
/MBTI/
`,
    selectedTab: "title",
    maxHour: 5,
    blockDisplay: "fade", //fade|hide
    updateTime: new Date().toISOString(),
  };
  // GM_setValue(cfgKey, JSON.stringify(defaultConfig)); //reset
  const thisConfig = GM_getValue(cfgKey, JSON.stringify(defaultConfig));
  console.debug(`${N}🚨 thisConfig:`, thisConfig);
  let cfgData = JSON.parse(GM_getValue(cfgKey, JSON.stringify(defaultConfig)));
  console.debug(`${N}🚨 cfgData:`, cfgData);

  const ruleOfRule = `规则列表写法
- 一行一条规则
- 支持正则
- 支持注释，' //'后的内容会忽略
- 空行和包含'-----'的行会被忽略`;

  const str2list = (str) => {
    const entries = str
      .split("\n")
      .map((c) => c.split("//")[0].trim())
      .filter((c) => c && !c.includes("-----"))
      .map((c) => {
        // 如果是正则表达式模式，则创建正则表达式
        try {
          return c.startsWith("/") && c.endsWith("/")
            ? new RegExp(c.slice(1, -1), "i")
            : c;
        } catch (error) {
          alert(`SPAM BLOCKER\n\n🚨 ${error}\ncontent:${c}`);
          throw new Error(e);
        }
      });

    // 使用 Set 进行去重
    return Array.from(new Set(entries));
  };
  spamTitleList = str2list(`${cfgData.title}`);
  spamAuthorList = str2list(`${cfgData.author}`);
  console.debug(`${N}🚨 spamTitleList:`, spamTitleList);
  console.debug(`${N}🚨 spamAuthorList:`, spamAuthorList);
  // -------------------------------------------------- common - END

  // -------------------------------------------------- Gist - START
  // Replace with your Gist ID and token
  const gistKey = "bilibili_spam_blocker_gist";
  const defaultGistSetting = { id: "", file: "", token: "" };
  // GM_setValue(gistKey, JSON.stringify(defaultGistSetting)); //reset
  const config = GM_getValue(gistKey, JSON.stringify(defaultGistSetting));
  console.debug(`${N}🚨 config:`, config);
  let gistData = JSON.parse(
    GM_getValue(gistKey, JSON.stringify(defaultGistSetting))
  );
  console.debug(`${N}🚨 gistData:`, gistData);

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
              const _content = _gist.files[gistData.file].content; // Replace with your file name
              const configData = jsyaml.load(_content);
              resolve(configData);
            } else {
              reject(new Error("Error fetching Gist: " + response.statusText));
            }
          },
        });
      });
    } catch (error) {
      console.error("Error fetching Gist:", error);
      throw error;
    }
  };

  const uploadGistContent = async (newConfig) => {
    try {
      const newContent = jsyaml.dump(newConfig);
      console.debug(`🚨 newContent:`, newContent);

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
        });
      });
    } catch (error) {
      console.error("Error updating Gist:", error);
      throw error;
    }
  };

  const syncGist = async () => {
    try {
      const gistCfgData = await fetchGistContent();
      if (!gistCfgData.updateTime) gistCfgData.updateTime = "";
      console.log("📥 Fetch from Gist:", typeof gistCfgData, gistCfgData);
      console.debug(
        `${N}🚨 gist:${gistCfgData.updateTime} local:${cfgData.updateTime}`
      );

      // 本地配置文件较新
      if (gistCfgData.updateTime < cfgData.updateTime) {
        // 判断两边除了updateTime之外其他项是否相同，如果完全相同就什么都不做
        // 去除 updateTime 字段以便比较其他配置内容
        const { updateTime: _, ...localCfgWithoutTime } = cfgData;
        const { updateTime: __, ...gistCfgWithoutTime } = gistCfgData;

        // 比较两个配置（不包括 updateTime）
        const areConfigsIdentical =
          JSON.stringify(localCfgWithoutTime) ===
          JSON.stringify(gistCfgWithoutTime);

        if (!areConfigsIdentical) {
          // 更新配置文件到Gist
          const gistCfgData = { ...cfgData };
          const updateMessage = await uploadGistContent(gistCfgData);
          console.log("👆 Local is newer, Upload to Gist:", updateMessage);
        }
      }

      // Gist文件较新
      else if (gistCfgData.updateTime > cfgData.updateTime) {
        // 更新本地配置文件
        cfgData = { ...gistCfgData };
        console.log("👇 Gist is newer, Update local.");
        GM_setValue(cfgKey, JSON.stringify(cfgData));
      } else {
        console.log("💚 Gist and local have same time.");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };
  (async () => await syncGist())();
  // -------------------------------------------------- Gist - END

  // -------------------------------------------------- 自定义规则 - START
  // 创建样式
  GM_addStyle(`  
#config-modal{display:none;justify-content:center;align-items:center;z-index:999999;}
#config-modal,#config-modal .overlay{position:fixed;top:0;left:0;width:100vw;height:100vh;}
#config-modal .overlay{background:#0006;cursor:pointer;}

#config-modal .dialog {
  font:16px/2 Menlo, Consolas, "Microsoft Yahei", system-ui, -apple-system, monospace;color:#fff;
  width:40em;height:80vh;max-width:80vw;border:1px solid #fff3;
  background:#0006;backdrop-filter:blur(2em);border-radius:2em;
  display:flex;flex-flow:column nowrap; padding:.75em;}
#config-modal *{box-sizing:border-box;}
#config-modal .btn{display:flex; width:100%; padding:0 1em; height:2.5em; border-radius:9em;cursor:pointer;justify-content:center;align-items:center;background:#0009;opacity:.75;}
#config-modal .btn:hover{opacity:1;}
#config-modal input:not([type="radio"]){width:100%;padding:0 1ch;height:2em;font-size:16px;border:none;border-radius:.5em;color:#222;}
#config-modal input[type="radio"]{width:1em;height:1em;}
#config-modal h4{font-size:16px;font-width:600;padding:1em .5em 0;margin:0;}
#config-modal h4:not(:first-child){border-top:1px solid;margin-top:1em;}
#config-modal h4 a{font-size:.8em;color:#f90;font-weight:400;}

.tab-buttons {display:flex; background:#0006;padding:.25em;border-radius:9em;}
#config-modal .tab-buttons .tab.btn {color:#fff9; background:#0000;}
#config-modal .tab-buttons .tab.btn.active {background:#fff3; color:#fff;font-weight:700; box-shadow:0 0 .25em #0003;opacity:1;}

.tab-content {padding:.5em 0;display:none;height:100%;}
.tab-content.active {display:block;}
#config-modal textarea{ width:100%; height:100%; padding:1ch;border-radius:1ch;border:none;background:#0006;color:#fff;line-height:1.5;resize:none;}

.tab-content.setting>div{display:grid;grid-template-columns:repeat(4,1fr);align-items:center;gap:1em .5em;padding:.5em;}
.text-right{text-align:right;}
.tab-content .span2{grid-column:span 2;}
.tab-content .span3{grid-column:span 3;}
#use-gist-config{grid-column: 2 / 5;}
#config-modal #cancel{width:auto;margin-right:.5em;flex:none;}
#config-modal #submit{background:#06fc;color:#fff;}

#modal-switch{
padding:.5em 1em;position:fixed;left:.5em;bottom:.5em;background:red;color:white;border-radius:9em;z-index:999998;opacity:0;transform:translateX(-80%);cursor:pointer;transition:all .5s;}
#modal-switch:hover{opacity:1;transform:translateX(0);}
    `);

  // 创建模态框
  const modalHTML = `
<div id="config-modal">
  <div class="overlay" title="保存并关闭设置窗口"></div>
  <div class="dialog">
    <div class="tab-buttons">
      <a class="tab btn title">屏蔽标题</a>
      <a class="tab btn author">屏蔽作者</a>
      <a class="tab btn setting">其他设置</a>
    </div>
    <div class="tab-content title active">
      <textarea id="title-rules" placeholder="${ruleOfRule}"></textarea>
    </div>
    <div class="tab-content author">
      <textarea id="author-rules" placeholder="${ruleOfRule}"></textarea>
    </div>
    <div class="tab-content setting">
      <h4>🚫 屏蔽设置</h4>
      <div>
        <label for="max-hour">屏蔽长于</label>
        <input type="number" id="max-hour" name="max-hour" min="0" placeholder="输入小时数" value="${cfgData.maxHour}">
        <span class="span2"> 小时的视频</span>
        <span>屏蔽方式</span>
        <div class="span3">
        <input type="radio" id="fade" name="block-display" value="fade">
        <label for="fade">淡出</label>
        <input type="radio" id="hide" name="block-display" value="hide">
        <label for="hide">隐藏</label>
        </div>
      </div>
      <h4>💾 Gist 同步保存数据 <a href="https://gist.github.com/Erimus-Koo/98b7f23cb4c2df504d1303f9895a2ec4" target="_blank">使用说明</a></h4>
      <div>
        <label for="gist-id">gistId</label>
        <input id="gist-id" class="span3" name="gist-id" placeholder="32位字符" value="${gistData.id}">
        <label for="gist-file">gistFile</label>
        <input id="gist-file" class="span3" name="gist-file" placeholder="XXX.yaml" value="${gistData.file}">
        <label for="gist-token">gistToken</label>
        <input id="gist-token" class="span3" name="gist-token" placeholder="ghp_\\w{36}" value="${gistData.token}">
      <div id="use-gist-config" class="btn">使用 Gist 覆盖本地设置</div>
      </div>
      <h4>💀 重置所有设置</h4>
      <div>
        <input id="reset-confirm" class="span3" name="reset-config" placeholder="输入【RESET CONFIG】然后重置">
        <div id="reset" class="btn">重置设置</div>
      </div>
    </div>
    <div style="display:flex;">
      <a id="cancel" class="btn">放弃修改</a>
      <a id="submit" class="btn">保存</a>
    </div>
  </div>
</div>
    `;
  document.body.insertAdjacentHTML("beforeend", modalHTML);
  const modalBtnHTML = `<a id="modal-switch">编辑黑名单</a>`;
  document.body.insertAdjacentHTML("beforeend", modalBtnHTML);

  // 初始化输入框
  const modal = document.getElementById("config-modal");

  // 选项卡切换
  modal.querySelectorAll(".tab.btn").forEach((btn) => {
    btn.onclick = (e) => {
      modal
        .querySelectorAll(".tab.btn,.tab-content")
        .forEach((e) => e.classList.remove("active"));
      // 过滤掉 'tab.btn' 类名，获取其他类名
      const name = Array.from(e.target.classList).find(
        (className) => !["tab", "btn"].includes(className)
      );
      // console.debug(`${N}🚨 name:`, name);
      cfgData.selectedTab = name;
      GM_setValue(cfgKey, JSON.stringify(cfgData));
      modal
        .querySelectorAll(`.${name}`)
        .forEach((ele) => ele.classList.add("active"));
    };
  });

  // 将ls的值写入配置面板
  const cfgData2modal = (recoveryTab = false) => {
    // 打开上次的tab
    if (recoveryTab)
      modal.querySelector(`.tab.btn.${cfgData.selectedTab}`).click();

    // 恢复之前保存的值
    modal.querySelector("#title-rules").textContent = cfgData.title;
    modal.querySelector("#author-rules").textContent = cfgData.author;
    modal.querySelector("#max-hour").value = cfgData.maxHour;
    modal.querySelectorAll('input[name="block-display"]').forEach((radio) => {
      if (radio.value === cfgData.blockDisplay) {
        radio.checked = true;
      }
    });
  };

  // 打开面板
  const openConfigModal = (e) => {
    modal.style.display = "flex";
    cfgData2modal(true);
  };

  // 保存表格内填写的gist配置
  const saveGistConfig = () => {
    gistData.id = modal.querySelector("#gist-id").value || "";
    gistData.file = modal.querySelector("#gist-file").value || "";
    gistData.token = modal.querySelector("#gist-token").value || "";
    GM_setValue(gistKey, JSON.stringify(gistData));
  };

  // 提交数据
  const saveAndCloseModal = async (e) => {
    saveGistConfig(); //提交Gist配置

    const newTitleRule = modal.querySelector("#title-rules").value;
    const newAuthorRule = modal.querySelector("#author-rules").value;
    cfgData.maxHour = modal.querySelector("#max-hour").value;
    cfgData.blockDisplay = modal.querySelector(
      'input[name="block-display"]:checked'
    ).value;

    try {
      spamTitleList = str2list(`${newTitleRule}`);
      spamAuthorList = str2list(`${newAuthorRule}`);
      cfgData.title = newTitleRule;
      cfgData.author = newAuthorRule;
      cfgData.updateTime = new Date().toISOString(); //更新时间
      GM_setValue(cfgKey, JSON.stringify(cfgData)); //save to local

      modal.style.display = "none"; //关闭模态框

      await syncGist(); //上传同步
    } catch (err) {
      console.debug(`${N}🚨 err:`, err);
    }
  };

  const closeWithoutSave = (e) => {
    console.log(`${N}Close wo/ save:`, e);
    if (modal.style.display != "none") {
      modal.style.display = "none";
      e.stopPropagation();
    }
  };

  const useGistConfig = () => {
    // 保存gist配置
    saveGistConfig();

    // 获取gist配置文件并写入本地
    fetchGistContent((err, gistConfig) => {
      if (err) {
        console.debug(`${N}🚨 err:`, err);
        alert("Gist 配置文件获取失败，请检查配置或阅读使用说明。");
      } else {
        console.log(`${N}gistConfig:`, typeof gistConfig, gistConfig); // Do something with the fetched content
        // 尝试解析配置文件，确保配置可用
        try {
          spamTitleList = str2list(`${gistConfig.title}`);
          spamAuthorList = str2list(`${gistConfig.author}`);
        } catch (err) {}
        // 替换本地配置并保存
        cfgData = gistConfig;
        GM_setValue(cfgKey, JSON.stringify(cfgData));
        console.debug(`${N}🚨 GM_getValue(cfgKey):`, GM_getValue(cfgKey));

        cfgData2modal(false); //将读取到的值写入面板 但不改变tab
      }
    });
  };

  const resetConfig = () => {
    if (modal.querySelector("#reset-confirm").value == "RESET CONFIG") {
      GM_setValue(cfgKey, JSON.stringify(defaultConfig)); //reset
      cfgData = JSON.parse(GM_getValue(cfgKey));
      cfgData2modal(false);
      console.debug(`${N}🚨 cfgData:`, GM_getValue(cfgKey));
      alert(`配置已重置`);
    } else {
      alert(`输入 [RESET CONFIG] 然后点重置（不含括号）`);
    }
  };

  // 给按钮绑定动作
  modal.querySelector("#use-gist-config").onclick = useGistConfig;
  modal.querySelector("#reset").onclick = resetConfig;
  modal.querySelector(".overlay").onclick = saveAndCloseModal;
  modal.querySelector("#cancel").onclick = closeWithoutSave;
  modal.querySelector("#submit").onclick = saveAndCloseModal;
  document.querySelector("#modal-switch").onclick = openConfigModal;

  // 注册菜单命令
  GM_registerMenuCommand("设置标题和作者规则", openConfigModal);

  // 测试用
  if (
    document.URL.includes("bilibili.com/?") ||
    document.URL.includes("t.bilibili")
  ) {
    // openConfigModal();
  }
  // -------------------------------------------------- 自定义规则 - END

  // -------------------------------------------------- Observer - START
  // 观察对象，等待其出现后，运行函数
  function observe_and_run(
    selector,
    runAfterElementFound,
    kwargs = {},
    autoDisconnect = false
  ) {
    const handledElements = new Set();

    // 创建一个观察器实例
    const observer = new MutationObserver((mutationsList, observer) => {
      mutationsList.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            // 确保是元素节点
            if (node.matches(selector)) {
              // console.debug(`${N}🚨 node:`, node);
              processElement(node, observer);
            }
            // 也检查子元素
            node.querySelectorAll(selector).forEach((target) => {
              // console.debug(`${N}🚨 target:`, target);
              processElement(target, observer);
            });
          }
        });
      });
    });

    function processElement(target, observer) {
      if (!handledElements.has(target)) {
        handledElements.add(target);
        runAfterElementFound(target, kwargs);
        if (autoDisconnect) {
          observer.disconnect();
        }
      }
    }

    // 开始观察document，观察子节点和后代节点的添加或者删除
    const config = { childList: true, attributes: true, subtree: true };
    observer.observe(document.body, config);
  }
  // -------------------------------------------------- Observer - END

  // -------------------------------------------------- 屏蔽 - START
  const isSpam = (title, author, duration = "") => {
    for (let rule of spamTitleList) {
      if (
        (rule instanceof RegExp && rule.test(title)) || // 正则匹配
        (typeof rule === "string" && title.includes(rule)) // 字符串匹配
      )
        return true;
    }

    for (let rule of spamAuthorList) {
      if (
        (rule instanceof RegExp && rule.test(author)) || // 正则匹配
        (typeof rule === "string" && author.includes(rule)) // 字符串匹配
      )
        return true;
    }

    // 时长大于N小时;
    if (
      duration &&
      duration.length >= 8 &&
      parseInt(duration.split(":")[0]) > parseInt(cfgData.maxHour)
    )
      return true;
  };

  const addSpamAttr = (
    ele, //observer 找到的对象
    kwargs //kwargs 输入选择器{title,author,duration}
  ) => {
    // console.debug(`${N}🚨 ele:`, ele);
    // console.debug(`${N}🚨 kwargs:`, kwargs);
    const title = ele
      ?.querySelector(kwargs.title)
      ?.textContent.replaceAll(" ", "");
    const author = ele?.querySelector(kwargs.author)?.textContent;
    const duration = kwargs.duration
      ? ele?.querySelector(kwargs.duration)?.textContent
      : "";
    console.debug(`${N}${title} | ${author} | ${duration}`);
    if (title && author && isSpam(title, author, duration)) {
      console.debug(`${N}🚨SPAM🚨 ${title} | ${author} | ${duration}`);

      // 添加屏蔽标记（根据标记决定屏蔽方式）
      ele.setAttribute("block-display", cfgData.blockDisplay);
    }
  };

  GM_addStyle(`
*[block-display="fade"]{opacity:.25;transform:scale(.9);}
*[block-display="hide"]{display:none;}
`);
  // -------------------------------------------------- 屏蔽 - END

  // -------------------------------------------------- shortcut - START
  let keyPressed = {}; //按下的所有键 目的是为了区分 1 和 ctrl+1 这种情况

  const toggleConfigModal = (e) => {
    getComputedStyle(document.querySelector("#config-modal")).display == "none"
      ? openConfigModal(e)
      : saveAndCloseModal(e);
    e.stopPropagation();
  };
  let keyActions = {
    // 变速（x留给vimium关闭网页）
    "Control,b": toggleConfigModal,
    "Control,q": saveAndCloseModal,
    Escape: saveAndCloseModal,
  };

  const pressKeyDown = function (e) {
    // console.debug(`${N}keyDown e:`, e);
    keyPressed[e.key] = true;
    // console.debug(`${N}keyDown keyPressed:`, keyPressed);
    const keys = Object.keys(keyPressed).sort().toString();
    console.debug(`${N}keyDown keys:`, keys); //如果多按键会变成"a,b"

    // 如果光标在输入框里，快捷键不生效（在modal里始终生效）
    const configModal = document.querySelector("#config-modal");
    if (
      !e.target.closest("#config-modal") &&
      (e.target.tagName === "TEXTAREA" ||
        (e.target.tagName === "INPUT" &&
          ["text", "password", "url", "search", "tel", "email"].includes(
            e.target.type
          )))
    ) {
      return;
    }

    // 设置快捷键
    if (keys in keyActions) {
      keyActions[keys](e);
    }
  };

  const pressKeyUp = function (e) {
    // console.debug(`${N}keyUp e:`, e);
    delete keyPressed[e.key];
    // console.debug(`${N}keyUp keyPressed:`, keyPressed);
  };

  window.onfocus = function () {
    // 当窗口获得焦点时
    // console.debug(`${N}Ctrl+数字切出tab页不会清空按键，所以重新进入时清空一下。`);
    keyPressed = {}; // 清空
  };
  // -------------------------------------------------- shortcut - END

  // -------------------------------------------------- init - START
  // 初始化动作（以前B站跳转油猴不会重载，所以抽象，现在似乎已无必要）
  const init = function () {
    // ------------------------------ 获取各个页面视频封面 - START
    const url = document.URL;
    console.debug(`${N}🚨 url:`, url);
    let vList = [];
    if (url.includes("bilibili.com/video")) {
      // 播放页
      vList = vList.concat({
        ele: ".video-page-card-small",
        title: ".title",
        author: ".name",
        duration: ".duration",
      });
    } else if (url.includes("bilibili.com/list/watchlater")) {
      // 稍后再看播放页
      vList = vList.concat({
        ele: ".recommend-video-card",
        title: ".title",
        author: ".name",
        duration: ".duration",
      });
    } else if (url.match(/www\.bilibili\.com\/?($|\?)/)) {
      // 首页
      vList = vList.concat({
        ele: ".bili-video-card,.feed-card",
        title: ".bili-video-card__info--tit",
        author: ".bili-video-card__info--author",
        duration: ".bili-video-card__stats__duration",
      });
    }
    console.debug(`${N}🚨 vList:`, vList);

    for (let v of vList) {
      console.debug(`${N}🚨 observe:`, v.ele, addSpamAttr, v, false);
      // 初始运行一次 处理页面上已有对象
      document.querySelectorAll(v.ele).forEach((e) => addSpamAttr(e, v));
      // 观察后续出现的对象
      observe_and_run(v.ele, addSpamAttr, v, false);
    }

    // 添加快捷键监听
    document.addEventListener("keydown", pressKeyDown);
    document.addEventListener("keyup", pressKeyUp);
    // ------------------------------ 获取各个页面视频封面 - END
  };
  init();
  // -------------------------------------------------- init - END
})();
