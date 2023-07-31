// ==UserScript==
// @name         腾讯文档-批量处理图片
// @version      0.1.3
// @description  B站播放器优化。添加了一些 youtube 和 potplayer 的快捷键。修复了多P连播，增加了自动播放记忆位置等功能。
// @author       Erimus
// @match        https://doc.weixin.qq.com/sheet/*
// @namespace    https://greasyfork.org/users/46393
// ==/UserScript==

/* 功能说明
====================
*/

(function() {
    'use strict';
    console.info(10**10)
    const SN = '[腾讯文档助手]' // script name
    //raven把log替换了
    let log = (content) {
        console.info(SN, content)
    }
    console.info(SN, '油猴脚本开始')

    // common - start
    let select = document.querySelector
    const sleep = (ms = 500) => {
        console.log(`wait: ${ms} ms`)
        return new Promise((resolve) => setTimeout(resolve, ms));
    };
    // common - end

    let imgFloat2Cell = async () => {
        let allImg = document.querySelectorAll('.shape-image-box')
        allImg = Array.prototype.slice.call(allImg)
        console.info('allImg:', allImg)
        for (let i in allImg) {
            let img = allImg[i];
            console.info('img:', img)

            // right click image
            let rightClick = document.createEvent('MouseEvents');
            rightClick.initMouseEvent('contextmenu', true, true, window, 1, 12, 345, 7, 220, false, false, false, false, 0, null);
            img.dispatchEvent && img.dispatchEvent(rightClick);
            await sleep()


            // find content in context menu
            let menu = document.querySelectorAll('ul[role="menu"] li')
            // console.info('menu:', menu)
            for (let liIdx in menu) {
                let li = menu[liIdx]
                if (li.innerHTML && li.innerHTML.indexOf('转为单元格图片') != -1) {
                    // console.info('li.innerHTML:', li.innerHTML)
                    li.click()
                    await sleep()

                    // click confirm in popup box
                    let modalAll = document.querySelectorAll('.dui-modal')
                    for (let mIdx in modalAll) {
                        let modal = modalAll[mIdx]
                        if (!modal.querySelector) {continue}
                        let title = modal.querySelector('.dui-modal-title')
                        console.info('title:', title.innerHTML)
                        if (title.innerHTML.indexOf('转为单元格图片') != -1) {
                            console.info('in')
                            let confirm = modal.querySelector('.dui-modal-footer .dui-button-type-primary')
                            console.info('confirm:', confirm)
                            confirm.click()
                            await sleep()
                            // break
                        } else {
                            console.info('out')
                            // modal.querySelector('.dui-modal-footer .dui-button-type-default').click()
                            await sleep()
                        }
                    }

                    // break //从菜单遍历中退出
                }
            }
            // break //从图片遍历中退出 测试只对一个点击
        }
    }

    // 在页面上添加执行按钮
    let rpaBtnFrame = document.createElement('div')
    rpaBtnFrame.style.cssText = 'position:absolute;right:0;bottom:0;z-index:100;'
    const btnGroup = [
        ['把图片变成单元格图片', imgFloat2Cell],
        // ['批量同意接受简历', batch_accept_cv]
    ]
    for (const btn of btnGroup) {
        let actionBtn = document.createElement('button');
        actionBtn.innerHTML = btn[0]
        actionBtn.onclick = function() { btn[1]() };
        actionBtn.style.cssText = 'width:10em;height:2em;margin:.5em;background:#06B;color:white;font-weight:bold;border:none;border-radius:.5em;cursor:pointer';
        rpaBtnFrame.appendChild(actionBtn);
    }
    // setTimeout(() => {
    log('add btn')
    document.body.appendChild(rpaBtnFrame);
    // }, 5000)

})();
