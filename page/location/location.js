/*
 * @Version: 1.0
 * @Autor: wangrenhua
 * @Description: 
 * @Date: 2021-11-04 16:15:53
 * @FilePath: \Cosmos\page\location\location.js
 * @LastEditTime: 2021-11-08 09:35:24
 */
const { ipcRenderer } = require('electron');

let windowType = null;
let dataNew = new Map();
ipcRenderer.on('data',(event, arg) => {
    windowType = arg.type;
    const data = arg.data;
    if(!data) return;
    dataNew.set('id',data.id);
    dataNew.set('type',data.type);
})

$('#co-input-number-decrease-lx').on('click',() => {
    let num = Number($('#co-input-inner-lx').val()) - 1;
    $('#co-input-inner-lx').val(num);
    dataNew.set('lxstep', Number($('#co-input-inner-lx').val()));
    dataNew.set('lystep', Number($('#co-input-inner-ly').val()));
    dataNew.set('lzstep', Number($('#co-input-inner-lz').val()));
    ipcRenderer.send('data',{windowType ,target:'mainWindow',sendName:'locCorrection',close:false,data: dataNew});
});

$('#co-input-number-increase-lx').on('click',() => {
    let num = Number($('#co-input-inner-lx').val()) + 1;
    $('#co-input-inner-lx').val(num);
    dataNew.set('lxstep', Number($('#co-input-inner-lx').val()));
    dataNew.set('lystep', Number($('#co-input-inner-ly').val()));
    dataNew.set('lzstep', Number($('#co-input-inner-lz').val()));
    ipcRenderer.send('data',{windowType ,target:'mainWindow',sendName:'locCorrection',close:false,data: dataNew});
});

$('#co-input-number-decrease-ly').on('click',() => {
    let num = Number($('#co-input-inner-ly').val()) - 1;
    $('#co-input-inner-ly').val(num);
    dataNew.set('lxstep', Number($('#co-input-inner-lx').val()));
    dataNew.set('lystep', Number($('#co-input-inner-ly').val()));
    dataNew.set('lzstep', Number($('#co-input-inner-lz').val()));
    ipcRenderer.send('data',{windowType ,target:'mainWindow',sendName:'locCorrection',close:false,data: dataNew});
});

$('#co-input-number-increase-ly').on('click',() => {
    let num = Number($('#co-input-inner-ly').val()) + 1;
    $('#co-input-inner-ly').val(num);
    dataNew.set('lxstep', Number($('#co-input-inner-lx').val()));
    dataNew.set('lystep', Number($('#co-input-inner-ly').val()));
    dataNew.set('lzstep', Number($('#co-input-inner-lz').val()));
    ipcRenderer.send('data',{windowType ,target:'mainWindow',sendName:'locCorrection',close:false,data: dataNew});
});

$('#co-input-number-decrease-lz').on('click',() => {
    let num = Number($('#co-input-inner-lz').val()) - 1;
    $('#co-input-inner-lz').val(num);
    dataNew.set('lxstep', Number($('#co-input-inner-lx').val()));
    dataNew.set('lystep', Number($('#co-input-inner-ly').val()));
    dataNew.set('lzstep', Number($('#co-input-inner-lz').val()));
    ipcRenderer.send('data',{windowType ,target:'mainWindow',sendName:'locCorrection',close:false,data: dataNew});
});

$('#co-input-number-increase-lz').on('click',() => {
    let num = Number($('#co-input-inner-lz').val()) + 1;
    $('#co-input-inner-lz').val(num);
    dataNew.set('lxstep', Number($('#co-input-inner-lx').val()));
    dataNew.set('lystep', Number($('#co-input-inner-ly').val()));
    dataNew.set('lzstep', Number($('#co-input-inner-lz').val()));
    ipcRenderer.send('data',{windowType ,target:'mainWindow',sendName:'locCorrection',close:false,data: dataNew});
});

$('#sure').on('click',()=>{
    dataNew.set('lxstep', Number($('#co-input-inner-lx').val()));
    dataNew.set('lystep', Number($('#co-input-inner-ly').val()));
    dataNew.set('lzstep', Number($('#co-input-inner-lz').val()));
    ipcRenderer.send('data',{windowType ,target:'mainWindow',sendName:'merge', close:true, data:{mainId,id}});
});

$('#cancel').on('click',() => {
    ipcRenderer.send('close',{windowType, close:true});
});

// $('#co-input-number-decrease-rx').on('click',() => {
//     let num = Number($('#co-input-inner-rx').val()) - 1;
//     $('#co-input-inner-rx').val(num);
//     dataNew.set('rxstep', Number($('#co-input-inner-rx').val()));
//     dataNew.set('rystep', Number($('#co-input-inner-ry').val()));
//     dataNew.set('rzstep', Number($('#co-input-inner-rz').val()));
//     ipcRenderer.send('data',{windowType ,target:'mainWindow',sendName:'rotCorrection',close:false,data: dataNew});
// });

// $('#co-input-number-increase-rx').on('click',() => {
//     let num = Number($('#co-input-inner-rx').val()) + 1;
//     $('#co-input-inner-rx').val(num);
//     dataNew.set('rxstep', Number($('#co-input-inner-rx').val()));
//     dataNew.set('rystep', Number($('#co-input-inner-ry').val()));
//     dataNew.set('rzstep', Number($('#co-input-inner-rz').val()));
//     ipcRenderer.send('data',{windowType ,target:'mainWindow',sendName:'rotCorrection',close:false,data: dataNew});
// });

// $('#co-input-number-decrease-ry').on('click',() => {
//     let num = Number($('#co-input-inner-ry').val()) - 1;
//     $('#co-input-inner-ry').val(num);
//     dataNew.set('rxstep', Number($('#co-input-inner-rx').val()));
//     dataNew.set('rystep', Number($('#co-input-inner-ry').val()));
//     dataNew.set('rzstep', Number($('#co-input-inner-rz').val()));
//     ipcRenderer.send('data',{windowType ,target:'mainWindow',sendName:'rotCorrection',close:false,data: dataNew});
// });

// $('#co-input-number-increase-ry').on('click',() => {
//     let num = Number($('#co-input-inner-ry').val()) + 1;
//     $('#co-input-inner-ry').val(num);
//     dataNew.set('rxstep', Number($('#co-input-inner-rx').val()));
//     dataNew.set('rystep', Number($('#co-input-inner-ry').val()));
//     dataNew.set('rzstep', Number($('#co-input-inner-rz').val()));
//     ipcRenderer.send('data',{windowType ,target:'mainWindow',sendName:'rotCorrection',close:false,data: dataNew});
// });

// $('#co-input-number-decrease-rz').on('click',() => {
//     let num = Number($('#co-input-inner-rz').val()) - 1;
//     $('#co-input-inner-rz').val(num);
//     dataNew.set('rxstep', Number($('#co-input-inner-rx').val()));
//     dataNew.set('rystep', Number($('#co-input-inner-ry').val()));
//     dataNew.set('rzstep', Number($('#co-input-inner-rz').val()));
//     ipcRenderer.send('data',{windowType ,target:'mainWindow',sendName:'rotCorrection',close:false,data: dataNew});
// });

// $('#co-input-number-increase-rz').on('click',() => {
//     let num = Number($('#co-input-inner-rz').val()) + 1;
//     $('#co-input-inner-rz').val(num);
//     dataNew.set('rxstep', Number($('#co-input-inner-rx').val()));
//     dataNew.set('rystep', Number($('#co-input-inner-ry').val()));
//     dataNew.set('rzstep', Number($('#co-input-inner-rz').val()));
//     ipcRenderer.send('data',{windowType ,target:'mainWindow',sendName:'rotCorrection',close:false,data: dataNew});
// });