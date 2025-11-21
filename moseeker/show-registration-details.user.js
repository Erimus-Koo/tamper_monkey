// ==UserScript==
// @name         MoSeeker 活动报名详情同步
// @namespace    http://tampermonkey.net/
// @version      1.0.1
// @description  自动获取并显示 MoSeeker 活动报名者的详细信息（公司、职位）
// @author       Erimus
// @match        https://hr.moseeker.com/v3/activity/*/signup*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
  "use strict";

  console.log("[MoSeeker Details Sync] 脚本加载");

  // ==================== 工具函数 ====================

  /**
   * 延迟函数
   */
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 从 URL 提取 event_id
   */
  function getEventId() {
    const match = window.location.pathname.match(/\/activity\/(\d+)\//);
    return match ? match[1] : null;
  }

  // ==================== 数据获取层 ====================

  /**
   * 获取报名列表
   */
  async function getRegistrationList(eventId, pageNum = 1, pageSize = 100) {
    const url = `https://hr.moseeker.com/api/moats/careerstory/v4/activity/registration/users?interfaceid=A11031001&appid=A11031&activityId=${eventId}&pageNum=${pageNum}&pageSize=${pageSize}`;

    try {
      const response = await fetch(url, {
        headers: {
          "Accept-Language": "zh-CN",
        },
      });

      const data = await response.json();

      if (data.message !== "success") {
        console.error("[API] 获取报名列表失败:", data);
        return { success: false, error: data };
      }

      return {
        success: true,
        total: data.data.total,
        page: data.data.page,
        pageSize: data.data.pageSize,
        reachEnd: data.data.page * data.data.pageSize >= data.data.total,
        list: data.data.data,
      };
    } catch (error) {
      console.error("[API] 请求失败:", error);
      return { success: false, error };
    }
  }

  /**
   * 提取自定义字段
   */
  function extractCustomFields(formData) {
    const result = {};

    console.log("[Extract] 开始提取自定义字段");
    console.log("[Extract] formData 结构:", JSON.stringify(formData, null, 2));

    // 遍历所有分组
    formData.forEach((group) => {
      console.log(`[Extract] 处理分组: ${group.name}`);

      // 查找"势能大会参会信息"分组
      if (group.name === "势能大会参会信息") {
        console.log("[Extract] ✅ 找到目标分组");

        // field_data 是 [[{field1}, {field2}]] 这样的结构
        if (group.field_data && Array.isArray(group.field_data)) {
          console.log("[Extract] field_data:", group.field_data);

          // 第一层遍历
          group.field_data.forEach((fieldArray, i) => {
            console.log(`[Extract] field_data[${i}]:`, fieldArray);

            if (Array.isArray(fieldArray)) {
              // 第二层就是字段对象数组了
              fieldArray.forEach((field, j) => {
                console.log(`[Extract] field_data[${i}][${j}]:`, field);
                console.log(
                  `[Extract] 字段: ${field.field_title} = ${JSON.stringify(
                    field.value_names
                  )}`
                );

                if (
                  field.field_title === "公司" &&
                  field.value_names &&
                  field.value_names.length > 0
                ) {
                  result.company = field.value_names[0];
                  console.log("[Extract] ✅ 提取到公司:", result.company);
                } else if (
                  field.field_title === "职位" &&
                  field.value_names &&
                  field.value_names.length > 0
                ) {
                  result.position = field.value_names[0];
                  console.log("[Extract] ✅ 提取到职位:", result.position);
                }
              });
            }
          });
        }
      }
    });

    // 如果没找到，尝试遍历所有分组查找
    if (!result.company && !result.position) {
      console.log("[Extract] 未找到目标分组，尝试遍历所有字段...");

      formData.forEach((group) => {
        if (group.field_data && Array.isArray(group.field_data)) {
          group.field_data.forEach((fieldArray) => {
            if (Array.isArray(fieldArray)) {
              fieldArray.forEach((fields) => {
                if (Array.isArray(fields)) {
                  fields.forEach((field) => {
                    console.log(
                      `[Extract] 检查字段: ${field.field_title} = ${field.value_names}`
                    );

                    // 模糊匹配
                    if (
                      (field.field_title.includes("公司") ||
                        field.field_title.includes("Company")) &&
                      field.value_names &&
                      field.value_names.length > 0
                    ) {
                      result.company = field.value_names[0];
                      console.log(
                        "[Extract] ✅ 模糊匹配到公司:",
                        result.company
                      );
                    }
                    if (
                      (field.field_title.includes("职位") ||
                        field.field_title.includes("Position") ||
                        field.field_title.includes("Title")) &&
                      field.value_names &&
                      field.value_names.length > 0
                    ) {
                      result.position = field.value_names[0];
                      console.log(
                        "[Extract] ✅ 模糊匹配到职位:",
                        result.position
                      );
                    }
                  });
                }
              });
            }
          });
        }
      });
    }

    console.log("[Extract] 最终提取结果:", result);
    return result;
  }

  /**
   * 获取报名详情
   */
  async function getRegistrationDetails(registrationId) {
    const url = `https://hr.moseeker.com/api/activity/registration/filled_data?id=${registrationId}&filled_type=registration`;

    try {
      console.log(`🌐 [API] 正在请求详情: ${registrationId}`);
      const response = await fetch(url);
      const data = await response.json();

      console.log(`🌐 [API] 详情响应:`, data);

      if (data.message !== "success") {
        console.error("🌐 [API] ❌ 获取详情失败:", data.message);
        return null;
      }

      // 提取基本信息
      console.log("[API] overview:", data.data.overview);
      const result = {
        id: registrationId,
        name: data.data.overview.name,
        mobile: data.data.overview.mobile || "",
        email: data.data.overview.email || "",
        registrationTime: data.data.overview.registration_time || "",
      };

      console.log("[API] 基本信息:", result);

      // 提取自定义字段（公司、职位）
      const formData = data.data.form_filled_data || [];
      console.log("[API] form_filled_data 长度:", formData.length);
      const customFields = extractCustomFields(formData);

      const finalResult = { ...result, ...customFields };
      console.log("🌐 [API] ✅ 获取成功:", finalResult);

      return finalResult;
    } catch (error) {
      console.error("🌐 [API] ❌ 请求异常:", error);
      return null;
    }
  }

  // ==================== 缓存层 ====================

  class EventDataCache {
    constructor(eventId) {
      this.eventId = eventId;
      this.cacheKey = "event_data"; // 统一的 key
    }

    /**
     * 获取所有缓存数据
     */
    _getAllData() {
      try {
        const data = localStorage.getItem(this.cacheKey);
        return data ? JSON.parse(data) : {};
      } catch (error) {
        console.error("[Cache] 读取缓存失败:", error);
        return {};
      }
    }

    /**
     * 保存所有缓存数据
     */
    _setAllData(allData) {
      try {
        localStorage.setItem(this.cacheKey, JSON.stringify(allData));
      } catch (error) {
        console.error("[Cache] 保存缓存失败:", error);
      }
    }

    /**
     * 获取当前活动的缓存
     */
    get() {
      try {
        const allData = this._getAllData();
        return allData[this.eventId] || null;
      } catch (error) {
        console.error("[Cache] 读取缓存失败:", error);
        return null;
      }
    }

    /**
     * 保存当前活动的缓存
     */
    set(data) {
      try {
        const allData = this._getAllData();
        allData[this.eventId] = data;
        this._setAllData(allData);
        console.log(`[Cache] 缓存已保存 (活动 ${this.eventId})`);
      } catch (error) {
        console.error("[Cache] 保存缓存失败:", error);
      }
    }

    /**
     * 清除当前活动的缓存
     */
    clear() {
      try {
        const allData = this._getAllData();
        delete allData[this.eventId];
        this._setAllData(allData);
        console.log(`[Cache] 缓存已清除 (活动 ${this.eventId})`);
      } catch (error) {
        console.error("[Cache] 清除缓存失败:", error);
      }
    }

    /**
     * 清除所有活动的缓存
     */
    clearAll() {
      try {
        localStorage.removeItem(this.cacheKey);
        console.log("[Cache] 已清除所有活动缓存");
      } catch (error) {
        console.error("[Cache] 清除缓存失败:", error);
      }
    }

    /**
     * 构建索引
     */
    buildIndexes(registrations) {
      const nameIndex = {};
      const nameTimeIndex = {};

      Object.values(registrations).forEach((reg) => {
        // 姓名索引
        if (!nameIndex[reg.name]) {
          nameIndex[reg.name] = [];
        }
        nameIndex[reg.name].push(reg.id);

        // 姓名+时间索引
        if (reg.registrationTime) {
          const key = `${reg.name}_${reg.registrationTime}`;
          nameTimeIndex[key] = reg.id;
        }
      });

      return { nameIndex, nameTimeIndex };
    }

    /**
     * 查找报名信息
     */
    findByName(name, registrationTime = null) {
      const cache = this.get();
      if (!cache) return null;

      // 如果提供了报名时间，优先使用复合索引
      if (registrationTime) {
        const key = `${name}_${registrationTime}`;
        const id = cache.nameTimeIndex[key];
        if (id) {
          return cache.registrations[id];
        }
      }

      // 使用姓名索引
      const ids = cache.nameIndex[name];
      if (!ids || ids.length === 0) {
        return null;
      }

      if (ids.length === 1) {
        return cache.registrations[ids[0]];
      }

      // 重名情况
      return { duplicate: true, count: ids.length };
    }
  }

  // ==================== 数据同步 ====================

  /**
   * 同步活动数据
   */
  async function syncEventData(eventId, forceRefresh = false) {
    console.log(`[Sync] 开始同步活动 ${eventId} 的数据...`);

    const cache = new EventDataCache(eventId);
    const existingCache = cache.get();

    // 检查缓存是否存在且未过期（24小时）
    if (existingCache && !forceRefresh) {
      const lastUpdate = new Date(existingCache.lastUpdate);
      const now = new Date();
      const hoursDiff = (now - lastUpdate) / (1000 * 60 * 60);

      if (hoursDiff < 24) {
        console.log(
          "💾 [Sync] ✅ 使用缓存数据（缓存时间:",
          hoursDiff.toFixed(1),
          "小时）"
        );
        return existingCache;
      } else {
        console.log("💾 [Sync] ⚠️ 缓存已过期，重新获取");
      }
    }

    // 显示同步提示
    showSyncNotification("正在同步报名数据，请稍候...");

    // 获取所有报名记录
    const registrations = {};
    let pageNum = 1;
    let hasMore = true;
    let totalCount = 0;

    while (hasMore) {
      console.log(`[Sync] 获取第 ${pageNum} 页...`);
      const result = await getRegistrationList(eventId, pageNum, 100);

      if (!result.success) {
        console.error("[Sync] 获取报名列表失败");
        showSyncNotification("同步失败，请刷新页面重试", "error");
        return null;
      }

      totalCount = result.total;
      updateSyncNotification(
        `正在同步 ${Object.keys(registrations).length}/${totalCount} 条记录...`
      );

      // 获取每个报名的详情
      for (const reg of result.list) {
        console.log(`🌐 [Sync] 调用API获取 ${reg.name} 的详情...`);
        const details = await getRegistrationDetails(reg.id);
        if (details) {
          registrations[reg.id] = details;
          updateSyncNotification(
            `正在同步 ${
              Object.keys(registrations).length
            }/${totalCount} 条记录...`
          );
        }

        // 避免请求过快
        await sleep(100);
      }

      hasMore = !result.reachEnd;
      pageNum++;
    }

    // 构建索引
    const indexes = cache.buildIndexes(registrations);

    // 保存缓存
    const cacheData = {
      eventId,
      lastUpdate: new Date().toISOString(),
      registrations,
      ...indexes,
    };

    cache.set(cacheData);
    console.log(
      `[Sync] 同步完成，共 ${Object.keys(registrations).length} 条记录`
    );
    showSyncNotification(
      `同步完成！共 ${Object.keys(registrations).length} 条记录`,
      "success"
    );

    return cacheData;
  }

  /**
   * 增量同步 - 只获取缺失的报名详情
   */
  async function incrementalSync(eventId, missingNames) {
    console.log(
      `[Sync] 增量同步，缺失 ${missingNames.length} 个报名者:`,
      missingNames
    );

    const cache = new EventDataCache(eventId);
    const cacheData = cache.get() || {
      eventId,
      lastUpdate: new Date().toISOString(),
      registrations: {},
      nameIndex: {},
      nameTimeIndex: {},
    };

    // 获取报名列表，查找缺失的报名者
    let pageNum = 1;
    let hasMore = true;
    let foundCount = 0;

    while (hasMore && foundCount < missingNames.length) {
      const result = await getRegistrationList(eventId, pageNum, 100);

      if (!result.success) {
        console.error("[Sync] 增量同步失败");
        return false;
      }

      for (const reg of result.list) {
        // 检查是否是缺失的报名者
        if (
          missingNames.includes(reg.name) &&
          !cacheData.registrations[reg.id]
        ) {
          console.log(`[Sync] 找到缺失的报名者: ${reg.name}, ID: ${reg.id}`);

          // 🌐 调用API获取详情
          console.log(`🌐 [Sync] 调用API获取缺失数据...`);
          const details = await getRegistrationDetails(reg.id);
          if (details) {
            cacheData.registrations[reg.id] = details;
            foundCount++;
            console.log(`[Sync] ✅ 已获取 ${reg.name} 的详情`);
          }

          await sleep(100);
        }
      }

      hasMore = !result.reachEnd;
      pageNum++;
    }

    if (foundCount > 0) {
      // 重建索引
      const indexes = cache.buildIndexes(cacheData.registrations);
      cacheData.nameIndex = indexes.nameIndex;
      cacheData.nameTimeIndex = indexes.nameTimeIndex;
      cacheData.lastUpdate = new Date().toISOString();

      // 保存缓存
      cache.set(cacheData);
      console.log(`[Sync] 增量同步完成，新增 ${foundCount} 条记录`);
      return true;
    }

    console.log("[Sync] 增量同步未找到新记录");
    return false;
  }

  /**
   * 更新数据 - 获取报名列表，对比缓存，获取新增报名者的详情
   */
  async function updateData(eventId) {
    console.log("[Update] ========== 开始更新数据 ==========");
    console.log("[Update] 时间:", new Date().toLocaleTimeString());

    const cache = new EventDataCache(eventId);
    const cacheData = cache.get() || {
      eventId,
      lastUpdate: new Date().toISOString(),
      registrations: {},
      nameIndex: {},
      nameTimeIndex: {},
    };

    const existingIds = new Set(
      Object.keys(cacheData.registrations).map((id) => parseInt(id, 10))
    );
    console.log(`💾 [Update] 缓存中已有 ${existingIds.size} 条记录`);

    // 快速检查：先获取第一页，看看总数是否变化
    console.log(`[Update] 快速检查：获取第一页...`);
    const firstPage = await getRegistrationList(eventId, 1, 100);

    if (!firstPage.success) {
      console.error("[Update] 获取报名列表失败");
      return false;
    }

    const totalCount = firstPage.total;
    console.log(
      `[Update] 报名总数: ${totalCount}, 缓存数: ${existingIds.size}`
    );

    // 如果总数没变，且缓存不为空，直接返回
    if (totalCount === existingIds.size && existingIds.size > 0) {
      console.log("[Update] 报名总数未变化，跳过更新");
      return false;
    }

    console.log(`[Update] 检测到变化，开始获取详情...`);

    // 获取报名列表（从第一页开始，但第一页已经获取过了）
    let pageNum = 1;
    let hasMore = true;
    let newCount = 0;
    const allRegistrationIds = new Set();

    // 处理第一页（已经获取过了）
    for (const reg of firstPage.list) {
      allRegistrationIds.add(reg.id);

      if (!existingIds.has(reg.id)) {
        console.log(`[Update] 发现新报名者: ${reg.name}, ID: ${reg.id}`);
        console.log(`🌐 [Update] 调用API获取新报名者详情...`);
        const details = await getRegistrationDetails(reg.id);
        if (details) {
          cacheData.registrations[reg.id] = details;
          newCount++;
          console.log(`[Update] ✅ 已获取 ${reg.name} 的详情`);
        }
        await sleep(100);
      } else {
        console.log(`💾 [Update] ${reg.name} (ID: ${reg.id}) 已在缓存中`);
      }
    }

    hasMore = !firstPage.reachEnd;
    pageNum = 2; // 从第二页开始

    while (hasMore) {
      console.log(`[Update] 获取报名列表第 ${pageNum} 页...`);
      const result = await getRegistrationList(eventId, pageNum, 100);

      if (!result.success) {
        console.error("[Update] 获取报名列表失败");
        return false;
      }

      for (const reg of result.list) {
        allRegistrationIds.add(reg.id);

        // 检查是否是新增的报名者
        if (!existingIds.has(reg.id)) {
          console.log(`[Update] 发现新报名者: ${reg.name}, ID: ${reg.id}`);

          // 🌐 调用API获取详情
          console.log(`🌐 [Update] 调用API获取新报名者详情...`);
          const details = await getRegistrationDetails(reg.id);
          if (details) {
            cacheData.registrations[reg.id] = details;
            newCount++;
            console.log(`[Update] ✅ 已获取 ${reg.name} 的详情`);
          }

          await sleep(100);
        } else {
          console.log(`💾 [Update] ${reg.name} (ID: ${reg.id}) 已在缓存中`);
        }
      }

      hasMore = !result.reachEnd;
      pageNum++;
    }

    console.log(`[Update] 报名列表共 ${allRegistrationIds.size} 人`);
    console.log(`[Update] 新增 ${newCount} 条记录`);

    if (newCount > 0) {
      // 重建索引
      const indexes = cache.buildIndexes(cacheData.registrations);
      cacheData.nameIndex = indexes.nameIndex;
      cacheData.nameTimeIndex = indexes.nameTimeIndex;
      cacheData.lastUpdate = new Date().toISOString();

      // 保存缓存
      cache.set(cacheData);
      console.log(
        `[Update] ✅ 更新完成，缓存中共 ${
          Object.keys(cacheData.registrations).length
        } 条记录`
      );
      return true;
    }

    console.log("[Update] 没有新增记录");
    return false;
  }

  // ==================== UI 通知 ====================

  let notificationElement = null;

  function showSyncNotification(message, type = "info") {
    if (notificationElement) {
      notificationElement.remove();
    }

    notificationElement = document.createElement("div");
    notificationElement.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${
        type === "error"
          ? "#f56c6c"
          : type === "success"
          ? "#67c23a"
          : "#409eff"
      };
      color: white;
      border-radius: 4px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.15);
      z-index: 99999;
      font-size: 14px;
      max-width: 300px;
    `;
    notificationElement.textContent = message;

    document.body.appendChild(notificationElement);

    if (type === "success" || type === "error") {
      setTimeout(() => {
        if (notificationElement) {
          notificationElement.remove();
          notificationElement = null;
        }
      }, 3000);
    }
  }

  function updateSyncNotification(message) {
    if (notificationElement) {
      notificationElement.textContent = message;
    }
  }

  // ==================== 表格注入 ====================

  /**
   * 清除所有已注入的详情
   */
  function clearInjectedDetails() {
    const injectedElements = document.querySelectorAll(".injected-details");
    const count = injectedElements.length;
    injectedElements.forEach((el) => el.remove());
    if (count > 0) {
      console.log(`[Inject] 已清除 ${count} 个已注入的详情`);
    }
  }

  /**
   * 注入详情到表格
   */
  async function injectDetailsToTable(eventId) {
    console.log("[Inject] ========== 开始注入流程 ==========");
    console.log("[Inject] 时间:", new Date().toLocaleTimeString());

    const cache = new EventDataCache(eventId);
    const table = document.querySelector(".ActiveSignupManageTable");

    if (!table) {
      console.warn("[Inject] ❌ 未找到表格");
      return;
    }

    console.log("[Inject] ✅ 找到表格");

    // 检查表格是否在 loading
    const loadingElement = table.querySelector(".el-loading-mask");
    if (loadingElement && loadingElement.style.display !== "none") {
      console.log("[Inject] ⏳ 表格正在 loading，延迟注入");
      setTimeout(() => injectDetailsToTable(eventId), 500);
      return;
    }

    // 先清除所有已注入的详情
    clearInjectedDetails();

    // 读取表头，找到列索引
    const headers = Array.from(table.querySelectorAll("thead .cell"));
    console.log("[Inject] 表头数量:", headers.length);
    console.log(
      "[Inject] 表头内容:",
      headers.map((h) => h.textContent.trim())
    );

    const nameIndex = headers.findIndex((h) => h.textContent.trim() === "姓名");
    const timeIndex = headers.findIndex(
      (h) => h.textContent.trim() === "报名时间"
    );

    if (nameIndex === -1) {
      console.warn("[Inject] ❌ 未找到姓名列");
      return;
    }

    const hasTimeColumn = timeIndex !== -1;
    console.log(
      `[Inject] 姓名列索引: ${nameIndex}, 报名时间列索引: ${timeIndex}`
    );

    // 遍历数据行 - 转换为数组，避免动态 NodeList 问题
    const rows = Array.from(table.querySelectorAll("tbody tr"));
    console.log(`[Inject] 找到 ${rows.length} 行数据`);

    if (rows.length === 0) {
      console.warn("[Inject] ⚠️ 表格没有数据行");
      return;
    }

    // 先更新数据（获取报名列表，检查新增）
    console.log("[Inject] 更新数据...");
    await updateData(eventId);

    // 注入详情 - 异步并行处理
    console.log("[Inject] 开始注入详情（异步并行）");
    const injectionTasks = [];

    rows.forEach((row, rowIndex) => {
      const cells = row.querySelectorAll("td");
      if (cells.length === 0) {
        console.log(`[Inject] 行 ${rowIndex}: 没有单元格，跳过`);
        return;
      }

      const nameCell = cells[nameIndex];
      if (!nameCell) {
        console.log(`[Inject] 行 ${rowIndex}: 没有姓名单元格，跳过`);
        return;
      }

      // 提取姓名（排除已注入的内容）
      let name = "";

      // 克隆单元格并移除所有注入的元素
      const clonedCell = nameCell.cloneNode(true);
      const injectedElements = clonedCell.querySelectorAll(
        '[data-injected="true"], .injected-details'
      );
      injectedElements.forEach((el) => el.remove());

      // 获取清理后的文本
      name = clonedCell.textContent.trim();

      console.log(`[Inject] 行 ${rowIndex}: 姓名="${name}"`);

      let registrationTime = null;
      if (hasTimeColumn && timeIndex < cells.length) {
        registrationTime = cells[timeIndex].textContent.trim();
      }

      // 先清除该单元格内已有的注入内容（防止重复注入）
      const existingInjected = nameCell.querySelectorAll(
        '[data-injected="true"], .injected-details'
      );
      existingInjected.forEach((el) => el.remove());

      // 创建占位符
      const detailsDiv = document.createElement("div");
      detailsDiv.className = "injected-details";
      detailsDiv.setAttribute("data-injected", "true");
      detailsDiv.style.cssText = `
        font-size: 12px;
        color: #999;
        margin-top: 4px;
        line-height: 1.5;
      `;
      detailsDiv.innerHTML = `<div style="padding:0 12px">⏳ 加载中...</div>`;
      nameCell.appendChild(detailsDiv);

      // 异步处理每一行
      const task = (async () => {
        try {
          // 先尝试从缓存获取
          let info = cache.findByName(name, registrationTime);

          if (info) {
            console.log(`💾 [Inject] 行 ${rowIndex}: 从缓存获取 ${name}`);
          } else {
            // 缓存没有，从API获取
            console.log(`🌐 [Inject] 行 ${rowIndex}: 从API获取 ${name}`);
            detailsDiv.innerHTML = `<div style="padding:0 12px; color: #409eff;">🌐 加载中...</div>`;

            // 获取报名列表找到ID
            const list = await getRegistrationList(eventId, 1, 1000);
            if (list.success) {
              const reg = list.list.find((r) => r.name === name);
              if (reg) {
                const details = await getRegistrationDetails(reg.id);
                if (details) {
                  // 保存到缓存
                  const cacheData = cache.get() || {
                    eventId,
                    lastUpdate: new Date().toISOString(),
                    registrations: {},
                  };
                  cacheData.registrations[reg.id] = details;
                  cache.save(cacheData);

                  info = {
                    name: details.name,
                    company: details.company,
                    position: details.position,
                    duplicate: false,
                  };
                }
              }
            }
          }

          if (!info) {
            detailsDiv.innerHTML = `<div style="padding:0 12px; color: #f56c6c;">❌ 加载失败</div>`;
            console.warn(`[Inject] 行 ${rowIndex}: ❌ 未找到 ${name} 的信息`);
            return;
          }

          // 更新显示
          if (info.duplicate) {
            detailsDiv.innerHTML = `⚠️ 存在 ${info.count} 个重名用户`;
            detailsDiv.style.color = "#f56c6c";
          } else {
            const company = info.company || "未填写";
            const position = info.position || "未填写";
            detailsDiv.innerHTML = `
              <div style="padding:0 12px">
                ${company} | ${position}
              </div>
            `;
            detailsDiv.style.color = "#666";
          }

          console.log(`[Inject] 行 ${rowIndex}: ✅ 注入成功 ${name}`);
        } catch (error) {
          console.error(`[Inject] 行 ${rowIndex}: 异常`, error);
          detailsDiv.innerHTML = `<div style="padding:0 12px; color: #f56c6c;">❌ 加载异常</div>`;
        }
      })();

      injectionTasks.push(task);
    });

    // 等待所有任务完成
    console.log(`[Inject] 等待 ${injectionTasks.length} 个任务完成...`);
    await Promise.all(injectionTasks);
    console.log(`[Inject] ========== 注入完成 ==========`);
  }

  // ==================== 控制面板 ====================

  function createControlPanel(eventId) {
    // 查找目标容器
    const targetContainer = document.querySelector(
      ".NumberTabs .QxSlideGroup__wrapper"
    );

    if (!targetContainer) {
      console.warn("[Panel] 未找到标签栏容器");
      return;
    }

    // 检查是否已经存在
    if (document.getElementById("moseeker-details-control-panel")) {
      return;
    }

    const panel = document.createElement("div");
    panel.id = "moseeker-details-control-panel";
    panel.style.cssText = `
      display: flex;
      align-items: baseline;
      align-self: end;
      gap: 8px;
      margin-left: 2rem;
      padding: 12px;
      font-size: 12px;
      width: 100%;
    `;

    const cache = new EventDataCache(eventId);
    const cacheData = cache.get();
    const cacheCount = cacheData
      ? Object.keys(cacheData.registrations).length
      : 0;

    // 创建简洁状态的HTML
    panel.innerHTML = `
      <span id="panel-toggle" style="color: #999; cursor: pointer; user-select: none;">
        💾 详情 ${cacheCount}
      </span>
      <span id="panel-actions" style="display: none; gap: 8px;">
        <button id="refresh-details-btn" style="
          padding: 0 8px;
          border: none;
          cursor: pointer;
          font-size: 12px;
          background: none;
          color: #999;
        ">刷新</button>
        <button id="clear-cache-btn" style="
          padding: 0 8px;
          border: none;
          cursor: pointer;
          font-size: 12px;
          background: none;
          color: #999;
        ">清除</button>
      </span>
    `;

    targetContainer.appendChild(panel);

    // 折叠/展开逻辑
    const toggle = document.getElementById("panel-toggle");
    const actions = document.getElementById("panel-actions");
    let isExpanded = false;

    toggle.addEventListener("click", () => {
      isExpanded = !isExpanded;
      if (isExpanded) {
        toggle.textContent = `💾 存储详情 ${cacheCount} 条`;
        actions.style.display = "flex";
      } else {
        toggle.textContent = `💾 详情 ${cacheCount}`;
        actions.style.display = "none";
      }
    });

    // 绑定事件
    document
      .getElementById("refresh-details-btn")
      .addEventListener("click", async () => {
        await syncEventData(eventId, true);
        await injectDetailsToTable(eventId);
        // 更新面板
        panel.remove();
        createControlPanel(eventId);
      });

    document.getElementById("clear-cache-btn").addEventListener("click", () => {
      if (confirm("确定要清除缓存吗？")) {
        cache.clear();
        showSyncNotification("缓存已清除", "success");
        // 更新面板
        panel.remove();
        createControlPanel(eventId);
      }
    });
  }

  // ==================== 主流程 ====================

  /**
   * 等待表格加载完成
   */
  async function waitForTable(maxWait = 60000) {
    console.log("[Main] 等待表格加载...");
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      const table = document.querySelector(".ActiveSignupManageTable");
      if (table) {
        const rows = table.querySelectorAll("tbody tr");
        const loadingElement = table.querySelector(".el-loading-mask");
        const isLoading =
          loadingElement && loadingElement.style.display !== "none";

        if (rows.length > 0 && !isLoading) {
          console.log(`[Main] ✅ 表格加载完成，找到 ${rows.length} 行数据`);
          return table;
        }
      }

      await sleep(200);
    }

    console.warn("[Main] ⚠️ 等待表格超时");
    return null;
  }

  async function main() {
    console.log("[MoSeeker Details Sync] 脚本启动");

    // 获取 event_id
    const eventId = getEventId();
    if (!eventId) {
      console.warn("[Main] 无法获取 event_id");
      return;
    }

    console.log(`[Main] Event ID: ${eventId}`);

    // 等待表格加载完成
    const table = await waitForTable();
    if (!table) {
      console.error("[Main] 表格加载失败，退出");
      return;
    }

    // 监听表格变化，自动重新注入（使用防抖）
    let debounceTimer = null;
    let isInjecting = false; // 防止注入过程中触发新的注入

    // 首次更新数据并注入
    isInjecting = true;
    await injectDetailsToTable(eventId);
    isInjecting = false;

    // 创建控制面板
    createControlPanel(eventId);

    const observer = new MutationObserver((mutations) => {
      console.log(`[Observer] 检测到 ${mutations.length} 个变化`);

      // 如果正在注入，忽略
      if (isInjecting) {
        console.log("[Observer] 正在注入中，忽略变化");
        return;
      }

      // 检查是否有实质性的变化
      let shouldUpdate = false;

      mutations.forEach((mutation) => {
        // 忽略我们自己注入的元素
        const addedInjected = Array.from(mutation.addedNodes).some(
          (node) =>
            node.classList && node.classList.contains("injected-details")
        );
        const removedInjected = Array.from(mutation.removedNodes).some(
          (node) =>
            node.classList && node.classList.contains("injected-details")
        );

        if (addedInjected || removedInjected) {
          return; // 跳过这个 mutation
        }

        // 检查是否有 loading 消失（说明表格可能更新了）
        const loadingRemoved = Array.from(mutation.removedNodes).some(
          (node) => node.classList && node.classList.contains("el-loading-mask")
        );

        if (loadingRemoved) {
          console.log("[Observer] ✅ 检测到 loading 消失，表格可能已更新");
          shouldUpdate = true;
        }

        // 检查是否有表格内容变化
        if (
          mutation.target.tagName === "TBODY" ||
          mutation.target.closest("tbody")
        ) {
          console.log("[Observer] ✅ 检测到 tbody 变化");
          shouldUpdate = true;
        }
      });

      const hasRealChange = shouldUpdate;

      if (hasRealChange) {
        console.log("[Main] 检测到表格内容变化");

        // 防抖：500ms 内没有新变化才执行
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        debounceTimer = setTimeout(async () => {
          // 再次检查表格是否真的有数据
          const currentTable = document.querySelector(
            ".ActiveSignupManageTable"
          );
          if (!currentTable) {
            console.log("[Main] 表格不存在，取消更新");
            return;
          }

          const currentRows = currentTable.querySelectorAll("tbody tr");
          if (currentRows.length === 0) {
            console.log("[Main] 表格没有数据，取消更新");
            return;
          }

          console.log(
            `[Main] 表格已稳定，有 ${currentRows.length} 行数据，开始更新`
          );

          isInjecting = true;
          await injectDetailsToTable(eventId);
          isInjecting = false;
        }, 500);
      }
    });

    observer.observe(table, {
      childList: true,
      subtree: true,
    });
    console.log("[Main] 已启动表格监听（带防抖）");

    console.log("[MoSeeker Details Sync] 初始化完成");
  }

  // 页面加载完成后执行
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else {
    main();
  }
})();
