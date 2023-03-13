/*
 * @Version: 1.0
 * @Autor: wangrenhua
 * @Description: 
 * @Date: 2021-09-01 14:05:39
 * @FilePath: \Cosmos\page\nature\nature.js
 * @LastEditTime: 2022-03-04 13:18:20
 */
const { ipcRenderer } = require('electron');

function round(num,n = 0){
    if(num === 0) return num;
    if(!num || toString.call(num) !== '[object Number]') return 0;
    return Number(num.toFixed(n));
}

function content(key,value){
    return `<li><span>[${ key }] </span><span>${ value }</span></li>`;
}

function colorRGBtoHex(R, G, B) {
    const red = R * 255;
    const greed = G * 255;
    const blue = B * 255;
    return "#" + ((1 << 24) + (red << 16) + (greed << 8) + blue).toString(16).slice(1);
}

function hexToRgba(hex, alpha) {
    return "rgba(" + parseInt("0x" + hex.slice(1, 3)) + "," + parseInt("0x" + hex.slice(3, 5)) + "," + parseInt("0x" + hex.slice(5, 7)) + "," + alpha + ")";
}

$("#select").on('change', () =>{
    let value = Number($('#select').val());
    if(value){
        $('#elevation').attr("disabled",true);
        $('#elevation').css("background",'#F0F0F0');
    }else{
        $('#elevation').attr("disabled",false);
        $('#elevation').css("background",'#FFFFFF');
    }
});

let windowType = null;
let dataNew = new Map();

ipcRenderer.on('data',(event, arg) => {
    const data = arg.data;
    windowType = arg.type;
    if(!data) return;
    $('#name').val(data.name);
    dataNew.set('id',data.id);
    dataNew.set('type',data.type);

    $('#bottom-status-content').append(content('编号', data.id));
    $('#bottom-status-content').append(content('类型', data.type));

    switch(data.type){
        case 'entity':
            if(data.entity.has('count')) $('#bottom-status-content').append(content('数量', data.entity.get('count')));
            $('#subset-box').hide();
            $('#outline-box').hide();
            $('#width-item').hide();
            $('#size-item').hide();
            if(data.entity.has('point')){
                $('#size-item').show();
                point(data.entity.get('point'));
            }
            if(data.entity.has('polygon')){
                $('#outline-box').show();
                polygon(data.entity.get('polygon'));
            }
            if(data.entity.has('polyline')){
                $('#width-item').show();
                polyline(data.entity.get('polyline'));
            }
            break;
        case 'polygon':
            if(data.polygon.has('acreage')) $('#bottom-status-content').append(content('面积', round((data.polygon.get('acreage') / 1000000),2) + ' km²'));
            $('#subset-box').hide();
            $('#width-item').hide();
            $('#size-item').hide();
            polygon(data.polygon);
            break;
        case 'polyline':
            if(data.polyline.has('length')) $('#bottom-status-content').append(content('长度', round(data.polyline.get('length'),3) + ' km'));
            if(data.polyline.has('azimuth')) $('#bottom-status-content').append(content('坐标方位角', round(data.polyline.get('azimuth'),3) + ' °'));
            $('#subset-box').hide();
            $('#outline-box').hide();
            $('#size-item').hide();
            polyline(data.polyline);
            break;
        case 'point':
            $('#subset-box').hide();
            $('#outline-box').hide();
            $('#width-item').hide();
            point(data.point);
            break;
        case 'primitive':
            if(data.primitive.has('count')) $('#bottom-status-content').append(content('数量', data.primitive.get('count')));
            $('#subset-box').hide();
            $('#color-li').hide();
            $('#height-li').hide();
            break;
        case 'tile':
            if(data.tile.has('longitude')) $('#bottom-status-content').append(content('中心经度', round(data.tile.get('longitude'), 8) + ' °'));
            if(data.tile.has('latitude')) $('#bottom-status-content').append(content('中心纬度', round(data.tile.get('latitude'), 8) + ' °'));
            if(data.tile.has('height')) $('#bottom-status-content').append(content('中心高度', round(data.tile.get('height'), 2) + ' m'));
            tile(data.tile);
            break;
    }
});

function polygon(data){
    const outlineColor = colorRGBtoHex(data.get('outlineColor').red,data.get('outlineColor').green,data.get('outlineColor').blue);
    const outlineAlpha = (100 - data.get('outlineColor').alpha * 100);
    const outlineWidth = data.get('outlineWidth');

    const materialColor = colorRGBtoHex(data.get('materialColor').red,data.get('materialColor').green,data.get('materialColor').blue);
    const materialAlpha = (100 - data.get('materialColor').alpha * 100);

    const elevation = round(data.get('elevation'),1);
    const heightReference =  data.get('heightReference');

    if(heightReference){
        $('#elevation').attr("disabled",true);
        $('#elevation').css("background",'#F0F0F0');
        $('#select').find("option[value = 1]").attr("selected",true);
    }else{
        $('#elevation').attr("disabled",false);
        $('#elevation').css("background",'#FFFFFF');
        $('#select').find("option[value = 0]").attr("selected",true);
    }

    $('#outline-color').val(outlineColor);
    $('#outline-width').val(outlineWidth);
    $('#outline-alpha').val(outlineAlpha);

    $('#material-color').val(materialColor);
    $('#material-alpha').val(materialAlpha);

    
    $('#elevation').val(elevation);
}

function polyline(data){
    const materialColor = colorRGBtoHex(data.get('materialColor').red,data.get('materialColor').green,data.get('materialColor').blue);
    const materialAlpha = (100 - data.get('materialColor').alpha * 100);

    const elevation = round(data.get('elevation'),1);
    const heightReference =  data.get('clampToGround') ? 1 : 0;

    if(heightReference){
        $('#elevation').attr("disabled",true);
        $('#elevation').css("background",'#F0F0F0');
        $('#select').find("option[value = 1]").attr("selected",true);
    }else{
        $('#elevation').attr("disabled",false);
        $('#elevation').css("background",'#FFFFFF');
        $('#select').find("option[value = 0]").attr("selected",true);
    }
    const width = data.get('width');

    $('#width').val(width);
    $('#material-color').val(materialColor);
    $('#material-alpha').val(materialAlpha);
    $('#elevation').val(elevation);
}

function point(data){
    const materialColor = colorRGBtoHex(data.get('color').red,data.get('color').green,data.get('color').blue);
    const materialAlpha = (100 - data.get('color').alpha * 100);
    const pixelSize = Number(data.get('pixelSize'));
    const elevation = round(data.get('elevation'),1);
    
    const heightReference =  data.get('heightReference');
    if(heightReference){
        $('#elevation').attr("disabled",true);
        $('#elevation').css("background",'#F0F0F0');
        $('#select').find("option[value = 1]").attr("selected",true);
    }else{
        $('#elevation').attr("disabled",false);
        $('#elevation').css("background",'#FFFFFF');
        $('#select').find("option[value = 0]").attr("selected",true);
    }

    $('#material-color').val(materialColor);
    $('#material-alpha').val(materialAlpha);
    $('#pixelSize').val(pixelSize);
    $('#elevation').val(elevation);
}

function tile(data){
    $('#subset-box').hide();
    $('#color-li').hide();
    $('#height-li').hide();
}

$('#sure').on('click', () => {
    const name = $('#name').val();
    const outlineColor = $('#outline-color').val();
    const outlineWidth = Number($('#outline-width').val());
    const outlineAlpha = (100 - Number($('#outline-alpha').val())) / 100;

    const materialColor = $('#material-color').val();
    const materialAlpha = (100 - Number($('#material-alpha').val())) / 100;

    const elevation = Number($('#elevation').val());
    const heightReference = Number($('#select').val());

    const width = Number($('#width').val());//线宽
    const pixelSize = Number($('#pixelSize').val());//点的像素大小

    const subset = Number($("input[type=radio][name=subset]:checked").val());

    const outlineRGBA = hexToRgba(outlineColor,outlineAlpha);
    const materialRGBA = hexToRgba(materialColor,materialAlpha);

    dataNew.set('name',name);
    dataNew.set('outlineRGBA',outlineRGBA);
    dataNew.set('outlineWidth',outlineWidth);
    dataNew.set('materialRGBA',materialRGBA);
    dataNew.set('elevation',elevation);
    dataNew.set('heightReference',heightReference);
    dataNew.set('width',width);
    dataNew.set('pixelSize',pixelSize);
    dataNew.set('subset',subset);
   
    ipcRenderer.send('data',{windowType ,target:'mainWindow',sendName:'nature',close:true,data: dataNew});
});

$('#apply').on('click', () => {
    const name = $('#name').val();
    const outlineColor = $('#outline-color').val();
    const outlineWidth = Number($('#outline-width').val());
    const outlineAlpha = (100 - Number($('#outline-alpha').val())) / 100;

    const materialColor = $('#material-color').val();
    const materialAlpha = (100 - Number($('#material-alpha').val())) / 100;

    const elevation = Number($('#elevation').val());
    const heightReference = Number($('#select').val());

    const width = Number($('#width').val());//线宽
    const pixelSize = Number($('#pixelSize').val());//点的像素大小

    const subset = Number($("input[type=radio][name=subset]:checked").val());

    const outlineRGBA = hexToRgba(outlineColor,outlineAlpha);
    const materialRGBA = hexToRgba(materialColor,materialAlpha);

    dataNew.set('name',name);
    dataNew.set('outlineRGBA',outlineRGBA);
    dataNew.set('outlineWidth',outlineWidth);
    dataNew.set('materialRGBA',materialRGBA);
    dataNew.set('elevation',elevation);
    dataNew.set('heightReference',heightReference);
    dataNew.set('width',width);
    dataNew.set('pixelSize',pixelSize);
    dataNew.set('subset',subset);
   
    ipcRenderer.send('data',{windowType ,target:'mainWindow',sendName:'nature',close:false,data: dataNew});
});

$('#cancel').on('click',() => {
    ipcRenderer.send('close',{windowType, close:true});
});