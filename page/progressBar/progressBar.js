/*
 * @Version: 1.0
 * @Autor: wangrenhua
 * @Description: 
 * @Date: 2021-09-08 14:23:08
 * @FilePath: \AiRoute\page\progressBar\progressBar.js
 * @LastEditTime: 2021-09-16 09:56:11
 */
const { ipcRenderer } = require('electron');
let width = $('#progress').innerWidth();

ipcRenderer.on('progress', (event, arg) => {
    if(arg.progress > 1) arg.progress = 1; 
    let progress = arg.progress * width;
    $('#fill').width(progress);
    $('#value').html(Math.round(arg.progress*100) + "%");
});

// ipcRenderer.on('data', (event, arg) => {
//     if(!arg.data) return;
//     ipcRenderer.send('data',{windowType: arg.type, target:arg.data.sendWindow, sendName: arg.data.name + '-ready', close: false, data: arg.data.content});
// });
