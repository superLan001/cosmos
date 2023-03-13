/*
 * @Version: 1.0
 * @Autor: wangrenhua
 * @Description: 切割多边形
 * @Date: 2021-09-06 16:40:44
 * @FilePath: \Cosmos\main\code\turfExtras.js
 * @LastEditTime: 2022-03-09 09:59:16
 */
const {point,multiPoint,lineString,distance,lineIntersect,polygon,booleanPointInPolygon,lineSlice,area,bearingToAzimuth,bearing,length,buffer,bezierSpline,union,difference,featureCollection,cleanCoords,explode} = require('@turf/turf');

//使用线切割面
function polygonClipByLine(polygon_o,Line, tolerance = 0.001, toleranceType ='kilometers'){
    let polygon_copy = [];
    let line_copy = [];
    for(let i = 0;i < polygon_o.length;i++) polygon_copy.push([polygon_o[i].lng, polygon_o[i].lat]);
    polygon_copy.push([polygon_o[0].lng, polygon_o[0].lat]);

    for(let i = 0;i < Line.length;i++) line_copy.push([Line[i].lng, Line[i].lat]);

    let poly = polygon([polygon_copy]);
    let line = lineString(line_copy);

    if(booleanPointInPolygon(point(line.geometry.coordinates[0]), poly) || booleanPointInPolygon(point(line.geometry.coordinates[line.geometry.coordinates.length - 1]), poly)){
        throw {state : 'error',message:'起点和终点必须在多边形之外'};
    }

    //计算交点，并把线的点合并
    let _lineIntersect = lineIntersect(line,poly);
    const lineExp =  explode(line);
    for (let i = 0; i < lineExp.features.length - 1; i++) {
        _lineIntersect.features.push(point(lineExp.features[i].geometry.coordinates));
    }

     //计算线的缓冲区
    const lineBuffer = buffer(line, tolerance, {units: toleranceType});

    //计算线缓冲和多边形的difference，返回"MultiPolygon"，所以将其拆开
    const _body = difference(poly, lineBuffer);
    let pieces = [];
    if (_body.geometry.type === 'Polygon') {
        pieces.push(polygon(_body.geometry.coordinates));
    } else {
        _body.geometry.coordinates.forEach(function (a) { pieces.push(polygon(a))});
    }

    //处理点数据
    for (let p in pieces) {
        const piece = pieces[p];
        for (let c in piece.geometry.coordinates[0]) {
            const coord = piece.geometry.coordinates[0][c];
            const p = point(coord);
            for (let lp in _lineIntersect.features) {
                const lpoint = _lineIntersect.features[lp];
                if (distance(lpoint, p, toleranceType) <= tolerance*2) {
                    piece.geometry.coordinates[0][c] = lpoint.geometry.coordinates;
                }
            }
        }
    }

    //过滤掉重复点
    for (let p in pieces) {
        const coords = pieces[p].geometry.coordinates[0];
        let points = cleanCoords(multiPoint(coords)).geometry.coordinates;
        points.push(points[0]);
        pieces[p].geometry.coordinates[0] = points;
    }

    //将属性赋予每一个polygon，并处理id
    pieces.forEach((a, index) => {
        a.properties = Object.assign({}, poly.properties)
        a.properties.id += `-${index}`
    });
    return featureCollection(pieces);
}

//使用经纬度计算多边形面积
function polygonAcreageWithAngle(polygon_o){
    return area(polygon([polygon_o]));
}

//角度转坐标方位角
function angleToAzimuth(angle){
    return bearingToAzimuth(angle);
}

//由两点求坐标方位角
function pointsToAzimuth(point1,point2){
    const point1_t = point([point1.lng, point1.lat]);
    const point2_t = point([point2.lng, point2.lat]);
    return angleToAzimuth(bearing(point1_t, point2_t));
}

//多段线长度
function polylineLength(polyline){
    let _lines = [];
    for(let point of polyline) _lines.push([point.lng, point.lat]);
    return length(lineString(_lines), {units: 'kilometers'});
}

//计算缓冲区
function pointToBuffer(point1, expend){
    const point_ = point([point1.lng, point1.lat]);
    return buffer(point_, expend, {units: 'kilometers'});
}

//平滑多段线
function polylineToBezierSpline(polyline){
    let _lines = [];
    for(let point of polyline) _lines.push([point.lng, point.lat]);
    let line = lineString(_lines);
    return bezierSpline(line);
}

//合并多边形
function polygonUnion(_polygon,polygons){
    let poly = polygon([_polygon]);
    for(let i = 0;i < polygons.length;i++) poly = union(poly,polygon([polygons[i]]));
    return poly;
}

export {
    polygonClipByLine,
    polygonAcreageWithAngle,
    pointsToAzimuth,
    polylineLength,
    polylineToBezierSpline,
    pointToBuffer,
    polygonUnion
}