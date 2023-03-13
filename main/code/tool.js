/*
 * @Descripttion:
 * @version:1.0.0
 * @Author: wangrenhua
 * @Date: 2020-07-06 09:00:09
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2023-03-02 17:10:52
 */
const assert = require('assert');
// const { ipcRenderer } = require('electron');
const loger = require('electron-log');

loger.transports.file.level = 'info';
loger.transports.console.level = false;


function isArray (value) {
  //检测数组
  return Array.isArray(value);
}

function isObject (value) {
  //检测对象
  return typeof value === 'object' && value !== null;
}

// true:数值型的，false：非数值型
function isNumber(value) {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * @description 深度复制
 * @Author: wangrenhua
 * @param {Object} obj
 */
function deepCopy (obj) {
  //递归深层copy
  /**
   * 把一个对象递归拷贝给另外一个对象
   * 源对象与拷贝后的对象没有引用关系
   */
  let obj1 = isArray(obj) ? [] : {};

  for (let property in obj) {
    // 如果当前拷贝的数据还是一个对象的话，那么继续调用
    // deepCopy 进行二次拷贝
    // 递归
    if (isObject(obj[property])) {
      obj1[property] = deepCopy(obj[property]);
    } else {
      obj1[property] = obj[property];
    }
  }
  return obj1;
}

/**
 * @description 求两点的距离
 * @Author: wangrenhua
 * @param {Object} p1 点
 * @param {Object} p2 点
 * @return {number} 距离
 */
function length (p1, p2) {
  return Math.sqrt(
    (p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y)
  );
}

/**
 * @description 根据两点坐标计算角度
 * @Author: wangrenhua
 * @param {Object} p1 点
 * @param {Object} p2 点
 * @return {number} 角度
 */
function angle (p1, p2) {
  let X = p2.x - p1.x;
  let Y = p1.y - p2.y;

  let angle = 0;

  if (X === 0) {
    if (Y > 0) {
      angle = Math.PI;
    } else if (Y < 0) {
      angle = (Math.PI * 2.0) / 3.0;
    } else {
      angle = 0;
    }
  } else {
    angle = Math.atan(Y / X);

    if (X < 0 && Y > 0) {
      //第二象限
      angle += Math.PI;
    } else if (X < 0 && Y < 0) {
      //第三象限
      angle += Math.PI;
    } else if (X > 0 && Y < 0) {
      //第四象限
      angle += 2 * Math.PI;
    }
  }

  return Math.round((angle * 180.0) / Math.PI);
}

/**
 * @description 函数防抖
 * @Author: wangrenhua
 * @param {function} fn 函数
 * @param {wait} 等待时间
 */
let timer = null;
function debounce (fn, wait, arg = null) {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  timer = setTimeout(() => {
    if (arg !== null) {
      fn(arg);
    } else {
      fn();
    }
  }, wait);
}

/**
 * @description：数组根据数组对象中的某个属性值进行排序的方法
 * 使用例子：newArray.sort(pcompare('number',false)) //表示根据number属性降序排列;若第二个参数不传递，默认表示升序排序
 * @Author: wangrenhua
 * @param attr 排序的属性 如number属性
 * @param rev true表示升序排列，false降序排序
 * */
function pcompare (prop, rev) {
  // 第二个参数没有传递，默认升序排序
  if (rev === undefined) {
    rev = 1;
  } else {
    rev = rev ? 1 : -1;
  }
  return function (obj1, obj2) {
    // 方括号也是访问对象属性的一种方式，优点是可以通过变量访问。
    // 常规写法是 var val1 = obj1.prop;var val2 = obj2.prop;,但是这种不支持变量写法，所有这里不适用
    var val1 = obj1[prop],
      val2 = obj2[prop];

    // 若是升序排序，此时rev=1,rev*-1=-1,等价于return val1 < val2 ? -1 : 1,，即val1<val2时，val1放在val2前面，否则放后面
    // 若是降序排序，下面句子等价于return val1 < val2 ? 1 : -1，即val1<val2时，val1放在val2后面，否则放在val2前面
    return val1 < val2 ? rev * -1 : rev * 1;
  };
}

/**
 * @description 射线法判断点是否在多边形内部
 * @param {Object} p 待判断的点，格式：{ x: X坐标, y: Y坐标 }
 * @param {Array} poly 多边形顶点，数组成员的格式同 p
 * @return {Boolean} 点 p 和多边形 poly 的几何关系
 */
function isInside (p, poly) {
  let px = p.x,
    py = p.y,
    flag = false;

  for (let i = 0, l = poly.length, j = l - 1; i < l; j = i, i++) {
    let sx = poly[i].x,
      sy = poly[i].y,
      tx = poly[j].x,
      ty = poly[j].y;

    // 点与多边形顶点重合
    if ((sx === px && sy === py) || (tx === px && ty === py)) {
      return true;
    }

    // 判断线段两端点是否在射线两侧
    if ((sy < py && ty >= py) || (sy >= py && ty < py)) {
      // 线段上与射线 Y 坐标相同的点的 X 坐标
      let x = sx + ((py - sy) * (tx - sx)) / (ty - sy);

      // 点在多边形的边上
      if (x === px) {
        return true;
      }

      // 射线穿过多边形的边界
      if (x > px) {
        flag = !flag;
      }
    }
  }
  // 射线穿过多边形边界的次数为奇数时点在多边形内
  return flag;
}

// num传入的数字，n需要返回的字符长度
function prefixInteger (num, n) {
  return (Array(n).join(0) + num).slice(-n);
}

//比较两个对象是否相等
function compareObject(obj1,obj2){
  try{
    assert.deepStrictEqual(obj1,obj2);
    return true;
  }catch{
    return false;
  }
}

//保留小数
function keepDecimal(num,n){
  if(num === 0) return num;
  if(!num || toString.call(num) !== '[object Number]') return;
  return num.toFixed(n);
}

//得到配置文件路径
// function getConfigFilePath(){
//   return new Promise((resolve, reject) => {
//     try{
//       ipcRenderer.on('config-file',(event,path) => resolve(path));
//       ipcRenderer.send('get-config-file','mainWindow');
//     }catch(err){
//       reject(err);
//     }
//   })
// }

//得到日志存储对象
function getLogObject(name){ 
  return loger.create(name);
}


//底部状态添加
function bottomStatusContent(status,text){
  const date = new Date();
  const content = `<li><span>[${date.getFullYear()}-${prefixInteger(date.getMonth()+1,2)}-${prefixInteger(date.getDate(),2)} ${prefixInteger(date.getHours(),2)}:${prefixInteger(date.getMinutes(),2)}:${prefixInteger(date.getSeconds(),2)}] </span><span class=${status}>${text}</span></li>`;
  $('#bottom-status-content').append(content);
}

//底部状态初始化
function bottomStatusInitialize(){
  bottomStatusContent('default','欢迎使用Cosmos。');
  bottomStatusContent('default','开放式三维世界，带给你开放式体验。');
  bottomStatusContent('default','------------------------------------------------------------------------------');
}

// //度转度分秒
// function degreeToDMS(degree){
//   let D = parseInt(degree);
//   let M = parseInt((degree - D) * 60);
//   let S = ((degree - D) * 60 - M) * 60;
//   return {D, M, S}
// }

function ajaxPromise(url, type = 'GET',dataType = 'json'){
  return new Promise((resolve, reject) => {
      $.ajax({
          url,
          type,
          dataType,
          success: resolve,
          error: reject
      })
  })
}

export { length, angle, deepCopy, debounce, pcompare, isInside, isNumber, prefixInteger, compareObject, keepDecimal, getLogObject, bottomStatusContent,bottomStatusInitialize, ajaxPromise};
