/*
 * @Version: 1.0
 * @Autor: wangrenhua
 * @Description: cesium
 * @Date: 2021-08-17 16:30:06
 * @FilePath: \Cosmos\main\code\cesiumSet.js
 * @LastEditTime: 2023-03-08 11:23:53
 */
(function(){
const Store = require('electron-store');
let store = new Store({clearInvalidConfig: true});

// cesium的密钥
Cesium.Ion.defaultAccessToken = "************";

const tiandituKey = "************";
const TiandituImgWURL = `https://t{s}.tianditu.gov.cn/DataServer?T=img_w&x={x}&y={y}&l={z}&tk=${ tiandituKey }`;
const TiandituVecWURL = `https://t{s}.tianditu.gov.cn/DataServer?T=vec_w&x={x}&y={y}&l={z}&tk=${ tiandituKey }`;
const TiandituTerWURL = `https://t{s}.tianditu.gov.cn/DataServer?T=ter_w&x={x}&y={y}&l={z}&tk=${ tiandituKey }`;
const TiandituIboWURL = `https://t{s}.tianditu.gov.cn/DataServer?T=ibo_w&x={x}&y={y}&l={z}&tk=${ tiandituKey }`;
const TiandituCvaWURL = `https://t{s}.tianditu.gov.cn/DataServer?T=cva_w&x={x}&y={y}&l={z}&tk=${ tiandituKey }`;
const TiandituCiaWURL = `https://t{s}.tianditu.gov.cn/DataServer?T=cia_w&x={x}&y={y}&l={z}&tk=${ tiandituKey }`;

const geovisearthKey = "************";
const GeovisearthImgWURL = `https://tiles{s}.geovisearth.com/base/v1/img/{z}/{x}/{y}?format=webp&tmsIds=w&token=${ geovisearthKey }`;
const GeovisearthVecWURL = `https://tiles{s}.geovisearth.com/base/v1/vec/{z}/{x}/{y}?format=png&tmsIds=w&token=${ geovisearthKey }`;
const GeovisearthTerWURL = `https://tiles{s}.geovisearth.com/base/v1/ter/{z}/{x}/{y}?format=png&tmsIds=w&token=${ geovisearthKey }`;
const GeovisearthCiaWURL = `https://tiles{s}.geovisearth.com/base/v1/cia/{z}/{x}/{y}?format=png&tmsIds=w&token=${ geovisearthKey }`; 


Cesium.Camera.DEFAULT_VIEW_RECTANGLE = Cesium.Rectangle.fromDegrees(100, 10, 120, 70);//视图调整到中国

const viewer = new Cesium.Viewer("cesiumContainer", {
      geocoder: false, //查找工具
      homeButton: false, //视角返回初始位置按钮
      sceneModePicker: false, //选择视角的模式
      baseLayerPicker: false, //图层选择器
      navigationHelpButton: false, //导航帮助按钮
      animation: false, //动画器件
      timeline: false, //时间线
      fullscreenButton: false, //全屏按钮
      infoBox: false, //右上角提示组件
      selectionIndicator: false, //鼠标点击绿色框
      imageryProvider: false,//去掉初始的bing地图
});
viewer.scene.globe.baseColor = Cesium.Color.WHITE; //设置地球基础背景色
viewer.cesiumWidget.creditContainer.style.display = "none"; //版权显示

function addImageryLayer(url, subdomains, maximumLevel, index){
    const layer = viewer.imageryLayers.addImageryProvider(
      new Cesium.UrlTemplateImageryProvider({
          url,
          subdomains,
          tilingScheme: new Cesium.WebMercatorTilingScheme(),
          maximumLevel
      }),index);
    return layer;
}

//天地图影像
let TiandituImgW = null;
if(store.get('TiandituImgW') === undefined){
    TiandituImgW = addImageryLayer(TiandituImgWURL, ['0','1','2','3','4','5','6','7'], 18, 0);
}else if(store.get('TiandituImgW') !== undefined && Number(store.get('TiandituImgW')) !== 0){
    TiandituImgW = addImageryLayer(TiandituImgWURL, ['0','1','2','3','4','5','6','7'], Number(store.get('TiandituImgW')), 0);
}

//天地图矢量图
let TiandituVecW = null;
if(store.get('TiandituVecW') !== undefined && Number(store.get('TiandituVecW')) !== 0){
   TiandituVecW = addImageryLayer(TiandituVecWURL, ['0','1','2','3','4','5','6','7'], Number(store.get('TiandituVecW')), 5);
}

//天地图地形晕眩图
let TiandituTerW = null;
if(store.get('TiandituTerW') !== undefined && Number(store.get('TiandituTerW')) !== 0){
    TiandituTerW = addImageryLayer(TiandituTerWURL, ['0','1','2','3','4','5','6','7'], Number(store.get('TiandituTerW')), 10);
}

//天地图国界
let TiandituIboW = null;
if(store.get('TiandituIboW') === undefined){
    TiandituIboW = addImageryLayer(TiandituIboWURL, ['0','1','2','3','4','5','6','7'], 10, 20);
}else if(store.get('TiandituIboW') !== undefined && Number(store.get('TiandituIboW')) !== 0){
    TiandituIboW = addImageryLayer(TiandituIboWURL, ['0','1','2','3','4','5','6','7'], Number(store.get('TiandituIboW')), 20);
}

//天地图地名注记
let TiandituCvaW = null;
if(store.get('TiandituCvaW') === undefined){
    TiandituCvaW = addImageryLayer(TiandituCvaWURL, ['0','1','2','3','4','5','6','7'], 18, 30);
}else if(store.get('TiandituCvaW') !== undefined && Number(store.get('TiandituCvaW')) !== 0){
    TiandituCvaW = addImageryLayer(TiandituCvaWURL, ['0','1','2','3','4','5','6','7'], Number(store.get('TiandituCvaW')), 30);
}

//天地图道路网
let TiandituCiaW = null;
if(store.get('TiandituCiaW') !== undefined && Number(store.get('TiandituCiaW')) !== 0){
    TiandituCiaW = addImageryLayer(TiandituCiaWURL, ['0','1','2','3','4','5','6','7'], Number(store.get('TiandituCiaW')), 40);
}

//星图地球影像
let GeovisearthImgW = null;
if(store.get('GeovisearthImgW') !== undefined && Number(store.get('GeovisearthImgW')) !== 0){
    GeovisearthImgW = addImageryLayer(GeovisearthImgWURL, ['1','2','3'], Number(store.get('GeovisearthImgW')), 0);
}

//星图地球矢量
let GeovisearthVecW = null;
if(store.get('GeovisearthVecW') !== undefined && Number(store.get('GeovisearthVecW')) !== 0){
    GeovisearthVecW = addImageryLayer(GeovisearthVecWURL, ['1','2','3'], Number(store.get('GeovisearthVecW')), 5);
}

//星图地球地形晕渲图
let GeovisearthTerW = null;
if(store.get('GeovisearthTerW') !== undefined && Number(store.get('GeovisearthTerW')) !== 0){
    GeovisearthTerW = addImageryLayer(GeovisearthTerWURL, ['1','2','3'], Number(store.get('GeovisearthTerW')), 10);
}

//星图地球地形道路网
let GeovisearthCiaW = null;
if(store.get('GeovisearthCiaW') !== undefined && Number(store.get('GeovisearthCiaW')) !== 0){
    GeovisearthCiaW = addImageryLayer(GeovisearthCiaWURL, ['1','2','3'], Number(store.get('GeovisearthCiaW')), 40);
}

// 加载全球地形
const onlineTerrainProvider = Cesium.createWorldTerrain({
    requestVertexNormals: false,
    equestWaterMask: false,
});


viewer.extend(Cesium.viewerCesiumNavigationMixin, {
    defaultResetView: Cesium.Rectangle.fromDegrees(100, 10, 120, 70),
    enableCompass: true,
    enableZoomControls: true,
    enableDistanceLegend: true,
    enableCompassOuterRing: true
});

window.tiandituKey = tiandituKey;
window.viewer = viewer;

window.tiandituURL = {TiandituImgWURL, TiandituVecWURL, TiandituTerWURL, TiandituIboWURL, TiandituCvaWURL, TiandituCiaWURL};
window.tianditu = {TiandituImgW, TiandituCiaW, TiandituCvaW, TiandituIboW, TiandituTerW, TiandituVecW};

window.geovisearthURL = {GeovisearthImgWURL, GeovisearthVecWURL, GeovisearthTerWURL, GeovisearthCiaWURL};
window.geovisearth = {GeovisearthImgW, GeovisearthVecW, GeovisearthTerW, GeovisearthCiaW};

window.terrain = {onlineTerrainProvider, offlineTerrainProvider:null};
window.terrainProvider = onlineTerrainProvider;
})();

