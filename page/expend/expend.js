/*
 * @Version: 1.0
 * @Autor: wangrenhua
 * @Description: 
 * @Date: 2021-08-31 10:43:06
 * @FilePath: \Cosmos\page\expend\expend.js
 * @LastEditTime: 2021-12-10 17:22:38
 */
const { ipcRenderer } = require('electron');

let id = null;
let windowType = null;
ipcRenderer.on('data',(event, arg)=>{
    const data = arg.data;
    windowType = arg.type;
    id = data.id;
});

$('#sure').on('click',() => {
    let length = Number($('#expend').val());
    ipcRenderer.send('data',{windowType ,target:'mainWindow',sendName:'expend', close:true,data:{id,length}});
});

$('#cancel').on('click',() => {
    ipcRenderer.send('close',{windowType, close:true});
});