// ==UserScript==
// @name         Github Models - Auto Set System Prompt with Templates
// @version      0.6.0
// @description  自动记忆并填写系统提示词，并支持模板管理、快捷键和重命名
// @author       Erimus
// @namespace    https://greasyfork.org/users/46393
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @grant        GM_addStyle

// @match        https://github.com/marketplace/models/*/playground
// ==/UserScript==

(function () {
  ("use strict");

  const N = "[🧩] ";
  console.log(`${N}油猴脚本开始`);

  const TEMPLATES_KEY = "prompt-templates";
  const LAST_TEMPLATE_KEY = "last-used-template";
  const DEFAULT_PROMPT = "你是一个智能助手";

  /**
   * 获取保存的模板列表。
   */
  function getTemplates() {
    return JSON.parse(localStorage.getItem(TEMPLATES_KEY)) || [];
  }

  /**
   * 保存模板列表到 localStorage。
   * @param {array} templates - 模板列表数组。
   */
  function saveTemplates(templates) {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
    console.log(`${N}模板已保存:`, templates);
  }

  /**
   * 获取最后一次使用的模板索引。
   */
  function getLastUsedTemplateIndex() {
    return parseInt(localStorage.getItem(LAST_TEMPLATE_KEY) || "0", 10);
  }

  /**
   * 保存最后一次使用的模板索引。
   * @param {number} index - 模板的索引。
   */
  function saveLastUsedTemplateIndex(index) {
    localStorage.setItem(LAST_TEMPLATE_KEY, index.toString());
    console.log(`${N}最后使用的模板索引已保存:`, index);
  }

  /**
   * 更新文本框内容，同时触发 input 事件。
   * @param {HTMLElement} textarea - 文本框元素。
   * @param {string} value - 要设置的值。
   */
  function updateTextAreaValue(textarea, value) {
    Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(textarea),
      "value"
    ).set.call(textarea, value);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  /**
   * 初始化脚本功能。
   */
  function init() {
    console.log(`${N}初始化脚本...`);

    const observer = new MutationObserver(() => {
      const textarea = document.querySelector('textarea[name="systemPrompt"]');

      if (textarea) {
        console.log(`${N}找到文本框与按钮，初始化功能...`);
        observer.disconnect();

        const templates = getTemplates();
        const lastTemplateIndex = getLastUsedTemplateIndex();

        // 在脚本加载时设置上次选择的模板
        setTimeout(() => {
          if (templates[lastTemplateIndex]) {
            updateTextAreaValue(textarea, templates[lastTemplateIndex].value);
          }
        }, 1000);

        // 添加模板管理下拉菜单
        addTemplateDropdown(textarea);

        // 实时保存用户对当前模板内容的修改
        textarea.addEventListener("input", () => {
          const dropdown = document.querySelector("#template-dropdown");
          const selectedValue = parseInt(dropdown.value, 10);

          if (!isNaN(selectedValue)) {
            const templates = getTemplates();
            templates[selectedValue].value = textarea.value; // 更新模板内容
            saveTemplates(templates);
            console.log(`${N}模板内容已更新:`, templates[selectedValue]);
          }
        });

        // 监听快捷键事件
        addHotkeysEventListener(textarea);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  /**
   * 创建模板管理下拉菜单。
   */
  function addTemplateDropdown(textarea) {
    const templates = getTemplates();
    const lastTemplateIndex = getLastUsedTemplateIndex();

    const container = document.createElement("div");
    container.id = "template-container";
    container.style.marginBottom = "10px";

    const dropdown = document.createElement("select");
    dropdown.id = "template-dropdown";

    templates.forEach((template, index) => {
      const option = document.createElement("option");
      option.value = index.toString();
      option.textContent = template.name || `Template ${index + 1}`;
      dropdown.appendChild(option);
    });

    dropdown.value = lastTemplateIndex.toString();

    const addButton = document.createElement("button");
    addButton.textContent = "+ Add";
    addButton.style.marginLeft = "10px";
    addButton.style.cursor = "pointer";

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "× Del";
    deleteButton.style.marginLeft = "10px";
    deleteButton.style.cursor = "pointer";

    const renameButton = document.createElement("button");
    renameButton.textContent = "✎ Ren";
    renameButton.style.marginLeft = "10px";
    renameButton.style.cursor = "pointer";

    container.appendChild(dropdown);
    container.appendChild(addButton);
    container.appendChild(deleteButton);
    container.appendChild(renameButton);
    textarea.parentElement.parentElement.appendChild(container);

    dropdown.addEventListener("change", () => {
      const templates = getTemplates();
      const selectedValue = parseInt(dropdown.value, 10);

      if (!isNaN(selectedValue)) {
        updateTextAreaValue(textarea, templates[selectedValue].value);
        saveLastUsedTemplateIndex(selectedValue);
      }
    });

    addButton.addEventListener("click", () => {
      const newTemplateName = prompt(
        "请输入模板名称：",
        `Template ${templates.length + 1}`
      );
      const newTemplateContent = prompt("请输入新的模板内容：", DEFAULT_PROMPT);
      if (newTemplateName && newTemplateContent) {
        const templates = getTemplates();
        templates.push({ name: newTemplateName, value: newTemplateContent });
        saveTemplates(templates);

        const newOption = document.createElement("option");
        newOption.value = (templates.length - 1).toString();
        newOption.textContent = newTemplateName;
        dropdown.appendChild(newOption);
      }
    });

    deleteButton.addEventListener("click", () => {
      const selectedValue = parseInt(dropdown.value, 10);

      if (!isNaN(selectedValue)) {
        const confirmDelete = confirm("确定要删除当前选中的模板吗？");
        if (confirmDelete) {
          const templates = getTemplates();
          templates.splice(selectedValue, 1);
          saveTemplates(templates);

          while (dropdown.firstChild) dropdown.removeChild(dropdown.firstChild);

          templates.forEach((template, index) => {
            const option = document.createElement("option");
            option.value = index.toString();
            option.textContent = template.name || `Template ${index + 1}`;
            dropdown.appendChild(option);
          });

          if (templates[0]) {
            dropdown.value = "0";
            saveLastUsedTemplateIndex(0);
            updateTextAreaValue(textarea, templates[0].value);
          } else {
            updateTextAreaValue(textarea, "");
          }
        }
      }
    });

    renameButton.addEventListener("click", () => {
      const selectedValue = parseInt(dropdown.value, 10);

      if (!isNaN(selectedValue)) {
        const templates = getTemplates();
        const newName = prompt(
          "请输入新的模板名称：",
          templates[selectedValue].name || `Template ${selectedValue + 1}`
        );

        if (newName) {
          templates[selectedValue].name = newName;
          saveTemplates(templates);
          dropdown.options[selectedValue].textContent = newName;
        }
      }
    });
  }

  /**
   * 监听快捷键事件，为模板添加快捷键功能。
   */
  function addHotkeysEventListener(textarea) {
    document.addEventListener("keydown", (e) => {
      // 监听 Ctrl + Alt + 数字 的快捷键
      if (e.ctrlKey && e.altKey && /^[1-9]$/.test(e.key)) {
        const key = e.key;
        const templates = getTemplates();
        const index = parseInt(key, 10) - 1;

        // 阻止默认行为和传播
        e.preventDefault();
        e.stopImmediatePropagation();

        if (templates[index]) {
          const dropdown = document.querySelector("#template-dropdown");
          dropdown.value = index.toString();
          const template = templates[index];
          updateTextAreaValue(textarea, template.value);
          saveLastUsedTemplateIndex(index);

          console.log(`${N}快捷键: 已切换到模板 ${index + 1}`);
        }
      }
    });
  }

  // 添加自定义样式
  GM_addStyle(`
    #template-container {
      display: flex;
      justify-content: space-between;
      width: 100%;
      margin-top: .5rem;
    }
    #template-dropdown, #template-container button {
      height: 2rem;
      border-radius: 6px;
      border: 1px solid #d1d9e0;
      background: #fff;
      padding: 0 .5rem;
    }
    #template-dropdown {
      flex: 1;
      width: 100%;
    }
    #template-container button {
      flex: none;
      margin-left: 0.25rem;
      transition: border-color 1s ease-in-out;
    }
    #template-container button:hover{
      border-color: #06f;
      transition: border-color .2s ease-in-out;
    }
  `);

  init();
})();
