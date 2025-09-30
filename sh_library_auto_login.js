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
    // 获取用户存储的用户名和密码
    const savedUsername = await GM.getValue("username", "");
    const savedPassword = await GM.getValue("password", "");

    // 检查页面的表单元素是否存在
    const usernameField = document.querySelector("#username"); // 用户名输入框选择器
    const passwordField = document.querySelector("#password"); // 密码输入框选择器
    const captchaField = document.querySelector("#inputCaptcha"); // 验证码输入框选择器
    const privacyCheckbox = document.querySelector(
      "#rememberMe-secret-username"
    ); // 隐私协议勾选框选择器

    if (usernameField && passwordField && captchaField) {
      // 填充用户名和密码
      if (savedUsername) usernameField.value = savedUsername;
      if (savedPassword) passwordField.value = savedPassword;

      // 自动勾选“隐私协议”
      if (privacyCheckbox && !privacyCheckbox.checked) {
        privacyCheckbox.click();
      }

      // 聚焦验证码输入框
      captchaField.focus();
    }
  })();
})();
