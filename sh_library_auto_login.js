// ==UserScript==
// @name         自动登陆上图 shlib auto login
// @namespace    https://greasyfork.org/users/46393
// @version      1.1
// @description  上图登陆太TM频繁了 烦死了
// @author       Erimus
// @icon         https://www.google.com/s2/favicons?sz=64&domain=library.sh.cn
// @match        https://passport.library.sh.cn/oauth/authorize*

// @grant        GM.setValue
// @grant        GM.getValue
// @grant        GM.registerMenuCommand
// ==/UserScript==

(function () {
  "use strict";

  // 使用油猴菜单保存账号/密码
  GM.registerMenuCommand("设置用户名", async () => {
    const username = prompt("请输入用户名：");
    if (username) {
      await GM.setValue("username", username);
      alert("用户名已保存！");
    }
  });

  GM.registerMenuCommand("设置密码", async () => {
    const password = prompt("请输入密码：");
    if (password) {
      await GM.setValue("password", password);
      alert("密码已保存！");
    }
  });

  // 自动填写表单
  (async function autoFill() {
    console.log("[AutoLogin] 脚本初始化中...");

    // 获取用户存储的用户名和密码
    const savedUsername = await GM.getValue("username", "");
    const savedPassword = await GM.getValue("password", "");

    if (!savedUsername || !savedPassword) {
      console.warn("[AutoLogin] 未设置用户名或密码，请通过油猴菜单设置。");
    }

    let filledCredentials = false;

    // 使用全局轮询：处理动态加载、强制勾选、等待验证码、自动登录
    const pollInterval = setInterval(() => {
      // 1. 获取核心元素
      const usernameField = document.querySelector("#username");
      const passwordField = document.querySelector("#password");
      const loginButton = document.querySelector("#login");

      // 如果连输入框都还没出现，直接跳过本次检查
      if (!usernameField || !passwordField) {
        // console.debug("[AutoLogin] 等待输入框出现...");
        return;
      }

      // 2. 填写账号密码（只填一次）
      if (!filledCredentials) {
        if (savedUsername && usernameField.value !== savedUsername) {
          usernameField.value = savedUsername;
          console.log("[AutoLogin] 已填写用户名");
        }
        if (savedPassword && passwordField.value !== savedPassword) {
          passwordField.value = savedPassword;
          console.log("[AutoLogin] 已填写密码");
        }
        filledCredentials = true;
      }

      // 3. 处理隐私协议勾选框
      // 这里的选择器包含了 ID 和通用的 class 选择器
      const checkboxes = document.querySelectorAll(
        "#agreement-username-login, #agreement-mobile-login, .privacyPolicy input[type='checkbox']",
      );

      let privacyChecked = false;
      checkboxes.forEach((cb) => {
        // 只处理可见的
        if (cb.offsetParent !== null) {
          if (!cb.checked) {
            console.log("[AutoLogin] 检测到可见的隐私协议未勾选，尝试操作...");
            cb.checked = true; // 强制设为 true
            cb.click(); // 模拟点击
            // 如果是在 label 里的，尝试点击 label
            cb.parentElement?.click();
          }
          if (cb.checked) {
            privacyChecked = true;
          }
        }
      });

      // 4. 处理验证码
      const captchaFields = document.querySelectorAll(
        "#captcha, #inputCaptcha",
      );
      let visibleCaptchaField = null;
      for (const field of captchaFields) {
        if (field.offsetParent !== null) {
          visibleCaptchaField = field;
          break;
        }
      }

      const captchaValue = visibleCaptchaField
        ? visibleCaptchaField.value.trim()
        : "";
      const captchaFilled = captchaValue.length >= 4;

      // 日志（由于是轮询，只在状态变化或满足条件时打印关键日志）
      if (privacyChecked && captchaFilled && savedUsername && savedPassword) {
        console.log(
          "[AutoLogin] 条件满足：协议已勾选，验证码已填入。准备登录！",
        );

        // 【重要】在点击登录前，必须重新填写一遍原始密码！
        // 原因：上图登录系统有个奇葩设计 - 如果登录失败，密码框里的明文密码会被替换成MD5值
        // 如果不重新填写原始密码，下次登录时会对MD5值再次进行MD5编码，导致密码错误
        // 这个设计简直离谱，但我们只能适配这种反人类的逻辑
        if (passwordField && savedPassword) {
          passwordField.value = savedPassword;
          console.log(
            "[AutoLogin] 重新填写原始密码，防止MD5二次编码的离谱问题",
          );
        }

        clearInterval(pollInterval);
        loginButton?.click();
      } else if (privacyChecked && !captchaFilled) {
        // console.debug("[AutoLogin] 等待验证码填入...");
      }
    }, 500);

    // 60秒后停止轮询，防止后台消耗
    setTimeout(() => {
      clearInterval(pollInterval);
      console.log("[AutoLogin] 轮询超过 60 秒，已停止。");
    }, 60000);

    // 初始聚焦：如果验证码为空，聚焦到验证码
    setTimeout(() => {
      const captchaFields = document.querySelectorAll(
        "#captcha, #inputCaptcha",
      );
      for (const field of captchaFields) {
        if (field.offsetParent !== null && field.value === "") {
          field.focus();
          break;
        }
      }
    }, 1500);
  })();
})();
