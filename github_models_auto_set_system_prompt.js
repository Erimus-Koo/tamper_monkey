// ==UserScript==
// @name         Github Models - Auto Set System Prompt with Templates
// @version      0.6.1
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

  // Heroicons
  // https://heroicons.com/
  const SVG_ICONS = {
    add: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"> <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /> </svg> `,
    delete: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"> <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /> </svg>`,
    rename: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"> <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /> </svg> `,
    moveUp: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"> <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" /> </svg>`,
    moveDown: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"> <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" /> </svg>`,
  };

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
   * 创建模板管理下拉菜单和按钮。
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

    // 创建按钮
    const addButton = createIconButton(SVG_ICONS.add, "添加模板");
    console.log("🚀 ~ addTemplateDropdown ~ 'SVG_ICONS.add':", SVG_ICONS.add);
    const deleteButton = createIconButton(SVG_ICONS.delete, "删除模板");
    const renameButton = createIconButton(SVG_ICONS.rename, "重命名模板");
    const moveUpButton = createIconButton(SVG_ICONS.moveUp, "上移模板");
    const moveDownButton = createIconButton(SVG_ICONS.moveDown, "下移模板");

    // 将元素添加到容器
    container.appendChild(dropdown);
    container.appendChild(moveUpButton);
    container.appendChild(moveDownButton);
    container.appendChild(renameButton);
    container.appendChild(addButton);
    container.appendChild(deleteButton);
    textarea.parentElement.parentElement.appendChild(container);

    // 下拉菜单切换事件
    dropdown.addEventListener("change", () => {
      const templates = getTemplates();
      const selectedValue = parseInt(dropdown.value, 10);

      if (!isNaN(selectedValue)) {
        updateTextAreaValue(textarea, templates[selectedValue].value);
        saveLastUsedTemplateIndex(selectedValue);
      }
    });

    // 按钮事件监听
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

    moveUpButton.addEventListener("click", () => {
      const selectedValue = parseInt(dropdown.value, 10);

      if (!isNaN(selectedValue) && selectedValue > 0) {
        const templates = getTemplates();
        const temp = templates[selectedValue];
        templates[selectedValue] = templates[selectedValue - 1];
        templates[selectedValue - 1] = temp;
        saveTemplates(templates);

        dropdown.options[selectedValue].textContent =
          templates[selectedValue].name;
        dropdown.options[selectedValue - 1].textContent =
          templates[selectedValue - 1].name;

        dropdown.value = (selectedValue - 1).toString();
        updateTextAreaValue(textarea, templates[selectedValue - 1].value);
        saveLastUsedTemplateIndex(selectedValue - 1);
      }
    });

    moveDownButton.addEventListener("click", () => {
      const selectedValue = parseInt(dropdown.value, 10);

      if (!isNaN(selectedValue) && selectedValue < templates.length - 1) {
        const templates = getTemplates();
        const temp = templates[selectedValue];
        templates[selectedValue] = templates[selectedValue + 1];
        templates[selectedValue + 1] = temp;
        saveTemplates(templates);

        dropdown.options[selectedValue].textContent =
          templates[selectedValue].name;
        dropdown.options[selectedValue + 1].textContent =
          templates[selectedValue + 1].name;

        dropdown.value = (selectedValue + 1).toString();
        updateTextAreaValue(textarea, templates[selectedValue + 1].value);
        saveLastUsedTemplateIndex(selectedValue + 1);
      }
    });
  }

  /**
   * 创建按钮，带有图标和 hover 提示文字。
   */
  function createIconButton(icon, title) {
    const button = document.createElement("button");
    button.innerHTML = icon;
    button.title = title;
    button.style.width = "2rem";
    button.style.height = "2rem";
    button.style.textAlign = "center";
    button.style.lineHeight = "2rem";
    button.style.borderRadius = "6px";
    button.style.border = "1px solid #d1d9e0";
    button.style.background = "#fff";
    button.style.padding = "0";
    button.style.cursor = "pointer";
    button.style.transition = "border-color .2s ease-in-out";
    button.addEventListener("mouseover", () => {
      button.style.borderColor = "#06f";
    });
    button.addEventListener("mouseout", () => {
      button.style.borderColor = "#d1d9e0";
    });

    return button;
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
      display: flex;
      justify-content: center;
      align-items: center;
      width: 2rem;
      height: 2rem;
      text-align: center;
      padding: 0;
      margin-left: 0.25rem;
      transition: border-color .2s ease-in-out;
    }
    #template-container button svg {
      width: 1.25rem;
      height: 1.25rem;
    }
    #template-container button:hover {
      border-color: #06f;
    }
    #template-container button:hover svg path { 
      stroke: #06f; 
    }
  `);

  init();
})();
