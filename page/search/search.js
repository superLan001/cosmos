/*
 * @Version: 1.0
 * @Autor: wangrenhua
 * @Description: 
 * @Date: 2021-09-13 08:45:50
 * @FilePath: \AiRoute\page\search\search.js
 * @LastEditTime: 2021-10-14 15:34:29
 */
const { ipcRenderer } = require('electron');

let windowType = null;
ipcRenderer.on('data', (event, arg) => {
    windowType = arg.type;
});

$(document).on('keyup',(function(event){
    if(event.code === 'Enter'){
        let name = $('#city').val();
        ipcRenderer.send('data',{windowType ,target:'mainWindow',sendName:'search', close:true,data:{name}});
    }else if(event.code === 'Escape'){
        ipcRenderer.send('close',{windowType, close:true});
    }
}));


$('#search').on('click',()=>{
    let name = $('#city').val();
    ipcRenderer.send('data',{windowType ,target:'mainWindow',sendName:'search', close:true,data:{name}});
});