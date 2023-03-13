/*
 * @Version: 1.0
 * @Autor: wangrenhua
 * @Description: 
 * @Date: 2021-12-07 09:43:02
 * @FilePath: \Cosmos\page\custom\custom.js
 * @LastEditTime: 2021-12-07 17:09:22
 */
const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

let windowType = null;
let fileName = null;
ipcRenderer.on('data',(event, arg) => windowType = arg.type);
$('#path').on('click',() => ipcRenderer.send('openCustomFile',{windowType}));

let tableData = [];
ipcRenderer.on('customFileHandler',(event,arg) => {
    $('#customPath').val(arg.filePaths[0]);
    let fRead = fs.createReadStream(arg.filePaths[0]);
    fileName = path.basename(arg.filePaths[0], path.extname(arg.filePaths[0]));
    let objReadLine = readline.createInterface({input: fRead});
    let i = 1;
    tableData = [];
    objReadLine.on('line', line => {
        let customData = line.split(/,|，|\s+/).filter(s => s && s.trim());//以中英文逗号、空格（一个或多个）分割字符串
        if(customData.length === 2){
            tableData.push([customData[0], customData[1], 0, 0]);
            $("#table-data").append($("<tr><td>" + (i++) + "</td><td>" + customData[0] + "</td><td>" + customData[1] + "</td><td>" + 0 + "</td><td>" + 0 + "</td></tr>"));   
        }else if(customData.length === 3){
            tableData.push([customData[0], customData[1], customData[2], 0]);
            $("#table-data").append($("<tr><td>" + (i++) + "</td><td>" + customData[0] + "</td><td>" + customData[1] + "</td><td>" + customData[2] +"</td><td>"+ 0 +"</td></tr>"));
        }else if(customData.length >= 4){
            tableData.push([customData[0], customData[1], customData[2], customData[3]]);
            $("#table-data").append($("<tr><td>" + (i++) + "</td><td>" + customData[0] + "</td><td>" + customData[1] + "</td><td>" + customData[2] +"</td><td>"+ customData[3] +"</td></tr>"));
        }
    });
});

$('#sure').on('click',() => {
    let one = Number($('#select-one').val());
    let two = Number($('#select-two').val());
    let three = Number($('#select-three').val());
    let four = Number($('#select-four').val());
    let tableHead = [one, two, three, four];
    let type = Number($('#select-type').val());
    ipcRenderer.send('data',{windowType ,target:'mainWindow',sendName:'custom', close:true, data:{name: fileName, type, tableHead, tableData}});
});

$('#cancel').on('click',() => ipcRenderer.send('close',{windowType, close:true}));