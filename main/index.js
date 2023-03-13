/*
 * @Version: 1.0
 * @Autor: wangrenhua
 * @Description: index js
 * @Date: 2021-08-17 11:12:21
 * @FilePath: \Cosmos\main\index.js
 * @LastEditTime: 2023-03-08 09:43:23
 */

$('#right-border').on('mousedown',function(e){
    const width = document.documentElement.clientWidth;
    document.onmousemove = function (e) {
        e.preventDefault();
        let w = e.clientX - 48;
        if(w > 250 && w < width - 500) $('#left-content-project').width(w + 'px');
    }
    document.onmouseup = function () {
        document.onmousemove = null;
        document.onmouseup = null;
    }
});

$('#bottom-border').on('mousedown',function(e){
    const oBox = document.getElementById('bottom-status');
    const y = e.clientY;
    const oBoxH = oBox.offsetHeight;
    const height = document.documentElement.clientHeight;
    document.onmousemove = function (e) {
        e.preventDefault();
        // let h = oBoxH + y - 21 - e.clientY;
        let h = oBoxH + y - e.clientY;
        if (h > 100 && h < (height - 100)) oBox.style.height = h + 'px';
    }
    document.onmouseup = function () {
        document.onmousemove = null;
        document.onmouseup = null;
    }
});

//状态栏中内容变化时，自动滚动到最底部
$('#status-content').on('DOMNodeInserted',function(e){
    $('#status-content').scrollTop($('#status-content')[0].scrollHeight);
});

import { elevationMaterial, goTargetPlace, goTargetPosition, entityPointWithLabel, entityPolyline, entityPolygon,drawPointHandler,drawPolygonHandler, drawPolylineHandler, drawSplitPolylineHandler,hintMessageHandler, cesiumMouseMoveHandler, cancelMoveScreenSpaceEventHandler, drawPolylineWithDistanceHandler, drawPolylineWithAzimuthHandler, keyboardControlHandler, cancelKeyboardControlHandler, addImageryLayer} from './code/CesiumControl.js';
import { HToAn, GetXY,GetLatLng,cartesian3ToCartographic, cartesianToCartographic,cartesianArrayToCartographicArray,degToHSM} from './code/coorTra.js';
import { createProject, openGeojson, readRangeFile, saveRangeFile, readCreateData,open3DTilesFile, storeTreeData, readTreeData} from './code/project.js';
import { compareObject, deepCopy, getLogObject, isNumber, bottomStatusContent, bottomStatusInitialize, prefixInteger, ajaxPromise} from './code/tool.js';
import { Entity, Polygon, Polyline, Point} from './code/Data.js';
import { Color, Attribute} from './code/config.js';
import { polygonClipByLine, polylineLength, polygonAcreageWithAngle, pointToBuffer, pointsToAzimuth, polylineToBezierSpline, polygonUnion} from './code/turfExtras.js';

require('jstree');
bottomStatusInitialize();

const ClipperLib = require('clipper-lib');
const { ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const store = new Store({clearInvalidConfig: true});

const loger = getLogObject('indexLoger');
const appName = "Cosmos"; //应用名称

let nodeMap = new Map();//右键节点数据

$('#jstree').jstree({
    'core' : {
        'animation' : 0,
        'themes':{
            'icons' : true,
            'theme' : 'default',
            'dots' : true,
            'ellipsis': true,
            'stripes': false
        },
        'multiple': true,
        'dblclick_toggle': false,
        'check_callback' : true,
    },
    'checkbox':{
        'whole_node': false,
        'keep_selected_style': false,
        // 'tie_selection': false //设置false后，check_node.jstree事件才能使用，但无法使用shift进行多选
    },
    'types' : {
        'project':{
            'icon':'../public/iconfont/project.png'
        },
        'entity':{
            'icon':'../public/iconfont/entity.png'
        },
        'polygon': {
            'icon': '../public/iconfont/polygon.png'
        },
        'polyline':{
            'icon':'../public/iconfont/polyline.png'
        },
        'point':{
            'icon':'../public/iconfont/point.png'
        },
        'primitive':{
            'icon':'../public/iconfont/entity.png'
        },
        'tile':{
            'icon':'../public/iconfont/model.png'
        },
    },
    'contextmenu':{
        'select_node': false,
        'items':customMenu
    },
    'plugins' : ['types','contextmenu', 'checkbox']
});

window.jsTreeObj =  $('#jstree').jstree(true);
let project = createProject("数据集");

function customMenu(item){
    // let selectNodes = window.jsTreeObj.get_selected(true);
    // console.log(selectNodes);
    nodeMap.set(item.id,item);
    switch(item.type){
        case 'project':
            ipcRenderer.send('projectMenu',{id: item.id});
            break;
        case 'entity':
            ipcRenderer.send('entityMenu',{id: item.id, name: item.original.content.name});
            break;
        case 'polygon':
            ipcRenderer.send('polygonMenu',{id: item.id, name: item.original.content.name});
            break;
        case 'polyline':
            ipcRenderer.send('polylineMenu',{id: item.id, name: item.original.content.name});
            break;
        case 'point':
            ipcRenderer.send('pointMenu',{id: item.id, name: item.original.content.name});
            break;
        case 'primitive':
            ipcRenderer.send('primitiveMenu',{id: item.id});
            break;
        case 'tile':
            ipcRenderer.send('TileMenu',{id: item.id});
            break;
        default:
            nodeMap.clear();
            break;
    }
}

//移动提示信息
hintMessageHandler(customMenu);

//复选框选中节点
$('#jstree').on('select_node.jstree',function(node,data){
    if(!data) return;
    project.show = false;
    for(let id of data.selected){
        let _node = window.jsTreeObj.get_node(id);
        if(!_node) return;
        _node.original.content.show = true;
    }
    if(Attribute.store) storeTreeData(project).catch(err => loger.error(`${err.name} : ${err.message}`));
});

//复选框取消选中
$('#jstree').on('deselect_node.jstree',function(node,data){
    if(!data) return;
    data.node.original.content.show = false;
    if(Attribute.store) storeTreeData(project).catch(err => loger.error(`${err.name} : ${err.message}`));
});

//双击鼠标左键节点去目标位置
$('#jstree').on('dblclick', function(event){
    let node = window.jsTreeObj.get_node(event.target);
    if(!node) return;
    goTargetNode(node.original.content);
});

//对数据进行初始化
ipcRenderer.on('mainWindow-ready',function(event){
    if(!Attribute.store) return;
    setTimeout(function(){
        if(store.get('ShowTerrain') !== undefined && store.get('ShowTerrain')) window.viewer.terrainProvider = window.terrainProvider;//添加地形
        if(store.get('DepthTestAgainstTerrain') !== undefined && store.get('DepthTestAgainstTerrain')) window.viewer.scene.globe.depthTestAgainstTerrain = store.get('DepthTestAgainstTerrain');
        if(store.get('ElevationMaterial') !== undefined && store.get('ElevationMaterial')) window.viewer.scene.globe.material = elevationMaterial();
        if(store.get('SkyBox') !== undefined && !store.get('SkyBox')) window.viewer.scene.skyBox.show = store.get('SkyBox'); 
        if(store.get('SkyAtmosphere') !== undefined && !store.get('SkyAtmosphere')) window.viewer.scene.skyAtmosphere.show = store.get('SkyAtmosphere'); 
        if(store.get('Sun') !== undefined && !store.get('Sun')) window.viewer.scene.sun.show = store.get('Sun');
        if(store.get('Moon') !== undefined && !store.get('Moon')) window.viewer.scene.moon.show = store.get('Moon');
        if(store.get('Compass') !== undefined && !store.get('Compass')) window.viewer.cesiumNavigation.navigationViewModel.showCompass = store.get('Compass');
        if(store.get('DistanceLegend') !== undefined && !store.get('DistanceLegend'))  window.viewer.cesiumNavigation.distanceLegendViewModel.enableDistanceLegend = store.get('DistanceLegend');
        if(store.get('StatusClose')) $('#bottom-status').show();
        if(store.get('ProjectClose') !== undefined){
            if(store.get('ProjectClose')) $('#left-content-project').show();
        }else{
            store.set('ProjectClose',false);
        }
        if(store.get('Position')){
            cesiumMouseMoveHandler(position => {
                let longitude = degToHSM(position.longitude);
                let latitude = degToHSM(position.latitude);
                if(position.latitude >= 0){
                    $('#lat').text(`${latitude.D} °${prefixInteger(latitude.M, 2)}′${prefixInteger(latitude.S,2)}″ N`);
                }else{
                    $('#lat').text(`${latitude.D} °${prefixInteger(latitude.M, 2)}′${prefixInteger(latitude.S,2)}″ S`);
                }

                if(position.longitude >= 0){
                    $('#lng').text(`${longitude.D} °${prefixInteger(longitude.M, 2)}′${prefixInteger(longitude.S,2)}″ E`);
                }else{
                    $('#lng').text(`${longitude.D} °${prefixInteger(longitude.M, 2)}′${prefixInteger(longitude.S,2)}″ W`);
                }
                $('#alt').text(`海拔高度:${position.height.toFixed(1)} m`);
            })
        }else{
            cancelMoveScreenSpaceEventHandler();
            $('#lng').text(null);
            $('#lat').text(null);
            $('#alt').text(null);
        }

        readTreeData(project).then(() => {
            $('#left-content-project').show();
            store.set('ProjectClose',true);
            storeTreeData(project).catch(err => loger.error(`${err.name} : ${err.message}`));
        }).catch(err => {
            store.delete('tree');
            if(err && err.name !== "storeError") loger.error(`${err.name} : ${err.message}`);
        });
    },500);
});

//存在新版本
ipcRenderer.on('updater-update-available', function(event,arg) {
    ipcRenderer.send('createChildWindow',{
        main: 'mainWindow',
        type:'updateWindow',
        options:{
            title: `${appName} 更新`,
            width: 400,
            height: 260,
            parent: 'mainWindow',
            modal: true,
            resizable: false,
            minimizable: false,
            maximizable: false,
        },
        url:'page/update/update.html',
        data: arg
    });
});

//新版本下载进度
ipcRenderer.on('updater-download-progress', function(event,arg) {
    let progress = arg.percent;
    let speed = arg.bytesPerSecond;
    ipcRenderer.send('data',{target:'updateWindow',sendName:'progress',data:{progress, speed}});
});

//设置天地图影像
ipcRenderer.on('setTiandituImgWHandler',(event,arg) => {
    if(arg.maximumLevel === 0){
        window.viewer.imageryLayers.remove(window.tianditu.TiandituImgW);
    }else{
        window.viewer.imageryLayers.remove(window.tianditu.TiandituImgW);
        window.tianditu.TiandituImgW = addImageryLayer(window.tiandituURL.TiandituImgWURL, ['0','1','2','3','4','5','6','7'], arg.maximumLevel, 0);
    }

    if(Attribute.store) store.set('TiandituImgW',arg.maximumLevel);
});

//设置天地图矢量
ipcRenderer.on('setTiandituVecWHandler',(event,arg) => {
    if(arg.maximumLevel === 0){
        window.viewer.imageryLayers.remove(window.tianditu.TiandituVecW);
    }else{
        window.viewer.imageryLayers.remove(window.tianditu.TiandituVecW);
        window.tianditu.TiandituVecW = addImageryLayer(window.tiandituURL.TiandituVecWURL, ['0','1','2','3','4','5','6','7'], arg.maximumLevel, 5);
    }

    if(Attribute.store) store.set('TiandituVecW' ,arg.maximumLevel);
});

//地形晕渲图
ipcRenderer.on('setTiandituTerWHandler',(event,arg) => {
    if(arg.maximumLevel === 0){
        window.viewer.imageryLayers.remove(window.tianditu.TiandituTerW);
    }else{
        window.viewer.imageryLayers.remove(window.tianditu.TiandituTerW);
        window.tianditu.TiandituTerW = addImageryLayer(window.tiandituURL.TiandituTerWURL, ['0','1','2','3','4','5','6','7'], arg.maximumLevel, 10);
    }
    if(Attribute.store) store.set('TiandituTerW', arg.maximumLevel);
});

//设置天地图国界
ipcRenderer.on('setTiandituIboWHandler',(event,arg) => {
    if(arg.maximumLevel === 0){
        window.viewer.imageryLayers.remove(window.tianditu.TiandituIboW);
    }else{
        window.viewer.imageryLayers.remove(window.tianditu.TiandituIboW);
        window.tianditu.TiandituIboW = addImageryLayer(window.tiandituURL.TiandituIboWURL, ['0','1','2','3','4','5','6','7'], arg.maximumLevel, 20);
    }
    if(Attribute.store) store.set('TiandituIboW', arg.maximumLevel);
});

//设置天地图注记
ipcRenderer.on('setTiandituCvaWHandler',(event,arg) => {
    if(arg.maximumLevel === 0){
        window.viewer.imageryLayers.remove(window.tianditu.TiandituCvaW);
    }else{
        window.viewer.imageryLayers.remove(window.tianditu.TiandituCvaW);
        window.tianditu.TiandituCvaW = addImageryLayer(window.tiandituURL.TiandituCvaWURL, ['0','1','2','3','4','5','6','7'], arg.maximumLevel, 30);
    }
    if(Attribute.store) store.set('TiandituCvaW', arg.maximumLevel);
});

//设置天地图道路网
ipcRenderer.on('setTiandituCiaWHandler',(event,arg) => {
    if(arg.maximumLevel === 0){
        window.viewer.imageryLayers.remove(window.tianditu.TiandituCiaW);
    }else{
        window.viewer.imageryLayers.remove(window.tianditu.TiandituCiaW);
        window.tianditu.TiandituCiaW = addImageryLayer(window.tiandituURL.TiandituCiaWURL, ['0','1','2','3','4','5','6','7'], arg.maximumLevel, 40);
    }
    if(Attribute.store) store.set('TiandituCiaW', arg.maximumLevel);
});

//设置星图地球影像
ipcRenderer.on('setGeovisearthImgWHandler',(event,arg) => {
    if(arg.maximumLevel === 0){
        window.viewer.imageryLayers.remove(window.geovisearth.GeovisearthImgW);
    }else{
        window.viewer.imageryLayers.remove(window.geovisearth.GeovisearthImgW);
        window.geovisearth.GeovisearthImgW = addImageryLayer(window.geovisearthURL.GeovisearthImgWURL, ['1','2','3'], arg.maximumLevel, 0);
    }
    if(Attribute.store) store.set('GeovisearthImgW', arg.maximumLevel);
});

//设置星图地球矢量
ipcRenderer.on('setGeovisearthVecWHandler',(event,arg) => {
    if(arg.maximumLevel === 0){
        window.viewer.imageryLayers.remove(window.geovisearth.GeovisearthVecW);
    }else{
        window.viewer.imageryLayers.remove(window.geovisearth.GeovisearthVecW);
        window.geovisearth.GeovisearthVecW = addImageryLayer(window.geovisearthURL.GeovisearthVecWURL, ['1','2','3'], arg.maximumLevel, 5);
    }
    if(Attribute.store) store.set('GeovisearthVecW', arg.maximumLevel);
});

//星图地球地形晕渲图
ipcRenderer.on('setGeovisearthTerWHandler',(event,arg) => {
    if(arg.maximumLevel === 0){
        window.viewer.imageryLayers.remove(window.geovisearth.GeovisearthTerW);
    }else{
        window.viewer.imageryLayers.remove(window.geovisearth.GeovisearthTerW);
        window.geovisearth.GeovisearthTerW = addImageryLayer(window.geovisearthURL.GeovisearthTerWURL, ['1','2','3'], arg.maximumLevel, 10);
    }
    if(Attribute.store) store.set('GeovisearthTerW', arg.maximumLevel);
});

//星图地球地形道路网
ipcRenderer.on('setGeovisearthCiaWHandler',(event,arg) => {
    if(arg.maximumLevel === 0){
        window.viewer.imageryLayers.remove(window.geovisearth.GeovisearthCiaW);
    }else{
        window.viewer.imageryLayers.remove(window.geovisearth.GeovisearthCiaW);
        window.geovisearth.GeovisearthCiaW = addImageryLayer(window.geovisearthURL.GeovisearthCiaWURL, ['1','2','3'], arg.maximumLevel, 40);
    }
    if(Attribute.store) store.set('GeovisearthCiaW', arg.maximumLevel);
});

//设置离线地形
ipcRenderer.on('setOfflineTerrainHandler',async (event,arg) => {
    try{
        let terrainProvider = new Cesium.CesiumTerrainProvider({url: `file:///${arg.filePaths[0]}`});
        terrainProvider.errorEvent.addEventListener(err => {
            bottomStatusContent('error','设置离线地形数据失败【' + arg.filePaths[0] +'】');
            loger.error(`${err.message}`);
        });

        let ready = await terrainProvider.readyPromise;
        if(ready){
            window.terrain.offlineTerrainProvider = terrainProvider
            window.terrainProvider = window.terrain.offlineTerrainProvider;
            let store = new Store({clearInvalidConfig: true});
            store.set('config.attribute.terrainProvider', `${arg.filePaths[0]}`);
            bottomStatusContent('default','设置离线地形数据完成【' + arg.filePaths[0] +'】');
        } 
    }catch(err){
        bottomStatusContent('error','设置离线地形数据失败【' + arg.filePaths[0] +'】');    
        loger.error(`${err.name} : ${err.message}`);
    }
});

//隐藏三维地形
ipcRenderer.on('setHideTerrainHandler',(event,arg) => {
    window.viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider({});//删除地形
    if(Attribute.store) {
        store.set('HideTerrain', true);
        store.set('ShowTerrain', false);
    }
});

//显示三维地形
ipcRenderer.on('setShowTerrainHandler',(event,arg) => {
    window.viewer.terrainProvider = window.terrainProvider;//添加地形
    if(Attribute.store) {
        store.set('HideTerrain', false);
        store.set('ShowTerrain', true);
    }
});

//设置地形遮挡
ipcRenderer.on('setDepthTestAgainstTerrainHandler', (event,arg) => {
    window.viewer.scene.globe.depthTestAgainstTerrain = arg.checked; 
    if(Attribute.store) store.set('DepthTestAgainstTerrain', arg.checked);
});

//设置高程坡度图
ipcRenderer.on('setElevationMaterialHandler',(event,arg) => {
    if(arg.checked){
        window.viewer.scene.globe.material = elevationMaterial();
    }else{
        window.viewer.scene.globe.material = null;
    }
    if(Attribute.store) store.set('ElevationMaterial', arg.checked);
});

//设置天空盒
ipcRenderer.on('setSkyBoxHandler', (event,arg) => {
    if(!window.viewer.scene.skyBox) return;
    window.viewer.scene.skyBox.show = arg.checked;
    if(Attribute.store) store.set('SkyBox', arg.checked);
});

//设置大气层
ipcRenderer.on('setSkyAtmosphereHandler', (event,arg) => {
    if(!window.viewer.scene.skyAtmosphere) return;
    window.viewer.scene.skyAtmosphere.show = arg.checked;
    if(Attribute.store) store.set('SkyAtmosphere', arg.checked);
});

//设置太阳
ipcRenderer.on('setSunHandler',(event,arg) => {
    if(!window.viewer.scene.sun) return;
    window.viewer.scene.sun.show = arg.checked;
    if(Attribute.store) store.set('Sun', arg.checked);
});

//设置月亮
ipcRenderer.on('setMoonHandler',(event,arg) => {
    if(!window.viewer.scene.moon) return;
    window.viewer.scene.moon.show = arg.checked;
    if(Attribute.store) store.set('Moon', arg.checked);
});

//设置罗盘
ipcRenderer.on('setCompassHandler',(event,arg) => {
    window.viewer.cesiumNavigation.navigationViewModel.showCompass = arg.checked;
    if(Attribute.store) store.set('Compass', arg.checked);
});

//设置比例尺
ipcRenderer.on('setDistanceLegendHandler',(event,arg) => {
    window.viewer.cesiumNavigation.distanceLegendViewModel.enableDistanceLegend = arg.checked;
    if(Attribute.store) store.set('DistanceLegend', arg.checked);
});

//设置位置信息
ipcRenderer.on('setPositionHandler',(event,arg) => {
    if(arg.checked){
        cesiumMouseMoveHandler(position => {
            let longitude = degToHSM(position.longitude);
            let latitude = degToHSM(position.latitude);
            if(position.latitude >= 0){
                $('#lat').text(`${latitude.D} °${prefixInteger(latitude.M, 2)}′${prefixInteger(latitude.S,2)}″ N`);
            }else{
                $('#lat').text(`${latitude.D} °${prefixInteger(latitude.M, 2)}′${prefixInteger(latitude.S,2)}″ S`);
            }

            if(position.longitude >= 0){
                $('#lng').text(`${longitude.D} °${prefixInteger(longitude.M, 2)}′${prefixInteger(longitude.S,2)}″ E`);
            }else{
                $('#lng').text(`${longitude.D} °${prefixInteger(longitude.M, 2)}′${prefixInteger(longitude.S,2)}″ W`);
            }
            $('#alt').text(`海拔高度:${position.height.toFixed(1)} m`);
        })
    }else{
        cancelMoveScreenSpaceEventHandler();
        $('#lng').text(null);
        $('#lat').text(null);
        $('#alt').text(null);
    }
    if(Attribute.store) store.set('Position', arg.checked);
});

//绘制线段得到距离
ipcRenderer.on('measuringDistanceHandler',ruler);

//绘制线段得到距离
$('#ruler').on('click', ruler);

//测量距离
function ruler(){
    let cursor = $('#cesiumContainer').css('cursor');
    if(cursor === 'crosshair') {
        bottomStatusContent('warning','目前处于绘图状态，请先结束绘图');
        return;
    }
    $('#cesiumContainer').css('cursor','crosshair');
    drawPolylineWithDistanceHandler(polylineData => {
        $('#cesiumContainer').css('cursor','default');
        if(!polylineData){
            bottomStatusContent('error','绘制自定义多段线区域错误');
            return;
        }
        let entityData = null;
        for(let i = 0; i < project.dataPool.length; i++){
            if(project.dataPool[i].origin === 'custom') entityData = project.dataPool[i];
        }

        if(!entityData){
            entityData = new Entity("自定义区域",project,'custom');
           
            entityData.createNode();
            project.dataPool.push(entityData);
        }
       
        polylineData.parent = entityData;
        polylineData.createNode();
        entityData.entitys.push(polylineData);
        $('#left-content-project').show();
        if(Attribute.store) store.set('ProjectClose',true);
        bottomStatusContent('default',`添加自定义多段线区域【${polylineData.name}】`);
        if(Attribute.store) storeTreeData(project).catch(err => loger.error(`${err.name} : ${err.message}`));
    });
}

//绘制线段计算坐标方位角
ipcRenderer.on('measuringAzimuthHandler',(event,arg) => {
    let cursor = $('#cesiumContainer').css('cursor');
    if(cursor === 'crosshair') {
        bottomStatusContent('warning','目前处于绘图状态，请先结束绘图');
        return;
    }
    $('#cesiumContainer').css('cursor','crosshair');
    drawPolylineWithAzimuthHandler(polylineData => {
        $('#cesiumContainer').css('cursor','default');
        if(!polylineData){
            bottomStatusContent('error','绘制自定义多段线区域错误');
            return;
        }
        let entityData = null;
        for(let i = 0; i < project.dataPool.length; i++){
            if(project.dataPool[i].origin === 'custom') entityData = project.dataPool[i];
        }

        if(!entityData){
            entityData = new Entity("自定义区域",project,'custom');
           
            entityData.createNode();
            project.dataPool.push(entityData);
        }
       
        polylineData.parent = entityData;
        polylineData.createNode();
        entityData.entitys.push(polylineData);
        $('#left-content-project').show();
        if(Attribute.store) store.set('ProjectClose',true);
        bottomStatusContent('default',`添加自定义多段线区域【${polylineData.name}】`);
        if(Attribute.store) storeTreeData(project).catch(err => loger.error(`${err.name} : ${err.message}`));
    });
});

//键盘控制
ipcRenderer.on('keyboardControlHandler',(event,arg) => {
    function getFlagForKeyCode(keyCode) {
        switch (keyCode) {
            case 'KeyQ':
                return 'moveBackward';//后退
            case 'KeyE':
                return 'moveForward';//前进
            case 'KeyW':
                return 'moveUp';//上移
            case 'KeyS':
                return 'moveDown';//下移
            case 'KeyD':
                return 'moveRight';//右移
            case 'KeyA':
                return 'moveLeft';//左移
            case 'ArrowUp':
                return 'moveUp';//上移
            case 'ArrowDown':
                return 'moveDown';//下移
            case 'ArrowRight':
                return 'moveRight';//右移
            case 'ArrowLeft':
                return 'moveLeft';//左移
            default:
                return null;
        }
    }

    if(arg.checked){
        let flags = {
            looking: false,
            moveForward: false,
            moveBackward: false,
            moveUp: false,
            moveDown: false,
            moveLeft: false,
            moveRight: false
        };
        $(document).on('keydown',function(event){
            const flagName = getFlagForKeyCode(event.code);
            if (flagName !== null) flags[flagName] = true;
        });
        $(document).on('keyup',function(event){
            const flagName = getFlagForKeyCode(event.code);
            if (flagName !== null) flags[flagName] = false;
        });
        keyboardControlHandler(flags);
    }else{
        $(document).off('keydown');
        $(document).off('keyup');
        cancelKeyboardControlHandler();
    }
});

//去目标节点位置
function goTargetNode(data){
    if(!data) return;
    if(data.entitys){
        let entitys = new Array();
        data.entitys.forEach(item => entitys.push(item.entity));
        goTargetPlace(entitys);
    }else if(data.primitives){
        if(data.primitives.length > 0) goTargetPlace(data.primitives[0].primitive);
    }else if(data.entity){
        goTargetPlace(data.entity);
    }else if(data.primitive){
        goTargetPlace(data.primitive);
    }else{
        return;
    } 
}

//导入文件
ipcRenderer.on('importFileHandler', (event,result) => openFiles(result.filePaths));

//主界面拖拽事件
$('#main').on('drop', (event) => {
    event.originalEvent.preventDefault(); //阻止默认行为
    const files = event.originalEvent.dataTransfer.files;
    let filePaths = [];
    for(let i = 0; i < files.length; i++) filePaths.push(files[i].path);
    openFiles(filePaths);
});

//阻止浏览器打开文件后的默认行为
$('#main').on('dragover', (event) => event.originalEvent.preventDefault());

//打开文件
function openFiles(filePaths){
    for(let i = 0; i < filePaths.length; i++){
        let extname = path.extname(filePaths[i]);
        if(
            extname === '.kml' || 
            extname === '.kmz' || 
            extname === '.Kml' || 
            extname === '.Kmz' || 
            extname === '.KML' || 
            extname === '.KMZ' || 
            extname === '.geojson' || 
            extname === '.geoJson' || 
            extname === '.topojson' || 
            extname === '.json' || 
            extname === '.shp' ||
            extname === '.GPX' ||
            extname === '.Gpx' ||
            extname === '.gpx' ||
            extname === '.TCX' ||
            extname === '.Tcx' ||
            extname === '.tcx'
            ){
            readRangeFile(project, filePaths[i]).then((entityData) => {
                let entitys = new Array();
                entityData.entitys.forEach(item => entitys.push(item.entity))
                if(entitys.length > 0) goTargetPlace(entitys);
                $('#left-content-project').show();
                if(Attribute.store) store.set('ProjectClose',true);
                bottomStatusContent('default',`打开文件完成【${filePaths[i]}】`);
                if(Attribute.store) storeTreeData(project).catch(err => loger.error(`${err.name} : ${err.message}`));
            }).catch(err => {
                bottomStatusContent('error',`打开文件失败【${filePaths[i]}】`);
                loger.error(`${err.name} : ${err.message}`);
            })
        }else{
            bottomStatusContent('error',`打开文件失败，不支持此文件类型【${filePaths[i]}】`);
            loger.error(`打开文件失败，不支持此文件类型【${filePaths[i]}】`);
        }
    }
}

$('#openProject').on('click', () => ipcRenderer.send('importFile'));

//自定义矢量图形
ipcRenderer.on('customHandler', (event,arg) => {
    ipcRenderer.send('createChildWindow',{
        main: 'mainWindow',
        type:'customWindow',
        options:{
            title: "自定义矢量图形",
            width: 680,
            height: 590,
            parent: 'mainWindow',
            modal: true,
            resizable: false,
            minimizable: false,
            maximizable: false,
        },
        url:'page/custom/custom.html',
        data:null
    });
});

//加载自定义数据
ipcRenderer.on('custom',(event, data) => {
    try{
        const name = data.name;
        const type = data.type;
        const idPosition = data.tableHead.indexOf(1);
        const lngPosition = data.tableHead.indexOf(2);
        const latPosition = data.tableHead.indexOf(3);
        const heightPosition = data.tableHead.indexOf(4);
    
        if(data.tableData.length <= 0){
            bottomStatusContent('warning','缺少数据项');
            return;
        }
        if(lngPosition === -1 || latPosition === -1){
            bottomStatusContent('warning','缺少必要数据项类型');
            return;
        }
        let entityData = new Entity(name, project);
        entityData.createNode();
    
        if(type === 0){
            for(let i = 0;i < data.tableData.length;i++){
                let height = 0;
                let pointName = `未知点#${i + 1}`;
                if(idPosition !== -1) pointName = data.tableData[i][idPosition];
                if(heightPosition !== -1) height = Number(data.tableData[i][heightPosition]);
                if(!isNumber(Number(data.tableData[i][lngPosition])) || !isNumber(Number(data.tableData[i][latPosition])) || !isNumber(height)){
                    project.dataPool.push(entityData);
                    bottomStatusContent('error',`数据类型错误【${pointName}】`);
                    continue;
                }

                let position = Cesium.Cartesian3.fromDegrees(Number(data.tableData[i][lngPosition]), Number(data.tableData[i][latPosition]), height);
                if(Cesium.defined(position)){
                    let point = entityPointWithLabel(pointName, Color.pointColor, 20, position);
                    let pointData = new Point(pointName, point);
                    point.description = pointData;
                    
                    pointData.parent = entityData;
                    pointData.createNode();
                    entityData.entitys.push(pointData);
                }
            }
        }else if(type === 1){
            let positions = [];
            for(let i = 0;i < data.tableData.length;i++){
                let height = 0;
                if(heightPosition !== -1) height = Number(data.tableData[i][heightPosition]);
                if(!isNumber(Number(data.tableData[i][lngPosition])) || !isNumber(Number(data.tableData[i][latPosition])) || !isNumber(height)){
                    project.dataPool.push(entityData);
                    bottomStatusContent('error',`数据类型错误【${i + 1}】`);
                    continue;
                }
                let position = Cesium.Cartesian3.fromDegrees(Number(data.tableData[i][lngPosition]), Number(data.tableData[i][latPosition]), height);
                if(Cesium.defined(position)) positions.push(position);
            }
            if(positions.length < 2){
                project.dataPool.push(entityData);
                bottomStatusContent('error','数据错误，有效数据少于2项');
                return;
            }
            
            let polyline = entityPolyline('未知多段线', Color.polylineColor, positions);
            let polylineData = new Polyline('未知多段线',polyline);
            polyline.description = polylineData;
    
            let polylinePosition = []; 
            polyline.polyline.positions.getValue().forEach(point => {
              let LatLng = cartesian3ToCartographic(point);
              polylinePosition.push(LatLng);
            });
            polylineData.length = polylineLength(polylinePosition);
            
            polylineData.parent = entityData;
            polylineData.createNode();
            entityData.entitys.push(polylineData);
        }else if(type === 2){
            let positions = [];
            for(let i = 0;i < data.tableData.length;i++){
                let height = 0;
                if(heightPosition !== -1) height = Number(data.tableData[i][heightPosition]);
                if(!isNumber(Number(data.tableData[i][lngPosition])) || !isNumber(Number(data.tableData[i][latPosition])) || !isNumber(height)){
                    project.dataPool.push(entityData);
                    bottomStatusContent('error',`数据类型错误【${i + 1}】`);
                    continue;
                }
                let position = Cesium.Cartesian3.fromDegrees(Number(data.tableData[i][lngPosition]), Number(data.tableData[i][latPosition]), height);
                if(Cesium.defined(position)) positions.push(position);
            }
            if(positions.length < 3){
                project.dataPool.push(entityData);
                bottomStatusContent('error','数据错误，有效数据少于3项');
                return;
            }
    
            let polygon = entityPolygon('未知多边形', Color.polygonColor,Color.polylineColor,0,positions,null);
            let polygonData = new Polygon('未知多边形',polygon);
            polygon.description = polygonData;
    
            let polygonPosition = []; 
            polygon.polygon.hierarchy.getValue().positions.forEach(point => {
              let LatLng = cartesian3ToCartographic(point);
              polygonPosition.push([LatLng.lng, LatLng.lat]);
            })
            if(!compareObject(polygonPosition[0],polygonPosition[polygonPosition.length - 1])) polygonPosition.push(polygonPosition[0]); 
            polygonData.acreage = polygonAcreageWithAngle(polygonPosition);
            
            polygonData.parent = entityData;
            polygonData.createNode();

            entityData.entitys.push(polygonData);
        }

        project.dataPool.push(entityData);
        let entitys = new Array();
        entityData.entitys.forEach(item => entitys.push(item.entity))
        if(entitys.length > 0) goTargetPlace(entitys);
        $('#left-content-project').show();
        if(Attribute.store) store.set('ProjectClose',true);
        bottomStatusContent('default',`加载自定义矢量图形数据完成【${name}】`);
        if(Attribute.store) storeTreeData(project).catch(err => loger.error(`${err.name} : ${err.message}`));
    }catch(err){
        bottomStatusContent('error',`加载自定义矢量图形数据失败`);
        loger.error(`${err.name} : ${err.message}`);
    }
});

//打开3DTiles文件数据
ipcRenderer.on('set3DTilesHandler',(event,result) => {
    let tilesPath = result.filePaths[0];
    let pathAll = fs.readdirSync(tilesPath);
    let json = pathAll.find(item => path.extname(item) === '.json');
    if(!json){
        bottomStatusContent('warning','缺少必要的json文件');
        return;
    }
    let jsonPath = `${tilesPath}\\${json}`.split(path.sep).join('/');
    open3DTilesFile(project, jsonPath).then((primitiveData) => {
        if(primitiveData.primitives.length > 0) goTargetPlace(primitiveData.primitives[0].primitive);
        $('#left-content-project').show();
        if(Attribute.store) store.set('ProjectClose',true);
        bottomStatusContent('default',`打开3DTiles数据完成【${tilesPath}】`);
        if(Attribute.store) storeTreeData(project).catch(err => loger.error(`${err.name} : ${err.message}`));
    }).catch(err => {
        bottomStatusContent('error',`打开3DTiles数据失败【${tilesPath}】`);
        loger.error(`${err.name} : ${err.message}`);
    })
});

//清除数据集
ipcRenderer.on('clearProject',(event,arg) => {
    let node = nodeMap.get(arg.id);
    if(!node) return;
    if(window.jsTreeObj.delete_node(node)){
        for(let _data of project.dataPool){
            if(_data.type === "entity"){
                _data.entitys.forEach(item => window.viewer.entities.remove(item.entity));
            }else if(_data.type === "primitive"){
                _data.primitives.forEach(item => window.viewer.scene.primitives.remove(item.primitive));
            }
        }
        project = createProject("数据集");
        bottomStatusContent('default',`清除完成【${node.original.content.name}】`);
        if(Attribute.store) storeTreeData(project).catch(err => loger.error(`${err.name} : ${err.message}`));
    }else{
        bottomStatusContent('error',`清除失败【${node.original.content.name}】`);
    }
});

//绘制点
$('#point').on('click', drawPoint);

//绘制多边形
$('#polygon').on('click', drawPolygon);

//绘制多段线
$('#polyline').on('click', drawPolyline);

//绘制点
ipcRenderer.on('pointHandler',drawPoint);

//绘制多边形
ipcRenderer.on('polygonHandler',drawPolygon);

//绘制多段线
ipcRenderer.on('polylineHandler',drawPolyline);

//绘制点
function drawPoint(){
    let cursor = $('#cesiumContainer').css('cursor');
    if(cursor === 'crosshair') {
        bottomStatusContent('warning','目前处于绘图状态，请先结束绘图');
        return;
    }
    $('#cesiumContainer').css('cursor','crosshair');

    drawPointHandler(pointData => {
        if(!pointData){
            bottomStatusContent('error','绘制自定义位置错误');
            return;
        }
        let entityData = null;
        for(let i = 0; i < project.dataPool.length; i++){
            if(project.dataPool[i].origin === 'custom') entityData = project.dataPool[i];
        }

        if(!entityData){
            entityData = new Entity("自定义区域",project,'custom');
            entityData.createNode();
            project.dataPool.push(entityData);
        }
        
        pointData.parent = entityData;
        pointData.createNode();

        entityData.entitys.push(pointData);
        $('#left-content-project').show();
        if(Attribute.store) store.set('ProjectClose',true);
        bottomStatusContent('default',`添加自定义位置【${pointData.name}】`);
        if(Attribute.store) storeTreeData(project).catch(err => loger.error(`${err.name} : ${err.message}`));
    },() => $('#cesiumContainer').css('cursor','default'));
}

//绘制多边形
function drawPolygon(){
    let cursor = $('#cesiumContainer').css('cursor');
    if(cursor === 'crosshair') {
        bottomStatusContent('warning','目前处于绘图状态，请先结束绘图');
        return;
    }
    $('#cesiumContainer').css('cursor','crosshair');

    drawPolygonHandler(polygonData => {
        $('#cesiumContainer').css('cursor','default');
        if(!polygonData){
            bottomStatusContent('error','绘制自定义多边形区域错误');
            return;
        }
        let entityData = null;
        for(let i = 0; i < project.dataPool.length; i++){
            if(project.dataPool[i].origin === 'custom') entityData = project.dataPool[i];
        }

        if(!entityData){
            entityData = new Entity("自定义区域",project,'custom');
            entityData.createNode();
            project.dataPool.push(entityData);
        }
        
        polygonData.parent = entityData;
        polygonData.createNode();
        entityData.entitys.push(polygonData);
        $('#left-content-project').show();
        if(Attribute.store) store.set('ProjectClose',true);
        bottomStatusContent('default',`添加自定义多边形区域【${polygonData.name}】`);
        if(Attribute.store) storeTreeData(project).catch(err => loger.error(`${err.name} : ${err.message}`));
    });
}

//绘制多段线
function drawPolyline(){
    let cursor = $('#cesiumContainer').css('cursor');
    if(cursor === 'crosshair') {
        bottomStatusContent('warning','目前处于绘图状态，请先结束绘图');
        return;
    }
    $('#cesiumContainer').css('cursor','crosshair');

    drawPolylineHandler(polylineData => {
        $('#cesiumContainer').css('cursor','default');
        if(!polylineData){
            bottomStatusContent('error','绘制自定义多段线区域错误');
            return;
        }
        let entityData = null;
        for(let i = 0; i < project.dataPool.length; i++){
            if(project.dataPool[i].origin === 'custom') entityData = project.dataPool[i];
        }

        if(!entityData){
            entityData = new Entity("自定义区域",project,'custom');
           
            entityData.createNode();
            project.dataPool.push(entityData);
        }
       
        polylineData.parent = entityData;
        polylineData.createNode();
        entityData.entitys.push(polylineData);
        $('#left-content-project').show();
        if(Attribute.store) store.set('ProjectClose',true);
        bottomStatusContent('default',`添加自定义多段线区域【${polylineData.name}】`);
        if(Attribute.store) storeTreeData(project).catch(err => loger.error(`${err.name} : ${err.message}`));
    })
}

//重命名实体集合数据
ipcRenderer.on('reEntitysName',(event,arg) => {
    let node = nodeMap.get(arg.id);
    if(!node) return;
    window.jsTreeObj.edit(node,node.text, newNode => {
        node.original.content.name = newNode.text;
        bottomStatusContent('default',`重命名数据【${newNode.text}】`);
        if(Attribute.store) storeTreeData(project).catch(err => loger.error(`${err.name} : ${err.message}`));
    });
});

//飞去实体集合数据位置
ipcRenderer.on('goTargetEntitys',(event,arg) => {
    let node = nodeMap.get(arg.id);
    if(!node) return;
    goTargetNode(node.original.content);
    // let entitys = new Array();
    // node.original.content.entitys.forEach(item => entitys.push(item.entity));
    // goTargetPlace(entitys);
});

//显示实体集合数据
ipcRenderer.on('showEntitys',(event,arg) => {
    let node = nodeMap.get(arg.id);
    if(!node) return;
    node.original.content.show = true;
    node.original.content.selectedNode(true);
    if(Attribute.store) storeTreeData(project).catch(err => loger.error(`${err.name} : ${err.message}`));
});

//隐藏实体集合数据
ipcRenderer.on('hideEntitys',(event,arg) => {
    let node = nodeMap.get(arg.id);
    if(!node) return;
    node.original.content.show = false;
    node.original.content.selectedNode(false);
    if(Attribute.store) storeTreeData(project).catch(err => loger.error(`${err.name} : ${err.message}`));
});

//删除实体集合数据
ipcRenderer.on('deleteEntitys',(event,arg) => {
    let node = nodeMap.get(arg.id);
    if(!node) return;
    let parent = node.original.content.parent;
    let index = parent.dataPool.indexOf(node.original.content);
    let data = parent.dataPool.splice(index, 1)[0];
    if(window.jsTreeObj.delete_node(node)){
        data.entitys.forEach(item => window.viewer.entities.remove(item.entity));
        bottomStatusContent('default',`删除完成【${node.original.content.name}】`);
        if(Attribute.store) storeTreeData(project).catch(err => loger.error(`${err.name} : ${err.message}`));
    }else{
        bottomStatusContent('error',`删除失败【${node.original.content.name}】`);
    }
});

//去目标区域
ipcRenderer.on('goTargetPlace', (event, arg) => {
    let node = nodeMap.get(arg.id);
    if(!node) return;
    goTargetNode(node.original.content);
});

//保存区域
ipcRenderer.on('saveFile',(event,arg) => {
    let node = nodeMap.get(arg.id);
    if(!node) return;
    let data = new Array();
    if(node.type === 'entity'){
        for(let item of node.original.content.entitys) data.push(item.entity);
    }else{
        data.push(node.original.content.entity);
    }
    saveRangeFile(arg.filePath,data).then(() => {
        bottomStatusContent('default',`保存完成【${arg.filePath}】`);
    }).catch((err) => {
        bottomStatusContent('error',`保存失败【${arg.filePath}】`);
        loger.error(`${err.name} : ${err.message}`);
    })
    // let extname = path.extname(arg.filePath);
    // if(extname === '.kml'){
    //     exportKmlOrKmz(false, data).then(result => {
    //         fs.writeFileSync(arg.filePath, result.kml);
    //         bottomStatusContent('default',`保存完成【${arg.filePath}】`);
    //     }).catch(err => {
    //         bottomStatusContent('error',`保存失败【${arg.filePath}】`);
    //         loger.error(`${err.name} : ${err.message}`);
    //     })
    // }else if(extname === '.kmz'){
    //     exportKmlOrKmz(true, data).then(result => {
    //         result.kmz.arrayBuffer().then(dataBuffer => {
    //             const buffer = Buffer.from(dataBuffer);
    //             fs.writeFileSync(arg.filePath ,buffer);
    //             bottomStatusContent('default',`保存完成【${arg.filePath}】`);
    //         }).catch(err => {
    //             bottomStatusContent('error',`保存失败【${arg.filePath}】`);
    //             loger.error(`${err.name} : ${err.message}`);
    //         })
    //     }).catch(err =>{
    //         bottomStatusContent('error',`保存失败【${arg.filePath}】`);
    //         loger.error(`${err.name} : ${err.message}`);
    //     })
    // }
});

//重命名
ipcRenderer.on('rePlaceName', (event,arg) => {
    let node = nodeMap.get(arg.id);
    if(!node) return;
    window.jsTreeObj.edit(node,node.text,newNode => {
        node.original.content.name = newNode.text;
        if(node.original.content.entity) node.original.content.entity.name = newNode.text;
        if(node.original.content.entity.label) node.original.content.entity.label.text = newNode.text
        bottomStatusContent('default',`重命名【${newNode.text}】`);
        if(Attribute.store) storeTreeData(project).catch(err => loger.error(`${err.name} : ${err.message}`));
    });
});

//缓冲区域
ipcRenderer.on('expendEntity',(event, arg) => {
    const shape = nodeMap.get(arg.id).original.content;
    if(!shape) return;
    ipcRenderer.send('createChildWindow',{
        main: 'mainWindow',
        type:'expendShapeWindow',
        options:{
            title: "缓冲区 [" + shape.name + "]",
            width: 330,
            height: 160,
            parent: 'mainWindow',
            modal: true,
            resizable: false,
            minimizable: false,
            maximizable: false,
            type: 'toolbar',
        },
        url:'page/expend/expend.html',
        data:{id: arg.id, type: shape.type}
    });
});

//缓冲区域执行
ipcRenderer.on('expend',async (event, data) => {
    if(data.length === 0){
        bottomStatusContent('warning','距离无效');
        return;
    }
    let shape = nodeMap.get(data.id).original.content;
    try{
        if(shape.type === 'point'){
            let parent = shape.parent;
            let LatLng = cartesian3ToCartographic(shape.entity.position.getValue());
            let pointBuffer = pointToBuffer(LatLng, data.length);
            let entitys = await openGeojson(pointBuffer);
            for(let i = 0;i < entitys.length;i++){
                entitys[i].parent = undefined;
                entitys[i].properties = undefined;
                entitys[i].box = undefined;
                entitys[i].corridor = undefined;
                entitys[i].cylinder = undefined;
                entitys[i].ellipse = undefined;
                entitys[i].ellipsoid = undefined;
                entitys[i].model = undefined;
                entitys[i].path = undefined;
                entitys[i].plane = undefined;
                entitys[i].polylineVolume = undefined;
                entitys[i].rectangle = undefined;
                entitys[i].wall = undefined;

                if(entitys[i].polygon){
                    entitys[i].name = `${shape.name}[缓冲区${data.length}千米]`;
                    entitys[i].polygon.material = Color.polygonColor;
                    entitys[i].polygon.outlineColor = Color.polylineColor;
                    let polygon = window.viewer.entities.add(entitys[i]);
                    let polygonData = new Polygon(polygon.name, polygon, parent);
                    polygon.description = polygonData;
    
                    let polygonPosition = []; 
                    polygon.polygon.hierarchy.getValue().positions.forEach(point => {
                        let LatLng = cartesian3ToCartographic(point);
                        polygonPosition.push([LatLng.lng, LatLng.lat]);
                    })
                    if(!compareObject(polygonPosition[0],polygonPosition[polygonPosition.length - 1])) polygonPosition.push(polygonPosition[0]); 
                    polygonData.acreage = polygonAcreageWithAngle(polygonPosition);
    
                    polygonData.createNode();
                    parent.entitys.push(polygonData);
                }
            }
            bottomStatusContent('default',`缓冲区域【${shape.name}】`);
        }else{
            let parent = shape.parent;
            let entity = shape.entity;
            let entityPoints = null;
        
            if(shape.type === 'polygon'){
                entityPoints = deepCopy(entity.polygon.hierarchy.getValue().positions);
                if(compareObject(entityPoints[0],entityPoints[entityPoints.length - 1])) entityPoints.pop(); 
            }else if(shape.type === 'polyline'){
                entityPoints = deepCopy(entity.polyline.positions.getValue());
            }
          
            let L0 = 0;
            entityPoints.forEach(point => {
              let LatLng = cartesian3ToCartographic(point);
              L0 += LatLng.lng;
            })
            L0 /= entityPoints.length;
            let LL = (parseInt(L0 / 6.0) + 1) * 6 - 3; //中央子午线经度
        
            let outlinePoint_new = [];
            entityPoints.forEach((point) => {
                let LatLng = cartesian3ToCartographic(point);
                let XY = GetXY(LatLng.lat, LatLng.lng, LL);
                outlinePoint_new.push({X:XY.x, Y: XY.y});
            });
        
            let co = new ClipperLib.ClipperOffset();
        
            if(shape.type === 'polygon'){
                co.AddPath(outlinePoint_new,ClipperLib.JoinType.jtMiter,ClipperLib.EndType.etClosedPolygon);
            }else if(shape.type === 'polyline'){
                co.AddPath(outlinePoint_new,ClipperLib.JoinType.jtMiter,ClipperLib.EndType.etOpenSquare);
            }
           
            let expPolygons = new ClipperLib.Paths();
            co.Execute(expPolygons, data.length * 1000);
        
            for(let i = 0; i < expPolygons.length; i++){
                let extenderexpPolygonPoints = [];
                let extenderexpPolygonPoints_c = [];

                if(!compareObject(expPolygons[i][0],expPolygons[i][expPolygons[i].length - 1])) expPolygons[i].push(expPolygons[i][0]); 
                for(let j = 0; j < expPolygons[i].length;j++){
                    let latLng = GetLatLng(expPolygons[i][j].X, expPolygons[i][j].Y, LL);
                    extenderexpPolygonPoints.push(latLng.lng, latLng.lat);
                    extenderexpPolygonPoints_c.push([HToAn(latLng.lng), HToAn(latLng.lat)]);
                }

                let name = `${entity.name}[缓冲区${data.length}千米]`;
                let polygon = entityPolygon(name,Color.polygonColor,Color.polylineColor,0,Cesium.Cartesian3.fromRadiansArray(extenderexpPolygonPoints),null,true);
                let polygonData = new Polygon(name, polygon, parent);
                polygon.description = polygonData;
        
                if(!compareObject(extenderexpPolygonPoints_c[0],extenderexpPolygonPoints_c[extenderexpPolygonPoints_c.length - 1])) extenderexpPolygonPoints_c.push(extenderexpPolygonPoints_c[0]); 
                polygonData.acreage = polygonAcreageWithAngle(extenderexpPolygonPoints_c);
        
                polygonData.createNode();
                parent.entitys.push(polygonData);
            }
            bottomStatusContent('default',`缓冲区域【${shape.name}】`);
        }
        if(Attribute.store) storeTreeData(project).catch(err => loger.error(`${err.name} : ${err.message}`));
    }catch(err){
        bottomStatusContent('error',`缓冲区域失败【${shape.name}】`);
        loger.error(`${err.name} : ${err.message}`);
    }
});

//多段线平滑
ipcRenderer.on('bezierSplineEntity',async (event, data) => {
    try{
        let shape = nodeMap.get(data.id).original.content;
        if(!shape) return;
        if(shape.type !== 'polyline'){
            bottomStatusContent('warning','非多段线区域无法进行平滑');
            return;
        }
        let polylinePosition = []; 
    
        shape.entity.polyline.positions.getValue().forEach(point => polylinePosition.push(cartesian3ToCartographic(point)));
        let bezierSpline = polylineToBezierSpline(polylinePosition);
        readCreateData(shape, bezierSpline, {name:`${shape.name}[平滑]`}).then(() => {
            bottomStatusContent('default',`平滑完成【${shape.name}】`);
            if(Attribute.store) storeTreeData(project).catch(err => loger.error(`${err.name} : ${err.message}`));
        }).catch(err => {
            bottomStatusContent('error',`平滑失败【${shape.name}】`);
            loger.error(`${err.name} : ${err.message}`);
        });
    }catch(err){
        bottomStatusContent('error',`平滑失败`);
        loger.error(`${err.name} : ${err.message}`);
    }
});

//合并区域
ipcRenderer.on('mergePolygon',(event, arg) => {
    const polygon = nodeMap.get(arg.id).original.content;
    let polygons = new Map();
    project.dataPool.forEach(data => {
        data.entitys.forEach(entity => {
            if(entity.type === 'polygon' && entity.id !== polygon.id) {
                polygons.set(entity.id,{id:entity.id, name:entity.name});
            }
        })
    })

    ipcRenderer.send('createChildWindow',{
        main: 'mainWindow',
        type:'mergePolygonWindow',
        options:{
            title: "合并 [" + polygon.name + "]",
            width:330,
            height:230,
            parent: 'mainWindow',
            modal: true,
            resizable: false,
            minimizable: false,
            maximizable: false,
            type: 'toolbar'
        },
        url:'page/merge/merge.html',
        data:{id:arg.id, polygons}
    });
});

//合并多边形
ipcRenderer.on('merge',(event, data) => {
    try{
        let mainEntity = nodeMap.get(data.mainId).original.content;
        let mainPolygon = [];
        let mainPolygonPoints = mainEntity.entity.polygon.hierarchy.getValue().positions;
        mainPolygonPoints.forEach(point => {
            let LatLng = cartesian3ToCartographic(point);
            mainPolygon.push([LatLng.lng, LatLng.lat])
        });
        if(!compareObject(mainPolygon[0],mainPolygon[mainPolygon.length - 1])) mainPolygon.push(mainPolygon[0]); 
       
        let polygons = [];
        for(let i = 0;i < data.ids.length;i++){
            let mergePolygon = window.jsTreeObj.get_node(data.ids[i]).original.content;
            if(mergePolygon === null) {
                bottomStatusContent('warning','选择的合并区域不存在');
                continue;
            }
            let polygon = [];
            mergePolygon.entity.polygon.hierarchy.getValue().positions.forEach(point => {
                let LatLng = cartesian3ToCartographic(point);
                polygon.push([LatLng.lng, LatLng.lat]);
            });
            if(!compareObject(polygon[0],polygon[polygon.length - 1])) polygon.push(polygon[0]); 
            polygons.push(polygon);
        }
        
        readCreateData(mainEntity, polygonUnion(mainPolygon,polygons), {name:`${mainEntity.name}[合并区域]`}).then(()=>{
            bottomStatusContent('default','合并区域完成【' + mainEntity.name + '】');
            if(Attribute.store) storeTreeData(project).catch(err => loger.error(`${err.name} : ${err.message}`));
        }).catch(err => {
            bottomStatusContent('error','合并区域失败【' + mainEntity.name+ '】');
            loger.error(`${err.name} : ${err.message}`);
        });
    }catch(err){
        bottomStatusContent('error','合并区域失败');
        loger.error(`${err.name} : ${err.message}`);
    }
});

//分割区域
ipcRenderer.on('splitPolygon',(event, arg) => {
    let cursor = $('#cesiumContainer').css('cursor');
    if(cursor === 'crosshair') {
        bottomStatusContent('warning','目前处于绘图状态，请先结束绘图');
        return;
    }
    const polygon = nodeMap.get(arg.id).original.content;
    if(!polygon) return;
    if(polygon.type !== 'polygon'){
        bottomStatusContent('warning','非多边形区域无法进行分割');
        return;
    }

    $('#cesiumContainer').css('cursor','crosshair');
    let polygonPoints = polygon.entity.polygon.hierarchy.getValue().positions;
    if(compareObject(polygonPoints[0],polygonPoints[polygonPoints.length - 1])) polygonPoints.pop(); 

    let polygonPoint_new = [];
    polygonPoints.forEach((point) => {
        let LatLng = cartesian3ToCartographic(point);
        polygonPoint_new.push(LatLng);
    });

    drawSplitPolylineHandler(polylinePoint => {
        try{
             $('#cesiumContainer').css('cursor','default');
            let polylinePoint_new = [];
            polylinePoint.forEach((point) => {
                let LatLng = cartesian3ToCartographic(point);
                polylinePoint_new.push(LatLng);
            })
            let polygon_new = polygonClipByLine(polygonPoint_new,polylinePoint_new);
            readCreateData(polygon, polygon_new, {name:`分割${polygon.name}`}).then(() => {
                bottomStatusContent('default',`分割区域【${polygon.name}】`);
                if(Attribute.store) storeTreeData(project).catch(err => loger.error(`${err.name} : ${err.message}`));
            }).catch(err => {
                bottomStatusContent('error',`分割区域失败【${polygon.name}】`);
                loger.error(`${err.name} : ${err.message}`);
            });
        }catch(err){
            $('#cesiumContainer').css('cursor','default');
            bottomStatusContent('error',`分割区域失败【${polygon.name}】。${err.message}`);
            loger.error(`${err.name} : ${err.message}`);
        }  
    });
});

//显示实体
ipcRenderer.on('showEntity',(event,arg) => {
    let node = nodeMap.get(arg.id).original.content;
    if(!node) return;
    node.show = true;
    node.selectedNode(true);
    if(Attribute.store) storeTreeData(project).catch(err => loger.error(`${err.name} : ${err.message}`));
});

//隐藏实体
ipcRenderer.on('hideEntity',(event,arg) => {
    let node = nodeMap.get(arg.id).original.content;
    if(!node) return;
    node.show = false;
    node.selectedNode(false);
    if(Attribute.store) storeTreeData(project).catch(err => loger.error(`${err.name} : ${err.message}`));
});

//删除实体
ipcRenderer.on('deleteEntity', (event,arg) => {
    let node = nodeMap.get(arg.id);
    if(!node) return;
    let parent = node.original.content.parent;
    let index = parent.entitys.indexOf(node.original.content);
    let entity = parent.entitys.splice(index, 1)[0];
    if(window.jsTreeObj.delete_node(node)){
        window.viewer.entities.remove(entity.entity);
        bottomStatusContent('default',`删除区域【${entity.name}】`);
        if(Attribute.store) storeTreeData(project).catch(err => loger.error(`${err.name} : ${err.message}`));
    }else{
        bottomStatusContent('error',`删除区域失败【${entity.name}】`);
    }
});

//重命名图元集合
ipcRenderer.on('rePrimitivesName', (event,arg) => {
    let node = nodeMap.get(arg.id);
    if(!node) return;
    window.jsTreeObj.edit(node, node.text, newNode => {
        node.original.content.name = newNode.text;
        bottomStatusContent('default',`重命名数据【${newNode.text}】`);
        if(Attribute.store) storeTreeData(project).catch(err => loger.error(`${err.name} : ${err.message}`));
    });
});

//去目标图元集合位置
ipcRenderer.on('goTargetPrimitives',(event,arg) => {
    let node = nodeMap.get(arg.id);
    if(!node) return;
    goTargetNode(node.original.content);
    // if(node.original.content.primitives.length > 0) goTargetPlace(node.original.content.primitives[0].primitive);
});

//显示图元集合
ipcRenderer.on('showPrimitives', (event,arg) => {
    let node = nodeMap.get(arg.id);
    if(!node) return;
    node.original.content.show = true;
    node.original.content.selectedNode(true);
    if(Attribute.store) storeTreeData(project).catch(err => loger.error(`${err.name} : ${err.message}`));
});

//隐藏图元集合
ipcRenderer.on('hidePrimitives', (event,arg) => {
    let node = nodeMap.get(arg.id);
    if(!node) return;
    node.original.content.show = false;
    node.original.content.selectedNode(false);
    if(Attribute.store) storeTreeData(project).catch(err => loger.error(`${err.name} : ${err.message}`));
});

//删除图元集合
ipcRenderer.on('deletePrimitives', (event,arg) => {
    let node = nodeMap.get(arg.id);
    if(!node) return;
    let parent = node.original.content.parent;
    let index = parent.dataPool.indexOf(node.original.content);
    let data = parent.dataPool.splice(index, 1)[0];
    if(window.jsTreeObj.delete_node(node)){
        data.primitives.forEach(item => window.viewer.scene.primitives.remove(item.primitive));
        bottomStatusContent('default',`删除完成【${node.original.content.name}】`);
        if(Attribute.store) storeTreeData(project).catch(err => loger.error(`${err.name} : ${err.message}`));
    }else{
        bottomStatusContent('error',`删除失败【${node.original.content.name}】`);
    }
});

//显示图元
ipcRenderer.on('showTile', (event,arg) => {
    let node = nodeMap.get(arg.id).original.content;
    if(!node) return;
    node.show = true;
    node.selectedNode(true);
    if(Attribute.store) storeTreeData(project).catch(err => loger.error(`${err.name} : ${err.message}`));
});

//隐藏图元
ipcRenderer.on('hideTile', (event,arg) => {
    let node = nodeMap.get(arg.id).original.content;
    if(!node) return;
    node.show = false;
    node.selectedNode(false);
    if(Attribute.store) storeTreeData(project).catch(err => loger.error(`${err.name} : ${err.message}`));
});

//删除图元
ipcRenderer.on('deleteTile', (event,arg) => {
    let node = nodeMap.get(arg.id);
    if(!node) return;
    let parent = node.original.content.parent;
    let index = parent.primitives.indexOf(node.original.content);
    let primitive = parent.primitives.splice(index, 1)[0];
    if(window.jsTreeObj.delete_node(node)){
        window.viewer.scene.primitives.remove(primitive.primitive);
        bottomStatusContent('default',`删除模型【${node.original.content.name}】`);
        if(Attribute.store) storeTreeData(project).catch(err => loger.error(`${err.name} : ${err.message}`));
    }else{
        bottomStatusContent('error',`删除模型失败【${node.original.content.name}】`);
    }
});

//设置数据管理器显示与关闭
ipcRenderer.on('setProjectCloseHandler',(event,arg) => {
    $('#left-content-project').show();
    if(Attribute.store) store.set('ProjectClose',true);
});

//数据管理器
$('#project').on('click', () => {
    $('#left-content-project').toggle();
    if(Attribute.store) store.set('ProjectClose', !store.get('ProjectClose'));
});

//数据管理器
$('#project-close').on('click', () => {
    $('#left-content-project').hide();
    if(Attribute.store) store.set('ProjectClose', false);
});

//搜索
$('#search').on('click', search);

//搜索
ipcRenderer.on('searchHandler', search)

//搜索
function search(){
    const width = $('body').innerWidth();
    ipcRenderer.send('createChildWindow',{
        main: 'mainWindow',
        type:'searchWindow',
        options:{
            width:450,
            height:75,
            x: Math.round((width - 500) / 2),
            y: 200,
            parent: 'mainWindow',
            modal: true,
            center: false,
            resizable: false,
            minimizable: false,
            maximizable: false,
            movable: false,
            type: 'toolbar',
        },
        url:'page/search/search.html',
        data: null
    });
}

//搜索目标位置
ipcRenderer.on('search',(event, data) => {
    let tiandituUrl = `https://api.tianditu.gov.cn/administrative?postStr={"searchWord":'${data.name}',"searchType":"1","needSubInfo":"false","needAll":"false","needPolygon":"true","needPre":"false"}&tk=${window.tiandituKey}`;

    ajaxPromise(tiandituUrl).then(result => {
        if(result.returncode === "100"){
            const lat = result.data[0].lat;
            const lng = result.data[0].lnt;
            goTargetPosition(lng,lat,1000);
        }else{
            bottomStatusContent('warning', result.msg);
        }
    }).catch(err => {
        bottomStatusContent('error', '搜索目标位置失败，请检查网络是否正常');
        loger.error(`${err.name} : ${err.message}`);
    })
});

//关闭底部状态显示栏
$('#bottom-status-close').on('click',function(){
    $('#bottom-status').hide();
    if(Attribute.store) store.set('StatusClose', false);
});

//切换状态栏显示
ipcRenderer.on('setStatusCloseHandler',(event,arg) => {
    $('#bottom-status').show();
    if(Attribute.store) store.set('StatusClose', true);
});

//清除底部状态显示栏
$('#bottom-status-clear').on('click',function(){
    $('#bottom-status-content').empty();
    bottomStatusInitialize();
});

//实体集合数据的属性
ipcRenderer.on('natureEntity',(event,arg) => {
    let node = nodeMap.get(arg.id);
    if(!node || node.type !== 'entity') return;
    let entityMap = new Map();
    let entitys = node.original.content.entitys;

    for(let i = 0;i < entitys.length;i++){
        if(entityMap.has('point') && entityMap.has('polygon') && entityMap.has('polyline')) break;
        let entity = entitys[i].entity;
        if(entity.point && !entityMap.has('point')){
            let position = cartesianToCartographic(entity.position.getValue());
            let pointMap = new Map();
            pointMap.set('color', entity.point.color ? entity.point.color.getValue() : Color.pointColor);
            pointMap.set('pixelSize', entity.point.pixelSize ? entity.point.pixelSize.getValue() : Attribute.point.pixelSize);
            pointMap.set('heightReference', entity.point.heightReference ? entity.point.heightReference.getValue() : 0);
            pointMap.set('elevation', position.height);
            entityMap.set('point', pointMap);
        }else if(entity.polygon && !entityMap.has('polygon')){
            let polygon = entity.polygon;
            let elevation = 0;
            if(polygon.height === undefined || polygon.height === null){
                let polygonShapePoints = polygon.hierarchy.getValue().positions;
                let height = 0;
                polygonShapePoints.forEach(point => height += cartesianToCartographic(point).height)
                elevation = height / polygonShapePoints.length;
            }else{
                elevation = polygon.height.getValue();
            }
            let polygonMap = new Map();
            polygonMap.set('materialColor', polygon.material && polygon.material.color ? polygon.material.color.getValue() : Color.polygonColor);
            polygonMap.set('outlineColor', polygon.outlineColor ? polygon.outlineColor.getValue() : Color.polylineColor);
            polygonMap.set('outlineWidth', polygon.outlineWidth ? polygon.outlineWidth.getValue() : Attribute.polygon.outlineWidth);
            polygonMap.set('heightReference', polygon.heightReference ? polygon.heightReference.getValue() : 0);
            polygonMap.set('elevation', elevation);
            entityMap.set('polygon', polygonMap);
        }else if(entity.polyline && !entityMap.has('polyline')){
            let polyline = entity.polyline;
            let heightSum = 0;
            let positions = cartesianArrayToCartographicArray(polyline.positions.getValue());
            positions.forEach(point => heightSum += point.height);
            let elevation = Math.round(heightSum / positions.length);
            let polylineMap = new Map();
            polylineMap.set('materialColor',polyline.material && polyline.material.color ? polyline.material.color.getValue() : Color.polylineColor);
            polylineMap.set('width', polyline.width ? polyline.width.getValue() : Attribute.polyline.width);
            polylineMap.set('clampToGround', polyline.clampToGround ? polyline.clampToGround.getValue() : Attribute.polyline.clampToGround);
            polylineMap.set('elevation', elevation);
            entityMap.set('polyline', polylineMap);
        }
    }
    
    entityMap.set('count', entitys.length);
    ipcRenderer.send('createChildWindow',{
        main: 'mainWindow',
        type: node.id,
        options:{
            width:440,
            height:565,
            resizable: false,
            minimizable: false,
            maximizable: false,
            type: 'toolbar'
        },
        url:'page/nature/nature.html',
        data:{
            id: node.id,
            name: node.text,
            type: node.type,
            entity: entityMap
        }
    });
});

//获取多边形数据的属性
ipcRenderer.on('naturePolygon',(event,arg) => {
    let node = nodeMap.get(arg.id);
    if(!node || node.type !== 'polygon') return;
    let polygonMap = new Map();
    let polygon = node.original.content.entity.polygon;

    polygonMap.set('acreage',node.original.content.acreage);
    polygonMap.set('materialColor',polygon.material && polygon.material.color ? polygon.material.color.getValue() : Color.polygonColor);
    polygonMap.set('outlineColor',polygon.outlineColor ? polygon.outlineColor.getValue() : Color.polylineColor);
    polygonMap.set('outlineWidth',polygon.outlineWidth ? polygon.outlineWidth.getValue() : Attribute.polygon.outlineWidth);
    polygonMap.set('heightReference',polygon.heightReference ? polygon.heightReference.getValue() : 0);

    if(polygon.height === undefined || polygon.height === null){
        let polygonShapePoints = polygon.hierarchy.getValue().positions;
        let height = 0;
        polygonShapePoints.forEach(point => height += cartesianToCartographic(point).height)
        polygonMap.set('elevation', height / polygonShapePoints.length);
    }else{
        polygonMap.set('elevation', polygon.height.getValue());
    }

    ipcRenderer.send('createChildWindow',{
        main: 'mainWindow',
        type: node.id,
        options:{
            width:440,
            height:565,
            resizable: false,
            minimizable: false,
            maximizable: false,
            type: 'toolbar'
        },
        url:'page/nature/nature.html',
        data:{
            id: node.id,
            name: node.text,
            type: node.type,
            polygon: polygonMap
        }
    });
});

//获取多段线数据属性
ipcRenderer.on('naturePolyline',(event,arg) => {
    let node = nodeMap.get(arg.id);
    if(!node || node.type !== 'polyline') return;
    let polylineMap = new Map();
    let polyline = node.original.content.entity.polyline;

    polylineMap.set('length',node.original.content.length);

    polylineMap.set('materialColor',polyline.material && polyline.material.color ? polyline.material.color.getValue() : Color.polylineColor);
    polylineMap.set('width',polyline.width ? polyline.width.getValue() : Attribute.polyline.width);
    polylineMap.set('clampToGround',polyline.clampToGround ? polyline.clampToGround.getValue() : Attribute.polyline.clampToGround);
    let positions = cartesianArrayToCartographicArray(polyline.positions.getValue());
    let heightSum = 0;
    positions.forEach(point => heightSum += point.height);
    polylineMap.set('elevation', Math.round(heightSum / positions.length));

    if(positions.length === 2){
        let azimuth = pointsToAzimuth({lng:Cesium.Math.toDegrees(positions[0].longitude),lat:Cesium.Math.toDegrees(positions[0].latitude)},{lng:Cesium.Math.toDegrees(positions[1].longitude),lat:Cesium.Math.toDegrees(positions[1].latitude)});
        polylineMap.set('azimuth', azimuth);
    }

    ipcRenderer.send('createChildWindow',{
        main: 'mainWindow',
        type: node.id,
        options:{
            width:440,
            height:565,
            resizable: false,
            minimizable: false,
            maximizable: false,
            type: 'toolbar'
        },
        url:'page/nature/nature.html',
        data:{
            id: node.id,
            name: node.text,
            type: node.type,
            polyline: polylineMap
        }
    });
});

//获取点的数据属性
ipcRenderer.on('naturePoint',(event,arg) => {
    let node = nodeMap.get(arg.id);
    if(!node || node.type !== 'point') return;
    let pointMap = new Map();
    let entity = node.original.content.entity;

    // if(entity.billboard){
    //     pointMap.set('color', entity.billboard.color ? entity.billboard.color.getValue() : Color.pointColor);
    //     pointMap.set('heightReference',entity.label.heightReference ? entity.label.heightReference.getValue() : 0);   
    // }else if(entity.point){
    //     pointMap.set('color', entity.point.color ? entity.point.color.getValue() : Color.pointColor);
    //     pointMap.set('heightReference',entity.point.heightReference ? entity.point.heightReference.getValue() : 0);
    // }
    pointMap.set('color', entity.point.color ? entity.point.color.getValue() : Color.pointColor);
    pointMap.set('pixelSize', entity.point.pixelSize ? entity.point.pixelSize.getValue() : Attribute.point.pixelSize);
    pointMap.set('heightReference',entity.point.heightReference ? entity.point.heightReference.getValue() : 0);
    let position = cartesianToCartographic(entity.position.getValue());
    pointMap.set('elevation', position.height);
    
    ipcRenderer.send('createChildWindow',{
        main: 'mainWindow',
        type: node.id,
        options:{
            width:440,
            height:565,
            resizable: false,
            minimizable: false,
            maximizable: false,
            type: 'toolbar'
        },
        url:'page/nature/nature.html',
        data:{
            id: node.id,
            name: node.text,
            type: node.type,
            point: pointMap
        }
    });
});

//获取图元集合数据属性
ipcRenderer.on('naturePrimitive',(event,arg) => {
    let node = nodeMap.get(arg.id);
    if(!node || node.type !== 'primitive') return;
    let primitiveMap = new Map();
    let primitive = node.original.content;
    
    primitiveMap.set('count', primitive.primitives.length);
    ipcRenderer.send('createChildWindow',{
        main: 'mainWindow',
        type: node.id,
        options:{
            width:440,
            height:565,
            resizable: false,
            minimizable: false,
            maximizable: false,
            type: 'toolbar'
        },
        url:'page/nature/nature.html',
        data:{
            id: node.id,
            name: node.text,
            type: node.type,
            primitive: primitiveMap
        }
    });
});

//获取图元的数据属性
ipcRenderer.on('natureTile', (event,arg) => {
    let node = nodeMap.get(arg.id);
    if(!node || node.type !== 'tile') return;
    let tileMap = new Map();
    const tile = node.original.content.primitive;
    let cartographic = cartesian3ToCartographic(tile.boundingSphere.center);

    tileMap.set('longitude', cartographic.lng);
    tileMap.set('latitude', cartographic.lat);
    tileMap.set('height', cartographic.height);

    ipcRenderer.send('createChildWindow',{
        main: 'mainWindow',
        type: node.id,
        options:{
            width:440,
            height:565,
            resizable: false,
            minimizable: false,
            maximizable: false,
            type: 'toolbar'
        },
        url:'page/nature/nature.html',
        data:{
            id: node.id,
            name: node.text,
            type: node.type,
            tile: tileMap
        }
    });
});

//属性设置
ipcRenderer.on('nature',(event, data) => {
    let node = nodeMap.get(data.get('id'));
    if(!node) return;

    switch(node.type){
        case 'entity':
            if(window.jsTreeObj.rename_node(node, data.get('name'))){
                node.original.content.name = data.get('name');
            }
            entitySet(node.original.content.entitys, data);
            break;
        case 'polygon':
            if(window.jsTreeObj.rename_node(node, data.get('name'))){
                node.original.content.name = data.get('name');
                node.original.content.entity.name = data.get('name');
            }
            polygonSet(node.original.content.entity, data);
            break;
        case 'polyline':
            if(window.jsTreeObj.rename_node(node, data.get('name'))){
                node.original.content.name = data.get('name');
                node.original.content.entity.name = data.get('name');
            }
            polylineSet(node.original.content.entity, data);
            break;
        case 'point':
            if(window.jsTreeObj.rename_node(node, data.get('name'))){
                node.original.content.name = data.get('name');
                node.original.content.entity.name = data.get('name');
            }
            pointSet(node.original.content.entity, data);
            break;
        case 'primitive':
            if(window.jsTreeObj.rename_node(node, data.get('name'))){
                node.original.content.name = data.get('name');
            }
            break;
        case 'tile':
            if(window.jsTreeObj.rename_node(node, data.get('name'))){
                node.original.content.name = data.get('name');
            }
            break;
    }
    
    if(Attribute.store) storeTreeData(project).catch(err => loger.error(`${err.name} : ${err.message}`));
});

//实体集合设置
function entitySet(entitys,data){
    const color = Cesium.Color.fromCssColorString(data.get('materialRGBA'));
    const pixelSize = data.get('pixelSize');
    const width  = data.get('width');
    const outlineWidth = data.get('outlineWidth');
    const outlineColor = Cesium.Color.fromCssColorString(data.get('outlineRGBA'));
    const heightReference = data.get('heightReference') === 0 ? Cesium.HeightReference.NONE : Cesium.HeightReference.CLAMP_TO_GROUND;;
    const elevation = data.get('elevation');
   
    entitys.forEach(item => {
        let entity = item.entity;
        if(entity.label) entity.label.heightReference = heightReference;
        if(entity.point){
            entity.point.color = color;
            entity.point.pixelSize = pixelSize;
            entity.point.heightReference = heightReference;
            let position = cartesianToCartographic(entity.position.getValue());
            entity.position = Cesium.Cartesian3.fromRadians(position.longitude, position.latitude, elevation); 
        }else if(entity.polygon){
            entity.polygon.material  = color;
            entity.polygon.heightReference = heightReference;
            entity.polygon.height = elevation;
            entity.polygon.perPositionHeight = false;
            entity.polygon.outlineWidth = outlineWidth;
            entity.polygon.outlineColor = outlineColor;
        }else if(entity.polyline){
            entity.polyline.material = color;
            entity.polyline.width = width;
            entity.polyline.clampToGround = data.get('heightReference') === 0 ? false : true;
            let positions = cartesianArrayToCartographicArray(entity.polyline.positions.getValue());
            let new_positions = [];
            positions.forEach(point => {
                new_positions.push(point.longitude);
                new_positions.push(point.latitude);
                new_positions.push(elevation);
            });
            entity.polyline.positions = Cesium.Cartesian3.fromRadiansArrayHeights(new_positions); 
        }else{
            bottomStatusContent('warning', `设置属性无效【${entity.name}】`);
        }
    });
}

//实体多边形属性设置
function polygonSet(entity,data){
    let polygon = entity.polygon;
    polygon.outlineWidth = data.get('outlineWidth');
    polygon.material = Cesium.Color.fromCssColorString(data.get('materialRGBA'));
    polygon.outlineColor = Cesium.Color.fromCssColorString(data.get('outlineRGBA'));
    polygon.perPositionHeight = false;//取消每个点的高度
    polygon.heightReference = data.get('heightReference') === 0 ? Cesium.HeightReference.NONE : Cesium.HeightReference.CLAMP_TO_GROUND;
    polygon.height = data.get('elevation');
}

//实体多段线属性设置
function polylineSet(entity,data){
    let polyline = entity.polyline;
    polyline.material = Cesium.Color.fromCssColorString(data.get('materialRGBA'));
    polyline.width  = data.get('width');
    polyline.clampToGround = data.get('heightReference') === 0 ? false : true;
    let elevation = data.get('elevation');
    let positions = cartesianArrayToCartographicArray(polyline.positions.getValue());
    let new_positions = [];
    positions.forEach(point => {
        new_positions.push(point.longitude);
        new_positions.push(point.latitude);
        new_positions.push(elevation);
    });
    let Cartesian3s = Cesium.Cartesian3.fromRadiansArrayHeights(new_positions);
    polyline.positions = Cartesian3s;  
}

//实体点属性设置
function pointSet(entity,data){
    let label = entity.label;
    let point = entity.point;
    const heightReference = data.get('heightReference') === 0 ? Cesium.HeightReference.NONE : Cesium.HeightReference.CLAMP_TO_GROUND;
    const elevation = data.get('elevation');

    label.text = data.get('name');
    label.heightReference = heightReference;
    point.heightReference = heightReference;
    point.color = Cesium.Color.fromCssColorString(data.get('materialRGBA'));
    point.pixelSize = data.get('pixelSize');
    let position = cartesianToCartographic(entity.position.getValue());
    entity.position = Cesium.Cartesian3.fromRadians(position.longitude, position.latitude, elevation); 
}