/*
 * @Descripttion:颜色
 * @version:1.0
 * @Author: wangrenhua
 * @Date: 2020-07-13 11:21:31
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2023-03-03 11:01:06
 */
const fs = require('fs');
const Store = require('electron-store');
let store = new Store({clearInvalidConfig: true});

const Color = {
  polygonColor: store.get('config.color.polygonColor') ?  Cesium.Color.fromCssColorString(store.get('config.color.polygonColor')) : Cesium.Color.fromCssColorString('rgba(80,136,67,0.6)'),
  polylineColor: store.get('config.color.polylineColor') ?  Cesium.Color.fromCssColorString(store.get('config.color.polylineColor')) : Cesium.Color.RED,
  pointColor: store.get('config.color.pointColor') ?  Cesium.Color.fromCssColorString(store.get('config.color.pointColor')) : Cesium.Color.ORANGERED,
  splitLineColor: store.get('config.color.splitLineColor') ?  Cesium.Color.fromCssColorString(store.get('config.color.splitLineColor')) : Cesium.Color.fromCssColorString('#ff9900'),

  white: store.get('config.color.white') ?  Cesium.Color.fromCssColorString(store.get('config.color.white')) : Cesium.Color.WHITE, //白色
  successColor: store.get('config.color.successColor') ?  Cesium.Color.fromCssColorString(store.get('config.color.successColor')) : Cesium.Color.fromCssColorString('#19be6b'),
  warningColor: store.get('config.color.warningColor') ?  Cesium.Color.fromCssColorString(store.get('config.color.warningColor')) : Cesium.Color.fromCssColorString('#ff9900'),
  errorColor: store.get('config.color.errorColor') ?  Cesium.Color.fromCssColorString(store.get('config.color.errorColor')) : Cesium.Color.fromCssColorString('#ed4014'),

  success: store.get('config.color.success') ?  store.get('config.color.success') : '#19be6b',
  warning: store.get('config.color.warning') ?  store.get('config.color.warning') : '#ff9900',
  error: store.get('config.color.error') ?  store.get('config.color.error') : '#ed4014',
};

const Attribute = {
  store: store.get('config.attribute.store') !== undefined ? store.get('config.attribute.store') : true,
  terrainProvider: store.get('config.attribute.terrainProvider') ? store.get('config.attribute.terrainProvider') : null,
  polygon:{
    fill: store.get('config.attribute.polygon.fill') !== undefined ? store.get('config.attribute.polygon.fill') : true,
    outline: store.get('config.attribute.polygon.outline') !== undefined ? store.get('config.attribute.polygon.outline') : true,
    outlineWidth: store.get('config.attribute.polygon.outlineWidth') !== undefined ? store.get('config.attribute.polygon.outlineWidth') : 1,
    perPositionHeight: store.get('config.attribute.polygon.perPositionHeight') !== undefined ? store.get('config.attribute.polygon.perPositionHeight') : false,
    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
  },

  polyline:{
    clampToGround: store.get('config.attribute.polyline.clampToGround') !== undefined ? store.get('config.attribute.polyline.clampToGround') : true,
    width: store.get('config.attribute.polyline.width') !== undefined ? store.get('config.attribute.polyline.width') : 2,
  },

  point:{
    pixelSize: store.get('config.attribute.point.pixelSize') !== undefined ? store.get('config.attribute.point.pixelSize') : 10,
    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
  },

  label:{
    showBackground: store.get('config.attribute.label.showBackground') !== undefined ? store.get('config.attribute.label.showBackground') : true,
    scale: store.get('config.attribute.label.scale') !== undefined ? store.get('config.attribute.label.scale') : 0.7,//广告牌的大小
    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    pixelOffset: new Cesium.Cartesian2(0,-5),
  },
};

if(store.get('config.attribute.polygon.heightReference')){
  switch(store.get('config.attribute.polygon.heightReference')){
    case 'CLAMP_TO_GROUND':
      Attribute.polygon.heightReference = Cesium.HeightReference.CLAMP_TO_GROUND;
      break;
    case 'NONE':
      Attribute.polygon.heightReference = Cesium.HeightReference.NONE;
      break;
    case 'RELATIVE_TO_GROUND':
      Attribute.polygon.heightReference = Cesium.HeightReference.RELATIVE_TO_GROUND;
      break;
    default:
      Attribute.polygon.heightReference = Cesium.HeightReference.NONE;
  }
}

if(store.get('config.attribute.point.heightReference')){
  switch(store.get('config.attribute.point.heightReference')){
    case 'CLAMP_TO_GROUND':
      Attribute.point.heightReference = Cesium.HeightReference.CLAMP_TO_GROUND;
      break;
    case 'NONE':
      Attribute.point.heightReference = Cesium.HeightReference.NONE;
      break;
    case 'RELATIVE_TO_GROUND':
      Attribute.point.heightReference = Cesium.HeightReference.RELATIVE_TO_GROUND;
      break;
    default:
      Attribute.point.heightReference = Cesium.HeightReference.CLAMP_TO_GROUND;
  }
}

if(store.get('config.attribute.label.verticalOrigin')){
  switch(store.get('config.attribute.label.verticalOrigin')){
    case 'CENTER':
      Attribute.label.verticalOrigin = Cesium.VerticalOrigin.CENTER;
      break;
    case 'BOTTOM':
      Attribute.label.verticalOrigin = Cesium.VerticalOrigin.BOTTOM;
      break;
    case 'BASELINE':
      Attribute.label.verticalOrigin = Cesium.VerticalOrigin.BASELINE;
      break;
    case 'TOP':
      Attribute.label.verticalOrigin = Cesium.VerticalOrigin.TOP;
      break;
    default:
      Attribute.label.verticalOrigin = Cesium.VerticalOrigin.BOTTOM;
  }
}

if(store.get('config.attribute.label.pixelOffset')){
  const pixelOffset = store.get('config.attribute.label.pixelOffset').split(',');
  Attribute.label.pixelOffset = new Cesium.Cartesian2(Number(pixelOffset[0]),Number(pixelOffset[1]));
}

if(Attribute.terrainProvider !== null && fs.existsSync(Attribute.terrainProvider)){
  const offlineTerrainProvider = new Cesium.CesiumTerrainProvider({url: `file:///${Attribute.terrainProvider}`});

  offlineTerrainProvider.readyPromise.then(ready => {
    if(ready){
      window.terrain.offlineTerrainProvider = offlineTerrainProvider;
      window.terrainProvider = offlineTerrainProvider;
    }
  })
}

export {Color ,Attribute}
// getConfigFilePath().then(async function(path){
//   let configStr = fs.readFileSync(path, 'utf8');
//   const result = await xmlParser.parseStringPromise(configStr);
//   if(!result) return;
//   const _color = result.root.Color;
//   const _attribute = result.root.Attribute;
//   Color.polygonColor = Cesium.Color.fromCssColorString(_color.PolygonColor);
//   Color.polylineColor = Cesium.Color.fromCssColorString(_color.PolylineColor);
//   Color.splitLineColor = Cesium.Color.fromCssColorString(_color.SplitLineColor);

//   Color.pointColor = Cesium.Color.fromCssColorString(_color.PointColor);
//   Color.white = Cesium.Color.fromCssColorString(_color.White);
//   Color.successColor = Cesium.Color.fromCssColorString(_color.SuccessColor);
//   Color.warningColor = Cesium.Color.fromCssColorString(_color.WarningColor);
//   Color.errorColor = Cesium.Color.fromCssColorString(_color.ErrorColor);
//   Color.success = _color.Success;
//   Color.warning = _color.Warning;
//   Color.error = _color.Error;

//   Attribute.terrainProvider = _attribute.TerrainProvider;
//   Attribute.store = eval(_attribute.Store);

//   if(Attribute.terrainProvider !== null && fs.existsSync(Attribute.terrainProvider)){
//     const offlineTerrainProvider = new Cesium.CesiumTerrainProvider({url: Attribute.terrainProvider});
//     window.terrain.offlineTerrainProvider = offlineTerrainProvider;
//     window.terrainProvider = offlineTerrainProvider;
//   }

//   Attribute.polygon.fill = eval(_attribute.Polygon.Fill);
//   Attribute.polygon.outline = eval(_attribute.Polygon.Outline);
//   Attribute.polygon.outlineWidth = Number(_attribute.Polygon.OutlineWidth);
//   Attribute.polygon.perPositionHeight = eval(_attribute.Polygon.PerPositionHeight);
  
//   switch(_attribute.Polygon.HeightReference){
//     case 'CLAMP_TO_GROUND':
//       Attribute.polygon.heightReference = Cesium.HeightReference.CLAMP_TO_GROUND;
//       break;
//     case 'NONE':
//       Attribute.polygon.heightReference = Cesium.HeightReference.NONE;
//       break;
//     case 'RELATIVE_TO_GROUND':
//       Attribute.polygon.heightReference = Cesium.HeightReference.RELATIVE_TO_GROUND;
//       break;
//     default:
//       Attribute.polygon.heightReference = Cesium.HeightReference.NONE;
//   }
  
//   Attribute.polyline.clampToGround = eval(_attribute.Polyline.ClampToGround);
//   Attribute.polyline.width = Number(_attribute.Polyline.Width);

//   Attribute.point.pixelSize = Number(_attribute.Point.PixelSize);
//   Attribute.point.HeightReference = _attribute.Point.HeightReference;

//   switch(_attribute.Point.HeightReference){
//     case 'CLAMP_TO_GROUND':
//       Attribute.point.HeightReference = Cesium.HeightReference.CLAMP_TO_GROUND;
//       break;
//     case 'NONE':
//       Attribute.point.HeightReference = Cesium.HeightReference.NONE;
//       break;
//     case 'RELATIVE_TO_GROUND':
//       Attribute.point.HeightReference = Cesium.HeightReference.RELATIVE_TO_GROUND;
//       break;
//     default:
//       Attribute.point.HeightReference = Cesium.HeightReference.CLAMP_TO_GROUND;
//   }
  
//   Attribute.label.showBackground = eval(_attribute.Label.ShowBackground);
//   Attribute.label.scale = Number(_attribute.Label.Scale);

//   switch(_attribute.Label.VerticalOrigin){
//     case 'CENTER':
//       Attribute.label.verticalOrigin = Cesium.VerticalOrigin.CENTER;
//       break;
//     case 'BOTTOM':
//       Attribute.label.verticalOrigin = Cesium.VerticalOrigin.BOTTOM;
//       break;
//     case 'BASELINE':
//       Attribute.label.verticalOrigin = Cesium.VerticalOrigin.BASELINE;
//       break;
//     case 'TOP':
//       Attribute.label.verticalOrigin = Cesium.VerticalOrigin.TOP;
//       break;
//     default:
//       Attribute.label.verticalOrigin = Cesium.VerticalOrigin.BOTTOM;
//   }

//   const pixelOffset = _attribute.Label.PixelOffset.split(',');
//   Attribute.label.pixelOffset = new Cesium.Cartesian2(Number(pixelOffset[0]),Number(pixelOffset[1]));
// }).catch(err => {
//   loger.error(`${err.name} : ${err.message}`);
// })