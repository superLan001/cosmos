/*
 * @Version: 1.0
 * @Autor: wangrenhua
 * @Description: 
 * @Date: 2021-09-06 09:08:20
 * @FilePath: \Cosmos\page\merge\merge.js
 * @LastEditTime: 2022-03-09 09:50:07
 */

const { ipcRenderer } = require('electron');
require('jstree');

$('#jstree').jstree({
    'core' : {
        'animation' : 0,
        'themes':{
            'icons' : false,
            'theme' : 'default',
            'dots' : true,
            'ellipsis': true,
            'stripes' : false
        },
        'check_callback' : true,
        'multiple': true,
        'dblclick_toggle': false,
    },
    'checkbox':{
        'whole_node': false,
        'keep_selected_style': false,
    },
    'plugins' : ['checkbox']
});
window.jsTreeObj =  $('#jstree').jstree(true);

let mainId = null;
let windowType = null;
ipcRenderer.on('data',(event, arg) => {
    const data = arg.data;
    windowType = arg.type;
    if(!data) return;
    mainId = data.id;
    // for (let value of data.polygons.values()) {
    //     $('#select').append(`<option value=${value.id}>${value.name}</option>`);
    // }
    for (let value of data.polygons.values()) {
        window.jsTreeObj.create_node('#',{
            'id' : value.id,
            'type':'project',
            'text' : value.name,
            'state' : { 'loaded':true,'selected':true},
            'content' : {key:value.id, value:value.name}
        });
    }
});

$('#sure').on('click',()=>{
    const selectData = window.jsTreeObj.get_selected(true);
    let ids = [];
    for(let value of selectData) ids.push(value.id);
    ipcRenderer.send('data',{windowType ,target:'mainWindow',sendName:'merge', close:true, data:{mainId,ids}});
});

$('#cancel').on('click',() => {
    ipcRenderer.send('close',{windowType, close:true});
});