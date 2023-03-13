import { Project, Entity, Polygon, Polyline, Point, Primitive, Tile} from './Data.js';
import { cartesian3ToCartographic } from './coorTra.js';
import { compareObject } from './tool.js';
import { polylineLength , polygonAcreageWithAngle} from './turfExtras.js';
import { entityPointWithLabel } from './CesiumControl.js';
import { Color, Attribute} from './config.js';

const fs = require('fs');
const path = require('path');
const shapefile = require("shapefile");
const tj = require("@tmcw/togeojson");
const { DOMParser } = require("xmldom");
const Store = require('electron-store');
const store = new Store({clearInvalidConfig: true});

//读取shape文件
function reader(file) {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.onload = function (e) {
        resolve(e.target.result);
      };
      fileReader.onerror = reject;
      fileReader.readAsDataURL(file);
    });
}

//打开kml和kmz
function openKmlOrKmz(filePath){
  return new Promise(async (resolve, reject) => {
    try{
      let filename = path.basename(filePath).split('.')[0];
      const data = fs.readFileSync(filePath); //读取得到2进制的数据，可以正常读取kml和kmz
      const file = new File([data], filename);
      let kmlOrKmzData = await reader(file);
      const options = { camera: window.viewer.scene.camera, canvas: window.viewer.scene.canvas};
      Cesium.KmlDataSource.load(kmlOrKmzData, options).then(KmlDataSource => {
        for(let entity of KmlDataSource.entities.values){
          if(!entity.polyline) continue;
          entity.polyline = new Cesium.PolylineGraphics({
            positions: entity.polyline.positions.getValue(),
            width: entity.polyline.width,
            clampToGround: entity.polyline.clampToGround,
            material: entity.polyline.material
          })
        }
        resolve(KmlDataSource.entities.values);
      }).otherwise(reject);
    }catch(err){
      reject(err);
    }
  })
}

//打开geojson
function openGeojson(filename){
  return new Promise((resolve, reject) => {
    try{
      Cesium.GeoJsonDataSource.load(filename).then(data => resolve(data.entities.values)).otherwise(reject);
    }catch(err){
      reject(err);
    }
  })
}

//打开shape
function openShape(filename){
  return new Promise((resolve, reject) => {
    try{
     shapefile.read(filename).then(data => openGeojson(data).then(resolve).catch(reject)).catch(reject);
    }catch(err){
      reject(err);
    }
  })
}

//打开gpx
function openGpx(filename){
  return new Promise((resolve, reject) => {
    try{
      const data = new DOMParser().parseFromString(fs.readFileSync(filename,'utf-8'));
      openGeojson(tj.gpx(data)).then(resolve).catch(reject);
    }catch(err){
      reject(err);
    }
  });
}

//打开TCX
function openTcx(filename){
  return new Promise((resolve, reject) => {
    try{
      const data = new DOMParser().parseFromString(fs.readFileSync(filename,'utf-8'));
      openGeojson(tj.tcx(data)).then(resolve).catch(reject);
    }catch(err){
      reject(err);
    }
  });
}

//打开Store数据
function openStore(kmlData){
  return new Promise(async (resolve, reject) => {
    try{
      const file = new File([kmlData], 'store');
      let kmlOrKmzData = await reader(file);
      const options = {camera: window.viewer.scene.camera, canvas: window.viewer.scene.canvas};
      Cesium.KmlDataSource.load(kmlOrKmzData, options).then(KmlDataSource => {
        for(let entity of KmlDataSource.entities.values){
          if(!entity.polyline) continue;
          entity.polyline = new Cesium.PolylineGraphics({
            positions: entity.polyline.positions.getValue(),
            width: entity.polyline.width,
            clampToGround: entity.polyline.clampToGround,
            material: entity.polyline.material
          })
        }
        resolve(KmlDataSource.entities.values);
      }).otherwise(reject);
    }catch(err){
      reject(err);
    }
  })
}

//导出kml或kmz
function exportKmlOrKmz(kmz, entitys){
  return new Promise((resolve, reject) => {
    try{
      let entityCollection = new Cesium.EntityCollection();
      for(let entity of entitys) entityCollection.add(entity);

      Cesium.exportKml({
        entities: entityCollection,
        kmz: kmz
      }).then(resolve);
    }catch(err){
      reject(err);
    }
  })
}

//创建工程
function createProject(name){
  let project = new Project(name);//工程数据
  project.createNode();
 
  return project;
}

//打开文件
function readRangeFile(project, filename, kmlData = null, show = true, childrenShow = null){
  let nodeId = null;
  return new Promise(async (resolve, reject) => {
    try{
      let extname = path.extname(filename);
      let entitys = null;
      if(extname === '.geojson' || extname === '.geoJson' || extname === '.topojson' || extname === '.json'){
        entitys = await openGeojson(filename);
      }else if(extname === '.shp'){
        entitys = await openShape(filename);
      }else if(extname === '.GPX' || extname === '.Gpx' || extname === '.gpx'){
        entitys = await openGpx(filename);
      }else if(extname === '.TCX' || extname === '.Tcx' || extname === '.tcx'){
        entitys = await openTcx(filename);
      }else if( extname === '.kml' || extname === '.kmz' || extname === '.Kml' || extname === '.Kmz' || extname === '.KML' || extname === '.KMZ'){
        entitys = await openKmlOrKmz(filename);
      }else{
        if(kmlData !== null) entitys = await openStore(kmlData);
        // if(geojsonData !== null) entitys = await openGeojson(geojsonData);
      }
      if(entitys === null) reject({name:"FileError",message:"Failed to read file."});

      const name = path.basename(filename, extname);
      let entityData = new Entity(name, project, 'file', show);
      entityData.createNode();
      nodeId = entityData.id;

      for(let entity of entitys){
        entity.parent = undefined;//如果未设置，则有可能出现设置属性时发生错误

        entity.box = undefined;
        entity.corridor = undefined;
        entity.cylinder = undefined;
        entity.ellipse = undefined;
        entity.ellipsoid = undefined;
        entity.model = undefined;
        entity.path = undefined;
        entity.plane = undefined;
        entity.polylineVolume = undefined;
        entity.rectangle = undefined;
        entity.wall = undefined;
    
        entity.properties = undefined;//如果未设置，则有可能出现设置属性时发生错误
        if(entity.polygon){
          if(!entity.name) entity.name = `多边形#${entityData.entitys.length + 1}`;
          entity.polygon.fill = true;
          entity.polygon.outline = true;
          if(!entity.polygon.material) entity.polygon.material = Cesium.Color.WHITE;
          if(!entity.polygon.outlineColor) entity.polygon.outlineColor = Cesium.Color.BLACK;
          let polygon = window.viewer.entities.add(entity);
          let polygonData = new Polygon(entity.name, polygon, entityData, childrenShow.get(entity.id) ? true : false);
          polygon.description = polygonData;

          let polygonPosition = []; 
          polygon.polygon.hierarchy.getValue().positions.forEach(point => {
            let LatLng = cartesian3ToCartographic(point);
            polygonPosition.push([LatLng.lng, LatLng.lat]);
          })
          if(!compareObject(polygonPosition[0],polygonPosition[polygonPosition.length - 1])) polygonPosition.push(polygonPosition[0]); 
          polygonData.acreage = polygonAcreageWithAngle(polygonPosition);
          polygonData.createNode();
         
          
         if(childrenShow.get(entity.id)){
          polygonData.show = true;
          polygonData.selectedNode(true);
         }else{
          polygonData.show = false;
          polygonData.selectedNode(false);
         }

          entityData.entitys.push(polygonData);
        }

        if(entity.polyline){
          if(!entity.name) entity.name = `多段线#${entityData.entitys.length + 1}`;
          if(!entity.polyline.material) entity.polyline.material = Cesium.Color.WHITE;
          let polyline = window.viewer.entities.add(entity);
          let polylineData = new Polyline(entity.name, polyline, entityData, childrenShow.get(entity.id) ? true : false);
          polyline.description = polylineData;

          let polylinePosition = []; 
          polyline.polyline.positions.getValue().forEach(point => {
            let LatLng = cartesian3ToCartographic(point);
            polylinePosition.push(LatLng);
          });
          polylineData.length = polylineLength(polylinePosition);
          polylineData.createNode();
          
          // polylineData.show = childrenShow.get(entity.id) ? true : false;
          if(childrenShow.get(entity.id)){
            polylineData.show = true;
            polylineData.selectedNode(true);
          }else{
            polylineData.show = false;
            polylineData.selectedNode(false);
          }
          entityData.entitys.push(polylineData);
        }

        if(entity.billboard){
          if(!entity.name) entity.name = `点#${entityData.entitys.length + 1}`;
          let color = entity.billboard.color ? entity.billboard.color.getValue() : Color.pointColor;
          let heightReference = entity.billboard.heightReference ? entity.billboard.heightReference.getValue() : Attribute.point.heightReference;
          let point = entityPointWithLabel(entity.name, color, Attribute.point.pixelSize, entity.position, heightReference);
          let pointData = new Point(entity.name, point, entityData, childrenShow.get(entity.id) ? true : false);
          point.description = pointData;
          pointData.createNode();
         
          if(childrenShow.get(entity.id)){
            pointData.show = true;
            pointData.selectedNode(true);
          }else{
            pointData.show = false;
            pointData.selectedNode(false);
          }
          // pointData.show = childrenShow.get(entity.id) ? true : false;
          entityData.entitys.push(pointData);
        }
      }

      project.dataPool.push(entityData);
      resolve(entityData);
    }catch(err){
      if(nodeId !== null) {
        let node = window.jsTreeObj.get_node(nodeId);
        if(!node) reject(err);
        window.jsTreeObj.delete_node(node);
      }
      reject(err);
    }
  })
}

//读取创建的数据
function readCreateData(entity,geojsonData,otherData){
  return new Promise(async (resolve, reject) => {
    try{
      let parent = entity.parent;
      let entitys = await openGeojson(geojsonData);
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
              entitys[i].name = entitys.length > 1 ? `${otherData.name}#${i + 1}` : `${otherData.name}`;
              entitys[i].polygon.heightReference = Cesium.HeightReference.CLAMP_TO_GROUND;
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

          if(entitys[i].polyline){
            entitys[i].name = entitys.length > 1 ? `${otherData.name}#${i + 1}` : `${otherData.name}`;
            entitys[i].polyline.material = Color.polylineColor;
            let polyline = window.viewer.entities.add(entitys[i]);
            let polylineData = new Polyline(polyline.name, polyline, parent);
            polyline.description = polylineData;

            let polylinePosition = []; 
            polyline.polyline.positions.getValue().forEach(point => polylinePosition.push(cartesian3ToCartographic(point)));
            polylineData.length = polylineLength(polylinePosition);
            polylineData.createNode();
           
            parent.entitys.push(polylineData);
          }
      }
      resolve();
    }catch(err){
      reject(err);
    } 
  })
}

//保存文件
function saveRangeFile(filename, entitys){
  return new Promise(async (resolve, reject) => {
    try{
      let extname = path.extname(filename);
      if(extname === '.kml'){
        let result = await exportKmlOrKmz(false, entitys);
        fs.writeFileSync(filename, result.kml);
      }else if(extname === '.kmz'){
        let result = await exportKmlOrKmz(true, entitys);
        let dataBuffer = await result.kmz.arrayBuffer();
        const buffer = Buffer.from(dataBuffer);
        fs.writeFileSync(filename, buffer);
      }else if(extname === '.geojson'){
        let result = await exportKmlOrKmz(false, entitys);
        const data = new DOMParser().parseFromString(result.kml);
        const geojsonStr = tj.kml(data);
        fs.writeFileSync(filename, JSON.stringify(geojsonStr));
      }
      resolve();
    }catch(err){
      reject(err);
    }
  })
}

//保存树形数据
function storeTreeData(project){
  return new Promise(async (resolve, reject) => {
    try{
      store.delete('tree');
      for(let _data of project.dataPool){
        if(_data.type === "entity") {
          let entitys = new Array();
          let entityShows = new Map();
          _data.entitys.forEach(item => {
            entitys.push(item.entity);
            entityShows.set(item.entity.id, item.show);
          });
          let result = await exportKmlOrKmz(false, entitys);
          store.set(`tree.entity.${_data.id}`,{name:_data.name, show:_data.show, childrenShow:[...entityShows], kml:result.kml});
        }else if(_data.type === "primitive"){
          store.set(`tree.primitive.${_data.id}`,{name:_data.name, show: _data.show, path:_data.path});
        }
      }
      resolve();
    }catch(err){
      reject(err);
    }
  })
}

//读取树形数据
function readTreeData(project){
  return new Promise((resolve, reject) => {
    try{
      let tree = store.get('tree');
      if(tree === undefined) reject({name:"storeError",message:"tree is undefined."});
      let entityStore = tree.entity;
      let primitiveStore = tree.primitive;
      let _promise = [];
      if(entityStore){
        for(let id in entityStore){
          _promise.push(readRangeFile(project, entityStore[id].name, entityStore[id].kml, entityStore[id].show, new Map(entityStore[id].childrenShow)));
        }
      }
      if(primitiveStore){
        for(let id in primitiveStore){
          _promise.push(open3DTilesFile(project, primitiveStore[id].path, primitiveStore[id].name, primitiveStore[id].show));
        }
      }
      Promise.all(_promise).then(resolve).catch(reject);
    }catch(err){
      reject(err);
    }
  })
}

//打开3DTiles文件
function open3DTilesFile(project,filename,primitiveName = null, show = true){
  return new Promise((resolve, reject) => {
    try{
      let name = primitiveName === null ? path.basename(filename, path.extname(filename)) : primitiveName;
      let primitiveData = new Primitive(name, project, filename, show);
      primitiveData.createNode();

      let tileset = new Cesium.Cesium3DTileset({
        url: `file:///${filename}`,
        dynamicScreenSpaceError : true,
        dynamicScreenSpaceErrorDensity : 0.00278,
        dynamicScreenSpaceErrorFactor : 4.0,
        dynamicScreenSpaceErrorHeightFalloff : 0.25,
        skipLevelOfDetail : true,
        baseScreenSpaceError : 1024,
        skipScreenSpaceErrorFactor : 16,
        skipLevels : 1,
        immediatelyLoadDesiredLevelOfDetail : false,
        loadSiblings : false,
        cullWithChildrenBounds : true
      });

      let tile = window.viewer.scene.primitives.add(tileset);
      let tileData = new Tile(name, tile, primitiveData);
      tile.debugPickedTile = tileData;
      tileData.createNode();
      
      primitiveData.primitives.push(tileData);
      primitiveData.show = show;
      primitiveData.selectedNode(show);

      project.dataPool.push(primitiveData);
      resolve(primitiveData);
    }catch(err){
      reject(err);
    }
  })
}

export {createProject, openGeojson, readRangeFile,readCreateData, saveRangeFile,open3DTilesFile, storeTreeData, readTreeData};