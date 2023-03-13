/*
 * @Version: 1.0
 * @Autor: wangrenhua
 * @Description: 
 * @Date: 2021-10-12 13:36:56
 * @FilePath: \Cosmos\page\update\update.js
 * @LastEditTime: 2022-03-04 10:01:37
 */ 

const { ipcRenderer } = require('electron');
let width = $('#progress').innerWidth();
let windowType = null;

ipcRenderer.on('data',(event, arg) => {
    windowType = arg.type;
    $('#path').text(arg.data.path);
    $('#version').text(arg.data.version);
    $('#size').text(`${arg.data.totalSize} MB`);
    $('#releaseDate').text(arg.data.releaseDate);
    $('#state').text('未开始');
});

ipcRenderer.on('progress', (event, arg) => {
    if(!arg.progress) return;
    let progress = (arg.progress / 100) * width;
    $('#fill').width(progress);
    $('#state').text((arg.speed / 1000000).toFixed(2) + " MB/s");
    $('#value').html(arg.progress.toFixed(1) + "%");
});

$('#sure').on('click', function() {
    $('#state').text('请等待...');
    ipcRenderer.send('download-update');
    $('#sure').hide();
});

$('#cancel').on('click',() => {
    ipcRenderer.send('close',{windowType, close:true});
});