/*
 * @Version: 1.0
 * @Autor: wangrenhua
 * @Description: 1.0.0
 * @Date: 2021-08-25 13:02:39
 * @FilePath: \Cosmos\main\code\CesiumControl.js
 * @LastEditTime: 2023-03-03 10:04:39
 */

import {Color, Attribute} from './config.js';
import {Polygon, Polyline, Point} from './Data.js';
import {cartesianToCartographic, cartesian3ToCartographic} from './coorTra.js';
import {polylineLength, polygonAcreageWithAngle, pointsToAzimuth} from './turfExtras.js';
import {compareObject, deepCopy} from './tool.js';

let drawScreenSpaceEventHandler = new Cesium.ScreenSpaceEventHandler(window.viewer.scene.canvas); //动态绘制多边形的屏幕事件
let hintScreenSpaceEventHandler = new Cesium.ScreenSpaceEventHandler(window.viewer.scene.canvas); //鼠标移动提示信息
let moveScreenSpaceEventHandler = new Cesium.ScreenSpaceEventHandler(window.viewer.scene.canvas); //鼠标移动获取经纬度
let distanceScreenSpaceEventHandler = new Cesium.ScreenSpaceEventHandler(window.viewer.scene.canvas); //绘制图形得到距离的屏幕事件
let azimuthScreenSpaceEventHandler = new Cesium.ScreenSpaceEventHandler(window.viewer.scene.canvas); //绘制图形得到角度的屏幕事件

let distancePolylineShape = null;
// let distanceLabelEntity = null;
let azimuthPolylineShape = null;
// let azimuthLabelEntity = null;
let KeyboardControlEvent = null;

/**
 * @description: 取消屏幕捕捉事件
 * @Author: wangrenhua
 */
function cancelDrawScreenSpaceEventHandler() {
    drawScreenSpaceEventHandler.removeInputAction(
      Cesium.ScreenSpaceEventType.LEFT_CLICK
    );
    drawScreenSpaceEventHandler.removeInputAction(
      Cesium.ScreenSpaceEventType.MOUSE_MOVE
    );
    drawScreenSpaceEventHandler.removeInputAction(
      Cesium.ScreenSpaceEventType.RIGHT_CLICK
    );
    drawScreenSpaceEventHandler.removeInputAction(
      Cesium.ScreenSpaceEventType.MIDDLE_CLICK
    );
}

function cancelHintScreenSpaceEventHandler(){
  hintScreenSpaceEventHandler.removeInputAction(
    Cesium.ScreenSpaceEventType.LEFT_CLICK
  );
  hintScreenSpaceEventHandler.removeInputAction(
    Cesium.ScreenSpaceEventType.MOUSE_MOVE
  );
  hintScreenSpaceEventHandler.removeInputAction(
    Cesium.ScreenSpaceEventType.RIGHT_CLICK
  );
  hintScreenSpaceEventHandler.removeInputAction(
    Cesium.ScreenSpaceEventType.MIDDLE_CLICK
  );
}

function cancelMoveScreenSpaceEventHandler(){
  moveScreenSpaceEventHandler.removeInputAction(
    Cesium.ScreenSpaceEventType.LEFT_CLICK
  );
  moveScreenSpaceEventHandler.removeInputAction(
    Cesium.ScreenSpaceEventType.MOUSE_MOVE
  );
  moveScreenSpaceEventHandler.removeInputAction(
    Cesium.ScreenSpaceEventType.RIGHT_CLICK
  );
  moveScreenSpaceEventHandler.removeInputAction(
    Cesium.ScreenSpaceEventType.MIDDLE_CLICK
  );
}

function cancelDistanceScreenSpaceEventHandler(){
  distanceScreenSpaceEventHandler.removeInputAction(
    Cesium.ScreenSpaceEventType.LEFT_CLICK
  );
  distanceScreenSpaceEventHandler.removeInputAction(
    Cesium.ScreenSpaceEventType.MOUSE_MOVE
  );
  distanceScreenSpaceEventHandler.removeInputAction(
    Cesium.ScreenSpaceEventType.RIGHT_CLICK
  );
  distanceScreenSpaceEventHandler.removeInputAction(
    Cesium.ScreenSpaceEventType.MIDDLE_CLICK
  );
  window.viewer.entities.remove(distancePolylineShape);
  // window.viewer.entities.remove(distanceLabelEntity);
}

function cancelAzimuthScreenSpaceEventHandler(){
  azimuthScreenSpaceEventHandler.removeInputAction(
    Cesium.ScreenSpaceEventType.LEFT_CLICK
  );
  azimuthScreenSpaceEventHandler.removeInputAction(
    Cesium.ScreenSpaceEventType.MOUSE_MOVE
  );
  azimuthScreenSpaceEventHandler.removeInputAction(
    Cesium.ScreenSpaceEventType.RIGHT_CLICK
  );
  azimuthScreenSpaceEventHandler.removeInputAction(
    Cesium.ScreenSpaceEventType.MIDDLE_CLICK
  );
  window.viewer.entities.remove(azimuthPolylineShape);
  // window.viewer.entities.remove(azimuthLabelEntity);
}

//cesium地球表面鼠标移动事件
function cesiumMouseMoveHandler(callback) {
  cancelMoveScreenSpaceEventHandler();
  moveScreenSpaceEventHandler.setInputAction((movement) => {
    let ray = window.viewer.camera.getPickRay(movement.endPosition);
    let earthPosition = window.viewer.scene.globe.pick(ray, window.viewer.scene);
    if (earthPosition) {
      const LatLng = cartesian3ToCartographic(earthPosition);

       //尽量求取精确的高度值
      Cesium.sampleTerrainMostDetailed(window.terrainProvider, [Cesium.Cartographic.fromDegrees(LatLng.lng, LatLng.lat)]).then(updatedPositions => {
        callback({longitude: LatLng.lng, latitude: LatLng.lat, height:updatedPositions[0].height});
      }).otherwise(() => {
        callback({longitude: LatLng.lng, latitude: LatLng.lat, height:0});
      })

    }
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
}

 //将cesium的相机调至设计位置
function goTargetPlace(target) {
    window.viewer.flyTo(target,{
      offset:new Cesium.HeadingPitchRange(0,Cesium.Math.toRadians(-90),0.0)
    });
}

//将cesium的相机调至目标位置
function goTargetPosition(longitude, latitude, height = 500) {
  window.viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, height),
  });
}

/**
 * @description: 提示信息
 * @Author: wangrenhua
 */
function hintMessageHandler(Callback) {
    cancelHintScreenSpaceEventHandler();
    let entityLabel_copy = null;
    hintScreenSpaceEventHandler.setInputAction((movement) => {
      let movePick = window.viewer.scene.pick(movement.endPosition);
      window.viewer.entities.remove(entityLabel_copy);
      if (!Cesium.defined(movePick)) return;
      
      if(typeof movePick.id === 'object'){
        if (!movePick.id.description || !movePick.id.description.getValue()) return;
        let ray = window.viewer.camera.getPickRay(movement.endPosition);
        let earthPosition = window.viewer.scene.globe.pick(ray,window.viewer.scene);
        
        if(movePick.id.description.getValue().name){
          entityLabel_copy = entityLabel(earthPosition,String(movePick.id.description.getValue().name));
        }else{
          entityLabel_copy = entityLabel(earthPosition,String(movePick.id.name));
        }
        
      }else if(typeof movePick.content === 'object'){
        if(!movePick.content.tileset || !movePick.content.tileset.debugPickedTile) return;
        let ray = window.viewer.camera.getPickRay(movement.endPosition);
        let earthPosition = window.viewer.scene.globe.pick(ray,window.viewer.scene);
        entityLabel_copy = entityLabel(earthPosition, movePick.content.tileset.debugPickedTile.name);
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    hintScreenSpaceEventHandler.setInputAction((movement) => {
      let clickPick = window.viewer.scene.pick(movement.position);
      if (!Cesium.defined(clickPick)) return;

      if(typeof clickPick.id === 'object'){
        if (!clickPick.id.description || !clickPick.id.description.getValue()) return;
        let node = window.jsTreeObj.get_node(clickPick.id.id);
        if(node){
          Callback(node);
        }else{
          node = window.jsTreeObj.get_node(clickPick.id.description.getValue().id);
          Callback(node);
        }
      }else if(typeof clickPick.content === 'object'){
        if(!clickPick.content.tileset || !clickPick.content.tileset.debugPickedTile) return;
        let node = window.jsTreeObj.get_node(clickPick.content.tileset.debugPickedTile.id);
        Callback(node);
      }
    },Cesium.ScreenSpaceEventType.RIGHT_CLICK)
}

//键盘控制事件
function keyboardControlHandler(flags){
  if(KeyboardControlEvent !== null) window.viewer.clock.onTick.removeEventListener(KeyboardControlEvent);
  KeyboardControlEvent = window.viewer.clock.onTick.addEventListener(clock => {
    if(!flags.moveForward && !flags.moveBackward && !flags.moveUp && !flags.moveDown && !flags.moveLeft && !flags.moveRight) return;

    const camera = window.viewer.camera;
    const cameraHeight = cartesianToCartographic(camera.position).height;
    const moveRate = cameraHeight / 100.0;

    if (flags.moveForward) camera.moveForward(moveRate);
    if (flags.moveBackward) camera.moveBackward(moveRate);
    if (flags.moveUp) camera.moveUp(moveRate);
    if (flags.moveDown) camera.moveDown(moveRate);
    if (flags.moveLeft) camera.moveLeft(moveRate);
    if (flags.moveRight) camera.moveRight(moveRate);
  });
}

//取消键盘控制事件
function cancelKeyboardControlHandler(){
  if(KeyboardControlEvent !== null) window.viewer.clock.onTick.removeEventListener(KeyboardControlEvent);
}

//绘制广告牌
function entityLabel(position, text) {
    let labelShape = window.viewer.entities.add({
      position,
      label: {
        text,
        showBackground: Attribute.label.showBackground,
        scale: Attribute.label.scale,
        pixelOffset: Attribute.label.pixelOffset,
        verticalOrigin: Attribute.label.verticalOrigin,
      },
    });
    return labelShape;
}

/**
 * @description: 画点
 * @Author: wangrenhua
 * @param {Object} viewer cesium创建的viewer
 * @param {Array} position 点
 * @return: 点实体
 */
 function entityPoint(position) {
    let pointShape = window.viewer.entities.add({
      name: 'point',
      position,
      point: {
        color: Color.pointColor,
        pixelSize: Attribute.point.pixelSize,
        heightReference: Attribute.point.heightReference,
      },
    });
    return pointShape;
}

/**
 * @description: 画点
 * @Author: wangrenhua
 * @param {Object} viewer cesium创建的viewer
 * @param {Array} position 点
 * @return: 点实体
 */
 function entityPointWithLabel(name, color, pixelSize, position, heightReference = null,description = null) {
  let pointShape = window.viewer.entities.add({
    name: name,
    description:description,
    position,
    point: {
      color: color,
      pixelSize: pixelSize,
      heightReference:  heightReference === null ? Attribute.point.heightReference : heightReference,
    },
    label:{
      text: name,
      font: "16px sans-serif",
      pixelOffset: new Cesium.Cartesian2(17, 0),
      horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      translucencyByDistance: new Cesium.NearFarScalar(3000000, 1, 5000000, 0),
      heightReference:  heightReference === null ? Attribute.point.heightReference : heightReference,
    }
  });
  return pointShape;
}

/**
 * @description: 绘制图形
 * @Author: wangrenhua
 * @param {Object} viewer cesium创建的viewer
 * @param {Array} Points 图形边界点
 * @return: 多边形实体
 */
function entityPolygonWithPolyline(Points, positions) {
    let polygon = window.viewer.entities.add({
      name: 'polygon',
      polygon: {
        hierarchy: Points,
        fill: Attribute.polygon.fill,
        outline: Attribute.polygon.outline,
        outlineWidth: Attribute.polygon.outlineWidth,
        outlineColor: Color.polylineColor,
        heightReference: Attribute.polygon.heightReference,
        material:  Color.polygonColor,
      },

      polyline: {
        positions,
        clampToGround: Attribute.polyline.clampToGround,
        width: Attribute.polyline.width,
        material: Color.polylineColor,
      },
    });
    return polygon;
}

/**
 * 画线
 */
function entityPolyline(name,material,positions,description = null,clampToGround = Attribute.polyline.clampToGround) {
    let polyline = window.viewer.entities.add({
      name: name,
      description:description,
      polyline: {
        positions,
        clampToGround: clampToGround,
        width: Attribute.polyline.width,
        material: material,
        zIndex: 10
      },
    });
    return polyline;
}

function entityPolygon(name,material,outlineColor,height,Cartesian3s,description = null,clampToGround = true){
  let polygon = window.viewer.entities.add({
    name,
    description: description,
    polygon: {
      hierarchy: Cartesian3s,
      height,
      fill: Attribute.polygon.fill,
      perPositionHeight: Attribute.polygon.perPositionHeight,
      material: material,
      outline: Attribute.polygon.outline,
      outlineWidth: Attribute.polygon.outlineWidth,
      outlineColor: outlineColor,
      heightReference: clampToGround ? Attribute.polygon.heightReference : Cesium.HeightReference.NONE
    },
  });

  return polygon;
}

//绘制多段线及广告牌
function entityPolylineWithLabel(name,text,material,position,positions,description = null){
  let polylineShape = window.viewer.entities.add({
    name: String(name),
    description:description,
    position,
    polyline: {
      positions,
      clampToGround: Attribute.polyline.clampToGround,
      width: Attribute.polyline.width,
      material: material,
      zIndex: 10
    },
    label: {
      text:text,
      showBackground: Attribute.label.showBackground,
      scale: Attribute.label.scale,
      pixelOffset: Attribute.label.pixelOffset,
      verticalOrigin: Attribute.label.verticalOrigin,
    },
  });
  return polylineShape;
}

/**
 * @description: 动态绘分割多段线图
 * @Author: wangrenhua
 * @param {Object} darwPolylineCallback 绘制的图形实体
 */
 function drawSplitPolylineHandler(Callback) {
  cancelDrawScreenSpaceEventHandler();

  let activePolylineShapePoints = []; //存储polygon的坐标
  let polylineShape = null;
  let tempPoint = null; //鼠标移动点

  if (activePolylineShapePoints.length === 0) {
    let dynamicPolylinePositions = new Cesium.CallbackProperty(
      () => activePolylineShapePoints,
      false
    );
    polylineShape = entityPolyline('polyline',Color.splitLineColor,dynamicPolylinePositions);
  }

  //鼠标左键捕捉地球坐标
  drawScreenSpaceEventHandler.setInputAction((event) => {
    let ray = window.viewer.camera.getPickRay(event.position);
    let earthPosition = window.viewer.scene.globe.pick(ray, window.viewer.scene);

    if (Cesium.defined(earthPosition)) {
      activePolylineShapePoints.push(earthPosition);
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  //鼠标移动
  drawScreenSpaceEventHandler.setInputAction((event) => {
    if (activePolylineShapePoints.length > 0) {
      let ray = window.viewer.camera.getPickRay(event.endPosition);
      let newPosition = window.viewer.scene.globe.pick(ray, window.viewer.scene);

      if (Cesium.defined(newPosition)) {
        //判断是否存在鼠标移动点
        if (tempPoint != '') {
          window.viewer.entities.remove(tempPoint);
        }
        // tempPoint = entityPoint('point', Cesium.Color.ORANGERED, Attribute.point.pixelSize, newPosition);
        tempPoint = entityPoint(newPosition);

        if (activePolylineShapePoints.length > 1) {
          activePolylineShapePoints.pop();
        }

        activePolylineShapePoints.push(newPosition);
      }
    }
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

  //鼠标右键
  drawScreenSpaceEventHandler.setInputAction(() => {
    if (activePolylineShapePoints.length > 0) {
      //将最后一个点从数组中弹出
      activePolylineShapePoints.pop();
    }
  }, Cesium.ScreenSpaceEventType.MIDDLE_CLICK);

  //鼠标中键取消绘制多边形
  drawScreenSpaceEventHandler.setInputAction(() => {
      if (activePolylineShapePoints.length > 0) {
          activePolylineShapePoints.pop();
      }
      if (tempPoint != '') {
          window.viewer.entities.remove(tempPoint);
      }
      cancelDrawScreenSpaceEventHandler();
      window.viewer.entities.remove(polylineShape);
      Callback(activePolylineShapePoints);
  }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
}

/**
 * @description: 动态绘制点坐标
 * @Author: wangrenhua
 * @param {Object} darwPointCallback 绘制的图形实体
 */
function drawPointHandler(darwPointCallback, darwPointEndCallback){
    cancelDrawScreenSpaceEventHandler();
    //鼠标左键捕捉地球坐标
    drawScreenSpaceEventHandler.setInputAction((event) => {
      let ray = window.viewer.camera.getPickRay(event.position);
      let newPosition = window.viewer.scene.globe.pick(ray, window.viewer.scene);
      if (Cesium.defined(newPosition)) {
        let point = entityPointWithLabel('未知点', Color.pointColor, 20, newPosition);
        let pointData = new Point('未知点', point);
        point.description = pointData;
        darwPointCallback(pointData);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    //鼠标右键取消绘制多边形
    drawScreenSpaceEventHandler.setInputAction(() => {
      cancelDrawScreenSpaceEventHandler();
      darwPointEndCallback();
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
}

/**
 * @description: 动态绘多段线图
 * @Author: wangrenhua
 * @param {Object} darwPolylineCallback 绘制的图形实体
 */
function drawPolylineHandler(darwPolylineCallback) {
    cancelDrawScreenSpaceEventHandler();

    let activePolylineShapePoints = []; //存储polygon的坐标
    let polylineShape = null;
    let tempPoint = null; //鼠标移动点

    if (activePolylineShapePoints.length === 0) {
      let dynamicPolylinePositions = new Cesium.CallbackProperty(
        () => activePolylineShapePoints,
        false
      );
      polylineShape = entityPolyline('polyline', Color.polylineColor,dynamicPolylinePositions);
    }

    //鼠标左键捕捉地球坐标
    drawScreenSpaceEventHandler.setInputAction((event) => {
      let ray = window.viewer.camera.getPickRay(event.position);
      let earthPosition = window.viewer.scene.globe.pick(ray, window.viewer.scene);

      if (Cesium.defined(earthPosition)) {
        activePolylineShapePoints.push(earthPosition);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    //鼠标移动
    drawScreenSpaceEventHandler.setInputAction((event) => {
      if (activePolylineShapePoints.length > 0) {
        let ray = window.viewer.camera.getPickRay(event.endPosition);
        let newPosition = window.viewer.scene.globe.pick(ray, window.viewer.scene);

        if (Cesium.defined(newPosition)) {
          //判断是否存在鼠标移动点
          if (tempPoint != '') {
            window.viewer.entities.remove(tempPoint);
          }
          // tempPoint = entityPoint('point', Cesium.Color.ORANGERED, Attribute.point.pixelSize, newPosition);
          tempPoint = entityPoint(newPosition);

          if (activePolylineShapePoints.length > 1) {
            activePolylineShapePoints.pop();
          }

          activePolylineShapePoints.push(newPosition);
        }
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    //鼠标右键
    drawScreenSpaceEventHandler.setInputAction(() => {
      if (activePolylineShapePoints.length > 0) {
        //将最后一个点从数组中弹出
        activePolylineShapePoints.pop();
      }
    }, Cesium.ScreenSpaceEventType.MIDDLE_CLICK);

    //鼠标中键取消绘制多边形
    drawScreenSpaceEventHandler.setInputAction(() => {
        if (activePolylineShapePoints.length > 0) {
            activePolylineShapePoints.pop();
        }
        if (tempPoint != '') {
            window.viewer.entities.remove(tempPoint);
        }
        cancelDrawScreenSpaceEventHandler();

        if(activePolylineShapePoints.length < 2) {
          window.viewer.entities.remove(polylineShape);
          darwPolylineCallback(null);
          return;
        }

        let polyline = entityPolyline('未知多段线', Color.polylineColor, activePolylineShapePoints);
        let polylineData = new Polyline('未知多段线',polyline);
        polyline.description = polylineData;

        let polylinePosition = []; 
        polyline.polyline.positions.getValue().forEach(point => {
          let LatLng = cartesian3ToCartographic(point);
          polylinePosition.push(LatLng);
        });
        polylineData.length = polylineLength(polylinePosition);
        
        window.viewer.entities.remove(polylineShape);
        darwPolylineCallback(polylineData);
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
}

/**
 * @description: 动态绘多边形图
 * @Author: wangrenhua
 * @param {Object} darwPolygonCallback 绘制的图形实体
*/
function drawPolygonHandler(darwPolygonCallback) {
    cancelDrawScreenSpaceEventHandler();

    let activePolygonShapePoints = []; //存储polygon的坐标
    let activePolylineShapePoints = []; //轮廓线的坐标
    let polygonShape = null;
    let tempPoint = null; //鼠标移动点

    if (activePolygonShapePoints.length === 0) {
      let dynamicPolygonPositions = new Cesium.CallbackProperty(
        () => new Cesium.PolygonHierarchy(activePolygonShapePoints),
        false
      );
      let dynamicPolylinePositions = new Cesium.CallbackProperty(
        () => activePolylineShapePoints,
        false
      );
      polygonShape = entityPolygonWithPolyline(
        dynamicPolygonPositions,
        dynamicPolylinePositions
      );
    }

    //鼠标左键捕捉地球坐标
    drawScreenSpaceEventHandler.setInputAction((event) => {
      let ray = window.viewer.camera.getPickRay(event.position);
      let earthPosition = window.viewer.scene.globe.pick(ray, window.viewer.scene);

      if (Cesium.defined(earthPosition)) {
        activePolygonShapePoints.push(earthPosition);
        activePolylineShapePoints.push(earthPosition);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    //鼠标移动
    drawScreenSpaceEventHandler.setInputAction((event) => {
      if (activePolygonShapePoints.length > 0) {
        let ray = window.viewer.camera.getPickRay(event.endPosition);
        let newPosition = window.viewer.scene.globe.pick(ray, window.viewer.scene);

        if (Cesium.defined(newPosition)) {
          //判断是否存在鼠标移动点
          if (tempPoint != '') {
            window.viewer.entities.remove(tempPoint);
          }
          // tempPoint = entityPoint('point', Cesium.Color.ORANGERED, Attribute.point.pixelSize, newPosition);
          tempPoint = entityPoint(newPosition);
          if (activePolygonShapePoints.length > 1) {
            activePolygonShapePoints.pop();
            activePolylineShapePoints.pop();
          }
          activePolygonShapePoints.push(newPosition);
          activePolylineShapePoints.push(newPosition);
        }
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    //鼠标右键
    drawScreenSpaceEventHandler.setInputAction(() => {
        if (activePolygonShapePoints.length > 0) {
          activePolygonShapePoints.pop();
          activePolylineShapePoints.pop();
          activePolylineShapePoints.push(activePolylineShapePoints[0]); //轮廓线，添加起始点试首尾连接
        }
  
        if (tempPoint != '') {
          window.viewer.entities.remove(tempPoint);
        }
  
        cancelDrawScreenSpaceEventHandler();
        
        if(activePolylineShapePoints.length < 4) {
          window.viewer.entities.remove(polygonShape);
          darwPolygonCallback(null);
          return;
        }

        let polygon = entityPolygon('未知多边形', Color.polygonColor,Color.polylineColor,0,activePolygonShapePoints,null);
        let polygonData = new Polygon('未知多边形',polygon);
        polygon.description = polygonData;

        let polygonPosition = []; 
        polygon.polygon.hierarchy.getValue().positions.forEach(point => {
          let LatLng = cartesian3ToCartographic(point);
          polygonPosition.push([LatLng.lng, LatLng.lat]);
        })
        if(!compareObject(polygonPosition[0],polygonPosition[polygonPosition.length - 1])) polygonPosition.push(polygonPosition[0]); 
        polygonData.acreage = polygonAcreageWithAngle(polygonPosition);
     
        window.viewer.entities.remove(polygonShape);
        darwPolygonCallback(polygonData);
      }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);


    //鼠标中键取消绘制多边形
    drawScreenSpaceEventHandler.setInputAction(() => {
        if (activePolygonShapePoints.length > 0) {
          //将最后一个点从数组中弹出
          activePolygonShapePoints.pop();
          activePolylineShapePoints.pop();
        }
    }, Cesium.ScreenSpaceEventType.MIDDLE_CLICK);
}

//绘制线段量距离
function drawPolylineWithDistanceHandler(callback){
  cancelDistanceScreenSpaceEventHandler();
  let activePolylineShapePoints = [];
  let geodesic = new Cesium.EllipsoidGeodesic();

   //鼠标左键捕捉地球坐标
   distanceScreenSpaceEventHandler.setInputAction((event) => {
    let ray = window.viewer.camera.getPickRay(event.position);
    let earthPosition = window.viewer.scene.globe.pick(ray, window.viewer.scene);

    if (Cesium.defined(earthPosition)) {
      if (activePolylineShapePoints.length === 0) {
        activePolylineShapePoints.push(earthPosition);
        let dynamicPolylinePositions = new Cesium.CallbackProperty(() => activePolylineShapePoints,false);
        let dynamicPointPositions = new Cesium.CallbackProperty(function(){
          if(activePolylineShapePoints.length <= 1) return;
          let startCartographic = Cesium.Cartographic.fromCartesian(activePolylineShapePoints[0]);
          let endCartographic = Cesium.Cartographic.fromCartesian(activePolylineShapePoints[activePolylineShapePoints.length - 1]);
          geodesic.setEndPoints(startCartographic, endCartographic);
          let midpointCartographic = geodesic.interpolateUsingFraction(0.5);
          return Cesium.Cartesian3.fromRadians(midpointCartographic.longitude,midpointCartographic.latitude);
        },false);
    
        let dynamicLabelText = new Cesium.CallbackProperty(function(){
          if(activePolylineShapePoints.length <= 1) return;
          let startCartographic = Cesium.Cartographic.fromCartesian(activePolylineShapePoints[0]);
          let endCartographic = Cesium.Cartographic.fromCartesian(activePolylineShapePoints[activePolylineShapePoints.length - 1]);
          geodesic.setEndPoints(startCartographic, endCartographic);
          let lengthInMeters = Number(geodesic.surfaceDistance.toFixed(2));
          if(lengthInMeters > 1000) return (lengthInMeters / 1000).toFixed(2) + ' km';
          return lengthInMeters + ' m';
        },false);
    
        // distancePolylineShape = entityPolyline('polyline',Color.errorColor,dynamicPolylinePositions);
        // distanceLabelEntity = entityLabel(dynamicPointPositions, dynamicLabelText);
        distancePolylineShape = entityPolylineWithLabel('polyline', dynamicLabelText, Color.errorColor, dynamicPointPositions, dynamicPolylinePositions);
      }

      activePolylineShapePoints.push(earthPosition);
      
      if (activePolylineShapePoints.length >= 3) {
        cancelDistanceScreenSpaceEventHandler();

        let text = String(distancePolylineShape.label.text.getValue());
        let position = deepCopy(distancePolylineShape.position.getValue());
        let positions = deepCopy(distancePolylineShape.polyline.positions.getValue());
        positions.pop();
        let polyline = entityPolylineWithLabel('polyline', text, Color.errorColor, position, positions);

        let polylineData = new Polyline(text, polyline);
        polyline.description = polylineData;

        let polylinePosition = []; 
        polyline.polyline.positions.getValue().forEach(point => {
          let LatLng = cartesian3ToCartographic(point);
          polylinePosition.push(LatLng);
        });
        polylineData.length = polylineLength(polylinePosition);

        //将数组清空，使绘制的直线消失
        activePolylineShapePoints.length = 0;
        callback(polylineData);
      }
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  //鼠标移动
  distanceScreenSpaceEventHandler.setInputAction((event) => {
    let ray = window.viewer.camera.getPickRay(event.endPosition);
    let newPosition = window.viewer.scene.globe.pick(ray, window.viewer.scene);

    if (Cesium.defined(newPosition)) {
      //判断是否存在鼠标移动点
      if (activePolylineShapePoints.length > 0) {
        activePolylineShapePoints.pop();
        activePolylineShapePoints.push(newPosition);
      }
    }
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
}

//绘制线段量坐标方位角
function drawPolylineWithAzimuthHandler(callback){
  cancelAzimuthScreenSpaceEventHandler();
  let activePolylineShapePoints = [];
  let geodesic = new Cesium.EllipsoidGeodesic();

   //鼠标左键捕捉地球坐标
   azimuthScreenSpaceEventHandler.setInputAction((event) => {
    let ray = window.viewer.camera.getPickRay(event.position);
    let earthPosition = window.viewer.scene.globe.pick(ray, window.viewer.scene);

    if (Cesium.defined(earthPosition)) {
      if (activePolylineShapePoints.length === 0) {
        activePolylineShapePoints.push(earthPosition);
        let dynamicPolylinePositions = new Cesium.CallbackProperty(() => activePolylineShapePoints,false);
        let dynamicPointPositions = new Cesium.CallbackProperty(function(){
          if(activePolylineShapePoints.length <= 1) return;
          let startCartographic = Cesium.Cartographic.fromCartesian(activePolylineShapePoints[0]);
          let endCartographic = Cesium.Cartographic.fromCartesian(activePolylineShapePoints[activePolylineShapePoints.length - 1]);
          geodesic.setEndPoints(startCartographic, endCartographic);
          let midpointCartographic = geodesic.interpolateUsingFraction(0.5);
          return Cesium.Cartesian3.fromRadians(midpointCartographic.longitude,midpointCartographic.latitude);
        },false);
    
        let dynamicLabelText = new Cesium.CallbackProperty(function(){
          if(activePolylineShapePoints.length <= 1) return;
          let startCartographic = Cesium.Cartographic.fromCartesian(activePolylineShapePoints[0]);
          let endCartographic = Cesium.Cartographic.fromCartesian(activePolylineShapePoints[activePolylineShapePoints.length - 1]); 
          geodesic.setEndPoints(startCartographic, endCartographic);
          let azimuth = pointsToAzimuth({lng:Cesium.Math.toDegrees(startCartographic.longitude),lat:Cesium.Math.toDegrees(startCartographic.latitude)},{lng:Cesium.Math.toDegrees(endCartographic.longitude),lat:Cesium.Math.toDegrees(endCartographic.latitude)});
          return azimuth.toFixed(3) + ' °';
        },false);
    
        // azimuthPolylineShape = entityPolyline('polyline',Color.errorColor,dynamicPolylinePositions);
        // azimuthLabelEntity = entityLabel(dynamicPointPositions, dynamicLabelText);

        azimuthPolylineShape = entityPolylineWithLabel('polyline', dynamicLabelText, Color.errorColor, dynamicPointPositions, dynamicPolylinePositions);
      }
      
      activePolylineShapePoints.push(earthPosition);
      
      if (activePolylineShapePoints.length >= 3) {
        cancelAzimuthScreenSpaceEventHandler();

        let text = String(azimuthPolylineShape.label.text.getValue());
        let position = deepCopy(azimuthPolylineShape.position.getValue());
        let positions = deepCopy(azimuthPolylineShape.polyline.positions.getValue());
        positions.pop();
        let polyline = entityPolylineWithLabel('polyline', text, Color.errorColor, position, positions);

        let polylineData = new Polyline(text, polyline);
        polyline.description = polylineData;

        let polylinePosition = []; 
        polyline.polyline.positions.getValue().forEach(point => {
          let LatLng = cartesian3ToCartographic(point);
          polylinePosition.push(LatLng);
        });
        polylineData.length = polylineLength(polylinePosition);

        //将数组清空，使绘制的直线消失
        activePolylineShapePoints.length = 0;
        callback(polylineData);
      }
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  //鼠标移动
  azimuthScreenSpaceEventHandler.setInputAction((event) => {
    let ray = window.viewer.camera.getPickRay(event.endPosition);
    let newPosition = window.viewer.scene.globe.pick(ray, window.viewer.scene);

    if (Cesium.defined(newPosition)) {
      //判断是否存在鼠标移动点
      if (activePolylineShapePoints.length > 0) {
        activePolylineShapePoints.pop();
        activePolylineShapePoints.push(newPosition);
      }
    }
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
}

//得到渐变canvas
function getColorRamp() {
  let ramp = document.createElement("canvas");
  ramp.width = 100;
  ramp.height = 1;
  let ctx = ramp.getContext("2d");
  let values = [0.0, 0.045, 0.1, 0.15, 0.37, 0.54, 1.0];
  let grd = ctx.createLinearGradient(0, 0, 100, 0);
  grd.addColorStop(values[0], "#000000"); //black
  grd.addColorStop(values[1], "#2747E0"); //blue
  grd.addColorStop(values[2], "#D33B7D"); //pink
  grd.addColorStop(values[3], "#D33038"); //red
  grd.addColorStop(values[4], "#FF9742"); //orange
  grd.addColorStop(values[5], "#ffd700"); //yellow
  grd.addColorStop(values[6], "#ffffff"); //white
  
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 100, 1);
  return ramp;
}

//得到高程坡度材料
function elevationMaterial() {
  const minHeight = -414.0; // 死海高度
  const maxHeight = 8777.0; // 珠峰高度
  let material = Cesium.Material.fromType("ElevationRamp");
  let shadingUniforms = material.uniforms;
  shadingUniforms.minimumHeight = minHeight;
  shadingUniforms.maximumHeight = maxHeight;
  shadingUniforms.image = getColorRamp();
  return material;
}

//设置图形显示或隐藏
// function setGraphShow(data,isShow){
//   if(!data) return;
//   if(data.type === "project"){
//       for(let _data of data.dataPool){
//           if(_data.type === "entity"){
//               _data.entitys.forEach(item => item.entity.show = isShow);
//           }else if(_data.type === "primitive"){
//               _data.primitives.forEach(item => item.primitive.show = isShow);
//           }
//       }
//   }else if(data.type === "entity"){
//     data.entitys.forEach(item => item.entity.show = isShow);
//   }else if(data.type === "polygon"){
//     data.entity.show = isShow;
//   }else if(data.type === "polyline"){
//     data.entity.show = isShow;
//   }else if(data.type === "point"){
//     data.entity.show = isShow;
//   }else if(data.type === "primitive"){
//     data.primitives.forEach(item => item.primitive.show = isShow);
//   }else if(data.type === "tile"){
//     data.primitive.show = isShow;
//   }
// }

//添加图层
function addImageryLayer(url, subdomains, maximumLevel, index){
  const layer = window.viewer.imageryLayers.addImageryProvider(
    new Cesium.UrlTemplateImageryProvider({
        url,
        subdomains,
        tilingScheme: new Cesium.WebMercatorTilingScheme(),
        maximumLevel
    }),index);
  return layer;
}

export {
    goTargetPlace,
    goTargetPosition,
    entityPointWithLabel,
    entityPolyline,
    entityPolygon,
    // setGraphShow,
    elevationMaterial,
    drawPointHandler,
    drawPolygonHandler,
    drawPolylineHandler,
    drawSplitPolylineHandler,
    hintMessageHandler,
    cesiumMouseMoveHandler,
    cancelMoveScreenSpaceEventHandler,
    drawPolylineWithDistanceHandler,
    drawPolylineWithAzimuthHandler,
    keyboardControlHandler,
    cancelKeyboardControlHandler,
    addImageryLayer
}