/*WGS84坐标系下的高斯正反算*/
let a = 6378137.0; //长半轴
let f1 = 298.3; //扁率倒数

//角度转弧度
function AnToH(angle) {
  return (angle * Math.PI) / 180.0;
}

//计算子午圈赤道处的曲率半径M0
function M0(a, e2) {
  return a * (1 - e2);
}

//计算辅助量
function W(e2, B) {
  return Math.sqrt(1.0 - e2 * Math.sin(B) * Math.sin(B));
}

//曲率半径
function N(a, W) {
  return a / W;
}

//计算辅助参数
function N2t(e21, B) {
  let n2 = e21 * Math.cos(B) * Math.cos(B);
  let t = Math.tan(B);

  return [n2, t];
}

//计算子午弧长计算参数
function Abyqec(e2, M0) {
  let Ac =
    1.0 +
    (3 * e2) / 4.0 +
    (45 * e2 * e2) / 64.0 +
    (175 * e2 * e2 * e2) / 256.0 +
    (11025 * e2 * e2 * e2 * e2) / 16384.0 +
    (43659 * e2 * e2 * e2 * e2 * e2) / 65536.0;
  let Bc =
    (3 * e2) / 4.0 +
    (15 * e2 * e2) / 16.0 +
    (525 * e2 * e2 * e2) / 512.0 +
    (2205 * e2 * e2 * e2 * e2) / 2048.0 +
    (72765 * e2 * e2 * e2 * e2 * e2) / 65536.0;
  let Cc =
    (15 * e2 * e2) / 64.0 +
    (105 * e2 * e2 * e2) / 256.0 +
    (2205 * e2 * e2 * e2 * e2) / 4096.0 +
    (10395 * e2 * e2 * e2 * e2 * e2) / 16384.0;
  let Dc =
    (35 * e2 * e2 * e2) / 512.0 +
    (315 * e2 * e2 * e2 * e2) / 2048.0 +
    (31185 * e2 * e2 * e2 * e2 * e2) / 131072.0;
  let Ec =
    (315 * e2 * e2 * e2 * e2) / 16384.0 +
    (3465 * e2 * e2 * e2 * e2 * e2) / 65536.0;
  let Fc = (693.0 * e2 * e2 * e2 * e2 * e2) / 131072.0;

  let a = Ac * M0;
  let b = (-Bc * M0) / 2.0;
  let y = (Cc * M0) / 4.0;
  let q = (-Dc * M0) / 6.0;
  let e = (Ec * M0) / 8.0;
  let c = (-Fc * M0) / 10.0;

  return [a, b, y, q, e, c];
}

//计算辅助量
function A0A1A2(X, B, N, t, n2) {
  let a0 = X;
  let a1 = N * Math.cos(B);
  let a2 = (N * Math.cos(B) * Math.cos(B) * t) / 2.0;
  let a3 =
    (N * Math.cos(B) * Math.cos(B) * Math.cos(B) * (1 - t * t + n2)) / 6.0;
  let a4 =
    (N *
      Math.cos(B) *
      Math.cos(B) *
      Math.cos(B) *
      Math.cos(B) *
      (5 - t * t + 9 * n2 + 4 * n2 * n2) *
      t) /
    24.0;
  let a5 =
    (N *
      Math.cos(B) *
      Math.cos(B) *
      Math.cos(B) *
      Math.cos(B) *
      Math.cos(B) *
      (5 - 18 * t * t + t * t * t * t + 14 * n2 - 58 * n2 * t * t)) /
    120.0;
  let a6 =
    (N *
      Math.cos(B) *
      Math.cos(B) *
      Math.cos(B) *
      Math.cos(B) *
      Math.cos(B) *
      Math.cos(B) *
      (61 - 58 * t * t + t * t * t * t + 270 * n2 - 330 * n2 * t * t) *
      t) /
    720.0;

  return [a0, a1, a2, a3, a4, a5, a6];
}

//计算平面坐标
function XY(a0, a1, a2, a3, a4, a5, a6, l) {
  let x0 = a0 + a2 * l * l + a4 * l * l * l * l + a6 * l * l * l * l * l * l;
  let y0 = a1 * l + a3 * l * l * l + a5 * l * l * l * l * l;

  return  {x:y0, y:x0};
}

// 计算Bf
function Bf(x, a, b, y, q, e, c) {
  let X = x;
  let B = X / a;
  let Bd = 0.0;
  do {
    let B0 = B;
    let d =
      b * Math.sin(2 * B) +
      y * Math.sin(4 * B) +
      q * Math.sin(6 * B) +
      e * Math.sin(8 * B) +
      c * Math.sin(10 * B);
    B = (X - d) / a;
    Bd = Math.abs(B - B0);
  } while (Bd >= 0.00000001);

  return B;
}

// 计算辅助量
function B0b1b2(Bf, Nf, tf, nf2, Mf) {
  let b0 = Bf;
  let b1 = 1.0 / (Nf * Math.cos(Bf));
  let b2 = -tf / (2.0 * Mf * Nf);
  let b3 = (-(1 + 2 * tf * tf + nf2) * b1) / (6 * Nf * Nf);
  let b4 = (-(5 + 3 * tf * tf + nf2 - 9 * nf2 * tf * tf) * b2) / (12 * Nf * Nf);
  let b5 =
    (-(
      5 +
      28 * tf * tf +
      24 * tf * tf * tf * tf +
      6 * nf2 +
      8 * nf2 * tf * tf
    ) *
      b1) /
    (120 * Nf * Nf * Nf * Nf);
  let b6 =
    ((61 + 90 * tf * tf + 45 * tf * tf * tf * tf) * b2) /
    (360 * Nf * Nf * Nf * Nf);

  return [b0, b1, b2, b3, b4, b5, b6];
}

// 计算大地坐标
function BL(y, L0, b0, b1, b2, b3, b4, b5, b6) {
  let B = b0 + b2 * y * y + b4 * y * y * y * y + b6 * y * y * y * y * y * y;
  let L = b1 * y + b3 * y * y * y + b5 * y * y * y * y * y + L0;
  return [B, L];
}

/**
 * @description 高斯正算
 * @Author: wangrenhua
 * @param {number} latitude 纬度
 * @param {number} longitude 经度
 * @param {number} LL 中央子午线经度
 */
function GetXY(latitude, longitude, LL) {
  let b = a - a * (1 / f1);
  let e2 = (a * a - b * b) / (a * a);
  let e21 = e2 / (1 - e2);
  let m0 = M0(a, e2);
  let L0 = LL; //按6度带计算中央子午线经度

  let B = AnToH(latitude);
  let L = AnToH(longitude);

  let n2t = N2t(e21, B);
  let abyqec = Abyqec(e2, m0);
  let X =
    abyqec[0] * B +
    abyqec[1] * Math.sin(2 * B) +
    abyqec[2] * Math.sin(4 * B) +
    abyqec[3] * Math.sin(6 * B) +
    abyqec[4] * Math.sin(8 * B) +
    abyqec[5] * Math.sin(10 * B);
  let w = W(e2, B);
  let n = N(a, w);
  let a1a2a3 = A0A1A2(X, B, n, n2t[1], n2t[0]);
  let l = L - AnToH(L0);
  let xy = XY(
    a1a2a3[0],
    a1a2a3[1],
    a1a2a3[2],
    a1a2a3[3],
    a1a2a3[4],
    a1a2a3[5],
    a1a2a3[6],
    l
  );
  return xy;
}

/**
 * @description 高斯反算
 * @Author: wangrenhua
 * @param {number} y
 * @param {number} x
 * @param {number} LL 中央子午线经度
 */
function GetLatLng(x, y, LL) {
  let b = a - a * (1 / f1);
  let e2 = (a * a - b * b) / (a * a);
  let e21 = e2 / (1 - e2);
  let m0 = M0(a, e2);
  let L0 = LL; //按6度带计算中央子午线经度

  let abyqec = Abyqec(e2, m0);

  let bf = Bf(
    y,
    abyqec[0],
    abyqec[1],
    abyqec[2],
    abyqec[3],
    abyqec[4],
    abyqec[5]
  );
  let w = W(e2, bf);
  let Mf = (a * (1 - e2)) / (w * w * w);
  let Nf = N(a, w);
  let nf2tf = N2t(e21, bf);
  let b0b1b2 = B0b1b2(bf, Nf, nf2tf[1], nf2tf[0], Mf);
  //弧度
  let bl = BL(
    x,
    AnToH(L0),
    b0b1b2[0],
    b0b1b2[1],
    b0b1b2[2],
    b0b1b2[3],
    b0b1b2[4],
    b0b1b2[5],
    b0b1b2[6]
  );

  return {lat:bl[0], lng:bl[1]}//纬度,经度
  // return [bl[1], bl[0]]; //经度，纬度，高度
}

/**
 * @description 将笛卡尔Cartesian3坐标转换为屏幕坐标
 * @param {Object} Viewer cesium创建的viewer
 * @param {Array} point 笛卡尔Cartesian3坐标
 * @return: 屏幕坐标
 */
function wgs84ToWindowCoordinatesList(point) {
  return Cesium.SceneTransforms.wgs84ToWindowCoordinates(window.viewer.scene, point);
}

/**
 * @description 笛卡尔Cartesian3坐标转换为绘图坐标（经纬度坐标）
 * @param {Object} Viewer cesium创建的viewer
 * @param {Object} cartesian3 三维笛卡尔坐标
 * @return: {纬度,经度}
 */
function cartesian3ToCartographic(cartesian3) {
  let cartographic = cartesianToCartographic(cartesian3);
  let lat = Cesium.Math.toDegrees(cartographic.latitude); //纬度
  let lng = Cesium.Math.toDegrees(cartographic.longitude); //经度
  return {lat, lng, height: cartographic.height};// {纬度,经度}
}

function cartesianToCartographic(cartesian3){
  return Cesium.Cartographic.fromCartesian(cartesian3);
}

function cartesianArrayToCartographicArray(cartesian3s){
  return window.viewer.scene.globe.ellipsoid.cartesianArrayToCartographicArray(cartesian3s);
}

//将度转换为度分秒
function degToHSM(deg) {
  let value = Math.abs(deg);
  const D = Math.floor(value); //度
  const M = Math.floor((value - D) * 60); //分
  const S = Math.round(((value - D) * 3600) % 60); //秒
  // return H + '° ' + M + '′ ' + S + '″';
  return {D, M, S};
}

// //度转度分秒
// function degToHSM(deg){
//   let D = parseInt(deg);
//   let M = parseInt((deg - D) * 60);
//   let S = Math.round(((deg - D) * 60 - M) * 60);
//   return {D, M, S}
// }

function HToAn(radians){
  return Cesium.Math.toDegrees(radians);
}

export {
  AnToH,
  HToAn,
  GetXY,
  GetLatLng,
  cartesian3ToCartographic,
  wgs84ToWindowCoordinatesList,
  cartesianToCartographic,
  cartesianArrayToCartographicArray,
  degToHSM,
};
