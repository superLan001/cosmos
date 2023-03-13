/*
 * @Version: 1.0
 * @Autor: wangrenhua
 * @Description: 
 * @Date: 2021-08-17 11:12:21
 * @FilePath: \Cosmos\main.js
 */
const {app, BrowserWindow, ipcMain, dialog, Menu, MenuItem, shell, session} = require('electron');
const {autoUpdater} = require("electron-updater");
const log = require('electron-log');
const Store = require('electron-store');
app.commandLine.appendSwitch("force_high_performance_gpu");//强制使用独立GPU

const appName = "Cosmos"; //应用名称
Store.initRenderer();

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
if (app.isPackaged) autoUpdater.logger.transports.console.level = false;
autoUpdater.autoDownload = false;//取消自动下载
autoUpdater.allowPrerelease = true; //是否允许升级到预发布版本（仅github）
const store = new Store({clearInvalidConfig: true});

let windows = {};
let mainWindow;

function createWindow () {
  let window = new BrowserWindow({
      title: appName,
      width: 1400,
      height: 800,
      minWidth: 1400,
      minHeight: 800,
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        nativeWindowOpen: true,
        devTools: app.isPackaged ? false : true,
      },
  });

  window.setMenu(Menu.buildFromTemplate(mainMenu));
  window.loadFile('./main/index.html');
  window.maximize();
  if (!app.isPackaged) window.webContents.openDevTools();
  return window;
}

app.whenReady().then(() => {
  const filter = {urls: ['https://*.tianditu.gov.cn/*']};
  session.defaultSession.webRequest.onHeadersReceived(filter, (details, callback) => {
    if(details.responseHeaders && details.responseHeaders['Set-Cookie']){
      for(let i = 0;i < details.responseHeaders['Set-Cookie'].length;i++) details.responseHeaders['Set-Cookie'][i] += ";SameSite=None;Secure";
    }
    callback({ responseHeaders: details.responseHeaders});
  })
  
  mainWindow = createWindow();
  mainWindow.webContents.setWindowOpenHandler(handler => {
    if(handler.frameName === '' || handler.frameName === null) return {action: 'deny'};
    return {action: 'allow'};
  });
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.webContents.on('dom-ready',() => mainWindow.webContents.send('mainWindow-ready'));



  windows['mainWindow'] = mainWindow;
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin'){
    app.quit();
  }
});

//自动更新区域
//检查更新
autoUpdater.on('checking-for-update', (message) => {
  log.info("checking for update");
});

//存在可用的更新
autoUpdater.on('update-available', (message) => {
  let totalSize = 0;
  if(message.files) message.files.forEach(file => totalSize += file.size);
  let data = {path: message.path, version: message.version, releaseDate: message.releaseDate, totalSize: (totalSize / 1024 / 1024).toFixed(1)};
  if(windows['mainWindow']) windows['mainWindow'].webContents.send('updater-update-available', data);
  log.info(`update available ${message.version}`);
});

//不存在可用的更新
autoUpdater.on('update-not-available', (message) => {
  dialog.showMessageBox(mainWindow,{
    message: "当前没有可用的更新",
    type: "info",
    buttons: ['确定'],
    noLink: true,
    title: appName,
  })
  log.info('update not available');
});

//更新过程中存在错误
autoUpdater.on('error', (message) => {
  dialog.showMessageBox(mainWindow,{
    message: "版本更新下载出错，请手动下载安装",
    type: "error",
    buttons: ['确定'],
    noLink: true,
    title: `${appName} 更新`
  })
  log.error(message);
});

//更新的进度
autoUpdater.on('download-progress', (progressObj) => {
  if(windows['mainWindow']) windows['mainWindow'].webContents.send('updater-download-progress', progressObj);
});

//更新包下载完成
autoUpdater.on('update-downloaded', (message) => {
  log.info(`update downloaded`);
  autoUpdater.quitAndInstall();
});

//手动下载更新
ipcMain.on("download-update",() => {
  autoUpdater.downloadUpdate().catch(error => log.error(error));
});

//创建顶部目录
const mainMenu = [
  {
    label: "文件(F)",
    submenu: [
      { label: "打开文件", accelerator: "CommandOrControl+Alt+A",click:importFileWindow},
      { label: "打开自定义矢量图形文件", accelerator: "CommandOrControl+Alt+S",click:() => mainWindow.webContents.send('customHandler')},
      { label: '打开3DTiles三维模型数据文件夹', accelerator: "CommandOrControl+Alt+I", click: create3DTilesWindow},
      { label: '导入地形数据文件夹', accelerator: "CommandOrControl+Alt+T", click: createOfflineTerrainWindow},
      { type: "separator" },
      {label: "搜索", accelerator: "CommandOrControl+Alt+F", click:() => mainWindow.webContents.send('searchHandler')},
      { type: "separator" },
      { label: "最小化", role: "minimize" },
      { label: "最大化", role: "togglefullscreen" },
      { type: "separator" },
      { label: "退出", role: "quit" },
    ],
  },
  {
    label: "编辑(E)",
    submenu: [
      { label: "绘制点", accelerator: "CommandOrControl+Alt+M", click:() => mainWindow.webContents.send('pointHandler')},
      { label: "绘制线段", accelerator: "CommandOrControl+Alt+L", click:() => mainWindow.webContents.send('polylineHandler')},
      { label: "绘制多边形", accelerator: "CommandOrControl+Alt+P", click:() => mainWindow.webContents.send('polygonHandler')},
      { type: "separator" },
      { label: "缩小窗口10%", role: "zoomOut" },
      { label: "放大窗口10%", role: "zoomIn" },
      { label: "重置窗口大小", role: "resetzoom" },
      { label: "刷新当前窗口", role: "reload" },
    ],
  },
  {
    label: "工具(T)",
    submenu: [
      { label: "测量距离", accelerator: "CommandOrControl+Alt+D",click:() => mainWindow.webContents.send('measuringDistanceHandler')},
      { label: "测量坐标方位角", accelerator: "CommandOrControl+A",click:() => mainWindow.webContents.send('measuringAzimuthHandler')},
      { label: "键盘控制", type: "checkbox", accelerator: "CommandOrControl+K", checked: false, click:(e) => mainWindow.webContents.send('keyboardControlHandler', {checked: e.checked})},
    ],
  },
  {
    label: "视图(V)",
    submenu: [
      {label: "资源管理器", accelerator: "CommandOrControl+Alt+E", click: () => mainWindow.webContents.send('setProjectCloseHandler')},
      {label: "状态栏", accelerator: "CommandOrControl+Alt+Z", click: () => mainWindow.webContents.send('setStatusCloseHandler')},
      { type: "separator" },
      {
        label: "地图",
        submenu: [
          {label: "天地图影像", submenu:[
            {label: "无", type: "radio", checked: store.get('TiandituImgW') === 0 ? true:false, click: () => mainWindow.webContents.send('setTiandituImgWHandler',{maximumLevel:0})},
            {label: "一级", type: "radio", checked: store.get('TiandituImgW') === 1 ? true:false, click: () => mainWindow.webContents.send('setTiandituImgWHandler',{maximumLevel:1})},
            {label: "二级", type: "radio", checked: store.get('TiandituImgW') === 2 ? true:false, click: () => mainWindow.webContents.send('setTiandituImgWHandler',{maximumLevel:2})},
            {label: "三级", type: "radio", checked: store.get('TiandituImgW') === 3 ? true:false, click: () => mainWindow.webContents.send('setTiandituImgWHandler',{maximumLevel:3})},
            {label: "四级", type: "radio", checked: store.get('TiandituImgW') === 4 ? true:false, click: () => mainWindow.webContents.send('setTiandituImgWHandler',{maximumLevel:4})},
            {label: "五级", type: "radio", checked: store.get('TiandituImgW') === 5 ? true:false, click: () => mainWindow.webContents.send('setTiandituImgWHandler',{maximumLevel:5})},
            {label: "六级", type: "radio", checked: store.get('TiandituImgW') === 6 ? true:false, click: () => mainWindow.webContents.send('setTiandituImgWHandler',{maximumLevel:6})},
            {label: "七级", type: "radio", checked: store.get('TiandituImgW') === 7 ? true:false, click: () => mainWindow.webContents.send('setTiandituImgWHandler',{maximumLevel:7})},
            {label: "八级", type: "radio", checked: store.get('TiandituImgW') === 8 ? true:false, click: () => mainWindow.webContents.send('setTiandituImgWHandler',{maximumLevel:8})},
            {label: "九级", type: "radio", checked: store.get('TiandituImgW') === 9 ? true:false, click: () => mainWindow.webContents.send('setTiandituImgWHandler',{maximumLevel:9})},
            {label: "十级", type: "radio", checked: store.get('TiandituImgW') === 10 ? true:false, click: () => mainWindow.webContents.send('setTiandituImgWHandler',{maximumLevel:10})},
            {label: "十一级", type: "radio", checked: store.get('TiandituImgW') === 11 ? true:false, click: () => mainWindow.webContents.send('setTiandituImgWHandler',{maximumLevel:11})},
            {label: "十二级", type: "radio", checked: store.get('TiandituImgW') === 12 ? true:false, click: () => mainWindow.webContents.send('setTiandituImgWHandler',{maximumLevel:12})},
            {label: "十三级", type: "radio", checked: store.get('TiandituImgW') === 13 ? true:false, click: () => mainWindow.webContents.send('setTiandituImgWHandler',{maximumLevel:13})},
            {label: "十四级", type: "radio", checked: store.get('TiandituImgW') === 14 ? true:false, click: () => mainWindow.webContents.send('setTiandituImgWHandler',{maximumLevel:14})},
            {label: "十五级", type: "radio", checked: store.get('TiandituImgW') === 15 ? true:false, click: () => mainWindow.webContents.send('setTiandituImgWHandler',{maximumLevel:15})},
            {label: "十六级", type: "radio", checked: store.get('TiandituImgW') === 16 ? true:false, click: () => mainWindow.webContents.send('setTiandituImgWHandler',{maximumLevel:16})},
            {label: "十七级", type: "radio", checked: store.get('TiandituImgW') === 17 ? true:false, click: () => mainWindow.webContents.send('setTiandituImgWHandler',{maximumLevel:17})},
            {label: "十八级", type: "radio", checked: store.get('TiandituImgW') === 18 ? true:false, click: () => mainWindow.webContents.send('setTiandituImgWHandler',{maximumLevel:18})},
          ]},
          {label: "天地图矢量", submenu:[
            {label: "无", type: "radio", checked: store.get('TiandituVecW') === 0 ? true:false, click: () => mainWindow.webContents.send('setTiandituVecWHandler',{maximumLevel:0})},
            {label: "一级", type: "radio", checked: store.get('TiandituVecW') === 1 ? true:false, click: () => mainWindow.webContents.send('setTiandituVecWHandler',{maximumLevel:1})},
            {label: "二级", type: "radio", checked: store.get('TiandituVecW') === 2 ? true:false, click: () => mainWindow.webContents.send('setTiandituVecWHandler',{maximumLevel:2})},
            {label: "三级", type: "radio", checked: store.get('TiandituVecW') === 3 ? true:false, click: () => mainWindow.webContents.send('setTiandituVecWHandler',{maximumLevel:3})},
            {label: "四级", type: "radio", checked: store.get('TiandituVecW') === 4 ? true:false, click: () => mainWindow.webContents.send('setTiandituVecWHandler',{maximumLevel:4})},
            {label: "五级", type: "radio", checked: store.get('TiandituVecW') === 5 ? true:false, click: () => mainWindow.webContents.send('setTiandituVecWHandler',{maximumLevel:5})},
            {label: "六级", type: "radio", checked: store.get('TiandituVecW') === 6 ? true:false, click: () => mainWindow.webContents.send('setTiandituVecWHandler',{maximumLevel:6})},
            {label: "七级", type: "radio", checked: store.get('TiandituVecW') === 7 ? true:false, click: () => mainWindow.webContents.send('setTiandituVecWHandler',{maximumLevel:7})},
            {label: "八级", type: "radio", checked: store.get('TiandituVecW') === 8 ? true:false, click: () => mainWindow.webContents.send('setTiandituVecWHandler',{maximumLevel:8})},
            {label: "九级", type: "radio", checked: store.get('TiandituVecW') === 9 ? true:false, click: () => mainWindow.webContents.send('setTiandituVecWHandler',{maximumLevel:9})},
            {label: "十级", type: "radio", checked: store.get('TiandituVecW') === 10 ? true:false, click: () => mainWindow.webContents.send('setTiandituVecWHandler',{maximumLevel:10})},
            {label: "十一级", type: "radio", checked: store.get('TiandituVecW') === 11 ? true:false, click: () => mainWindow.webContents.send('setTiandituVecWHandler',{maximumLevel:11})},
            {label: "十二级", type: "radio", checked: store.get('TiandituVecW') === 12 ? true:false, click: () => mainWindow.webContents.send('setTiandituVecWHandler',{maximumLevel:12})},
            {label: "十三级", type: "radio", checked: store.get('TiandituVecW') === 13 ? true:false, click: () => mainWindow.webContents.send('setTiandituVecWHandler',{maximumLevel:13})},
            {label: "十四级", type: "radio", checked: store.get('TiandituVecW') === 14 ? true:false, click: () => mainWindow.webContents.send('setTiandituVecWHandler',{maximumLevel:14})},
            {label: "十五级", type: "radio", checked: store.get('TiandituVecW') === 15 ? true:false, click: () => mainWindow.webContents.send('setTiandituVecWHandler',{maximumLevel:15})},
            {label: "十六级", type: "radio", checked: store.get('TiandituVecW') === 16 ? true:false, click: () => mainWindow.webContents.send('setTiandituVecWHandler',{maximumLevel:16})},
            {label: "十七级", type: "radio", checked: store.get('TiandituVecW') === 17 ? true:false, click: () => mainWindow.webContents.send('setTiandituVecWHandler',{maximumLevel:17})},
            {label: "十八级", type: "radio", checked: store.get('TiandituVecW') === 18 ? true:false, click: () => mainWindow.webContents.send('setTiandituVecWHandler',{maximumLevel:18})},
          ]},
          {label: "天地图地形晕渲图", submenu:[
            {label: "无", type: "radio", checked: store.get('TiandituTerW') === 0? true: false, click: () => mainWindow.webContents.send('setTiandituTerWHandler',{maximumLevel:0})},
            {label: "一级", type: "radio", checked: store.get('TiandituTerW') === 1? true: false, click: () => mainWindow.webContents.send('setTiandituTerWHandler',{maximumLevel:1})},
            {label: "二级", type: "radio", checked: store.get('TiandituTerW') === 2? true: false, click: () => mainWindow.webContents.send('setTiandituTerWHandler',{maximumLevel:2})},
            {label: "三级", type: "radio", checked: store.get('TiandituTerW') === 3? true: false, click: () => mainWindow.webContents.send('setTiandituTerWHandler',{maximumLevel:3})},
            {label: "四级", type: "radio", checked: store.get('TiandituTerW') === 4? true: false, click: () => mainWindow.webContents.send('setTiandituTerWHandler',{maximumLevel:4})},
            {label: "五级", type: "radio", checked: store.get('TiandituTerW') === 5? true: false, click: () => mainWindow.webContents.send('setTiandituTerWHandler',{maximumLevel:5})},
            {label: "六级", type: "radio", checked: store.get('TiandituTerW') === 6? true: false, click: () => mainWindow.webContents.send('setTiandituTerWHandler',{maximumLevel:6})},
            {label: "七级", type: "radio", checked: store.get('TiandituTerW') === 7? true: false, click: () => mainWindow.webContents.send('setTiandituTerWHandler',{maximumLevel:7})},
            {label: "八级", type: "radio", checked: store.get('TiandituTerW') === 8? true: false, click: () => mainWindow.webContents.send('setTiandituTerWHandler',{maximumLevel:8})},
            {label: "九级", type: "radio", checked: store.get('TiandituTerW') === 9? true: false, click: () => mainWindow.webContents.send('setTiandituTerWHandler',{maximumLevel:9})},
            {label: "十级", type: "radio", checked: store.get('TiandituTerW') === 10? true: false, click: () => mainWindow.webContents.send('setTiandituTerWHandler',{maximumLevel:10})},
            {label: "十一级", type: "radio", checked: store.get('TiandituTerW') === 11? true: false, click: () => mainWindow.webContents.send('setTiandituTerWHandler',{maximumLevel:11})},
            {label: "十二级", type: "radio", checked: store.get('TiandituTerW') === 12? true: false, click: () => mainWindow.webContents.send('setTiandituTerWHandler',{maximumLevel:12})},
            {label: "十三级", type: "radio", checked: store.get('TiandituTerW') === 13? true: false, click: () => mainWindow.webContents.send('setTiandituTerWHandler',{maximumLevel:13})},
            {label: "十四级", type: "radio", checked: store.get('TiandituTerW') === 14? true: false, click: () => mainWindow.webContents.send('setTiandituTerWHandler',{maximumLevel:14})},
          ]},
          {label: "天地图国界", submenu:[
            {label: "无", type: "radio", checked: store.get('TiandituIboW') === 0 ? true : false, click: () => mainWindow.webContents.send('setTiandituIboWHandler',{maximumLevel:0})},
            {label: "一级", type: "radio", checked: store.get('TiandituIboW') === 1 ? true : false, click: () => mainWindow.webContents.send('setTiandituIboWHandler',{maximumLevel:1})},
            {label: "二级", type: "radio", checked: store.get('TiandituIboW') === 2 ? true : false, click: () => mainWindow.webContents.send('setTiandituIboWHandler',{maximumLevel:2})},
            {label: "三级", type: "radio", checked: store.get('TiandituIboW') === 3 ? true : false, click: () => mainWindow.webContents.send('setTiandituIboWHandler',{maximumLevel:3})},
            {label: "四级", type: "radio", checked: store.get('TiandituIboW') === 4 ? true : false, click: () => mainWindow.webContents.send('setTiandituIboWHandler',{maximumLevel:4})},
            {label: "五级", type: "radio", checked: store.get('TiandituIboW') === 5 ? true : false, click: () => mainWindow.webContents.send('setTiandituIboWHandler',{maximumLevel:5})},
            {label: "六级", type: "radio", checked: store.get('TiandituIboW') === 6 ? true : false, click: () => mainWindow.webContents.send('setTiandituIboWHandler',{maximumLevel:6})},
            {label: "七级", type: "radio", checked: store.get('TiandituIboW') === 7 ? true : false, click: () => mainWindow.webContents.send('setTiandituIboWHandler',{maximumLevel:7})},
            {label: "八级", type: "radio", checked: store.get('TiandituIboW') === 8 ? true : false, click: () => mainWindow.webContents.send('setTiandituIboWHandler',{maximumLevel:8})},
            {label: "九级", type: "radio", checked: store.get('TiandituIboW') === 9 ? true : false, click: () => mainWindow.webContents.send('setTiandituIboWHandler',{maximumLevel:9})},
            {label: "十级", type: "radio", checked: store.get('TiandituIboW') === 10 ? true : false, click: () => mainWindow.webContents.send('setTiandituIboWHandler',{maximumLevel:10})},
          ]},
          {label: "天地图注记", submenu:[
            {label: "无", type: "radio", checked: store.get('TiandituCvaW') === 0 ? true : false, click: () => mainWindow.webContents.send('setTiandituCvaWHandler',{maximumLevel:0})},
            {label: "一级", type: "radio", checked: store.get('TiandituCvaW') === 1 ? true : false, click: () => mainWindow.webContents.send('setTiandituCvaWHandler',{maximumLevel:1})},
            {label: "二级", type: "radio", checked: store.get('TiandituCvaW') === 2 ? true : false, click: () => mainWindow.webContents.send('setTiandituCvaWHandler',{maximumLevel:2})},
            {label: "三级", type: "radio", checked: store.get('TiandituCvaW') === 3 ? true : false, click: () => mainWindow.webContents.send('setTiandituCvaWHandler',{maximumLevel:3})},
            {label: "四级", type: "radio", checked: store.get('TiandituCvaW') === 4 ? true : false, click: () => mainWindow.webContents.send('setTiandituCvaWHandler',{maximumLevel:4})},
            {label: "五级", type: "radio", checked: store.get('TiandituCvaW') === 5 ? true : false, click: () => mainWindow.webContents.send('setTiandituCvaWHandler',{maximumLevel:5})},
            {label: "六级", type: "radio", checked: store.get('TiandituCvaW') === 6 ? true : false, click: () => mainWindow.webContents.send('setTiandituCvaWHandler',{maximumLevel:6})},
            {label: "七级", type: "radio", checked: store.get('TiandituCvaW') === 7 ? true : false, click: () => mainWindow.webContents.send('setTiandituCvaWHandler',{maximumLevel:7})},
            {label: "八级", type: "radio", checked: store.get('TiandituCvaW') === 8 ? true : false, click: () => mainWindow.webContents.send('setTiandituCvaWHandler',{maximumLevel:8})},
            {label: "九级", type: "radio", checked: store.get('TiandituCvaW') === 9 ? true : false, click: () => mainWindow.webContents.send('setTiandituCvaWHandler',{maximumLevel:9})},
            {label: "十级", type: "radio", checked: store.get('TiandituCvaW') === 10 ? true : false, click: () => mainWindow.webContents.send('setTiandituCvaWHandler',{maximumLevel:10})},
            {label: "十一级", type: "radio", checked: store.get('TiandituCvaW') === 11 ? true : false, click: () => mainWindow.webContents.send('setTiandituCvaWHandler',{maximumLevel:11})},
            {label: "十二级", type: "radio", checked: store.get('TiandituCvaW') === 12 ? true : false, click: () => mainWindow.webContents.send('setTiandituCvaWHandler',{maximumLevel:12})},
            {label: "十三级", type: "radio", checked: store.get('TiandituCvaW') === 13 ? true : false, click: () => mainWindow.webContents.send('setTiandituCvaWHandler',{maximumLevel:13})},
            {label: "十四级", type: "radio", checked: store.get('TiandituCvaW') === 14 ? true : false, click: () => mainWindow.webContents.send('setTiandituCvaWHandler',{maximumLevel:14})},
            {label: "十五级", type: "radio", checked: store.get('TiandituCvaW') === 15 ? true : false, click: () => mainWindow.webContents.send('setTiandituCvaWHandler',{maximumLevel:15})},
            {label: "十六级", type: "radio", checked: store.get('TiandituCvaW') === 16 ? true : false, click: () => mainWindow.webContents.send('setTiandituCvaWHandler',{maximumLevel:16})},
            {label: "十七级", type: "radio", checked: store.get('TiandituCvaW') === 17 ? true : false, click: () => mainWindow.webContents.send('setTiandituCvaWHandler',{maximumLevel:17})},
            {label: "十八级", type: "radio", checked: store.get('TiandituCvaW') === 18 ? true : false, click: () => mainWindow.webContents.send('setTiandituCvaWHandler',{maximumLevel:18})},
          ]},
          {label: "天地图道路网", submenu:[
            {label: "无", type: "radio", checked: store.get('TiandituCiaW') === 0 ? true : false, click: () => mainWindow.webContents.send('setTiandituCiaWHandler',{maximumLevel:0})},
            {label: "一级", type: "radio", checked: store.get('TiandituCiaW') === 1 ? true : false, click: () => mainWindow.webContents.send('setTiandituCiaWHandler',{maximumLevel:1})},
            {label: "二级", type: "radio", checked: store.get('TiandituCiaW') === 2 ? true : false, click: () => mainWindow.webContents.send('setTiandituCiaWHandler',{maximumLevel:2})},
            {label: "三级", type: "radio", checked: store.get('TiandituCiaW') === 3 ? true : false, click: () => mainWindow.webContents.send('setTiandituCiaWHandler',{maximumLevel:3})},
            {label: "四级", type: "radio", checked: store.get('TiandituCiaW') === 4 ? true : false, click: () => mainWindow.webContents.send('setTiandituCiaWHandler',{maximumLevel:4})},
            {label: "五级", type: "radio", checked: store.get('TiandituCiaW') === 5 ? true : false, click: () => mainWindow.webContents.send('setTiandituCiaWHandler',{maximumLevel:5})},
            {label: "六级", type: "radio", checked: store.get('TiandituCiaW') === 6 ? true : false, click: () => mainWindow.webContents.send('setTiandituCiaWHandler',{maximumLevel:6})},
            {label: "七级", type: "radio", checked: store.get('TiandituCiaW') === 7 ? true : false, click: () => mainWindow.webContents.send('setTiandituCiaWHandler',{maximumLevel:7})},
            {label: "八级", type: "radio", checked: store.get('TiandituCiaW') === 8 ? true : false, click: () => mainWindow.webContents.send('setTiandituCiaWHandler',{maximumLevel:8})},
            {label: "九级", type: "radio", checked: store.get('TiandituCiaW') === 9 ? true : false, click: () => mainWindow.webContents.send('setTiandituCiaWHandler',{maximumLevel:9})},
            {label: "十级", type: "radio", checked: store.get('TiandituCiaW') === 10 ? true : false, click: () => mainWindow.webContents.send('setTiandituCiaWHandler',{maximumLevel:10})},
            {label: "十一级", type: "radio", checked: store.get('TiandituCiaW') === 11 ? true : false, click: () => mainWindow.webContents.send('setTiandituCiaWHandler',{maximumLevel:11})},
            {label: "十二级", type: "radio", checked: store.get('TiandituCiaW') === 12 ? true : false, click: () => mainWindow.webContents.send('setTiandituCiaWHandler',{maximumLevel:12})},
            {label: "十三级", type: "radio", checked: store.get('TiandituCiaW') === 13 ? true : false, click: () => mainWindow.webContents.send('setTiandituCiaWHandler',{maximumLevel:13})},
            {label: "十四级", type: "radio", checked: store.get('TiandituCiaW') === 14 ? true : false, click: () => mainWindow.webContents.send('setTiandituCiaWHandler',{maximumLevel:14})},
            {label: "十五级", type: "radio", checked: store.get('TiandituCiaW') === 15 ? true : false, click: () => mainWindow.webContents.send('setTiandituCiaWHandler',{maximumLevel:15})},
            {label: "十六级", type: "radio", checked: store.get('TiandituCiaW') === 16 ? true : false, click: () => mainWindow.webContents.send('setTiandituCiaWHandler',{maximumLevel:16})},
            {label: "十七级", type: "radio", checked: store.get('TiandituCiaW') === 17 ? true : false, click: () => mainWindow.webContents.send('setTiandituCiaWHandler',{maximumLevel:17})},
            {label: "十八级", type: "radio", checked: store.get('TiandituCiaW') === 18 ? true : false, click: () => mainWindow.webContents.send('setTiandituCiaWHandler',{maximumLevel:18})},
          ]},
          { type: "separator" },
          {label: "星图地球影像", submenu:[
            {label: "无", type: "radio", checked: store.get('GeovisearthImgW') === 0 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthImgWHandler',{maximumLevel:0})},
            {label: "一级", type: "radio", checked: store.get('GeovisearthImgW') === 1 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthImgWHandler',{maximumLevel:1})},
            {label: "二级", type: "radio", checked: store.get('GeovisearthImgW') === 2 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthImgWHandler',{maximumLevel:2})},
            {label: "三级", type: "radio", checked: store.get('GeovisearthImgW') === 3 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthImgWHandler',{maximumLevel:3})},
            {label: "四级", type: "radio", checked: store.get('GeovisearthImgW') === 4 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthImgWHandler',{maximumLevel:4})},
            {label: "五级", type: "radio", checked: store.get('GeovisearthImgW') === 5 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthImgWHandler',{maximumLevel:5})},
            {label: "六级", type: "radio", checked: store.get('GeovisearthImgW') === 6 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthImgWHandler',{maximumLevel:6})},
            {label: "七级", type: "radio", checked: store.get('GeovisearthImgW') === 7 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthImgWHandler',{maximumLevel:7})},
            {label: "八级", type: "radio", checked: store.get('GeovisearthImgW') === 8 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthImgWHandler',{maximumLevel:8})},
            {label: "九级", type: "radio", checked: store.get('GeovisearthImgW') === 9 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthImgWHandler',{maximumLevel:9})},
            {label: "十级", type: "radio", checked: store.get('GeovisearthImgW') === 10 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthImgWHandler',{maximumLevel:10})},
            {label: "十一级", type: "radio", checked: store.get('GeovisearthImgW') === 11 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthImgWHandler',{maximumLevel:11})},
            {label: "十二级", type: "radio", checked: store.get('GeovisearthImgW') === 12 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthImgWHandler',{maximumLevel:12})},
            {label: "十三级", type: "radio", checked: store.get('GeovisearthImgW') === 13 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthImgWHandler',{maximumLevel:13})},
            {label: "十四级", type: "radio", checked: store.get('GeovisearthImgW') === 14 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthImgWHandler',{maximumLevel:14})},
            {label: "十五级", type: "radio", checked: store.get('GeovisearthImgW') === 15 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthImgWHandler',{maximumLevel:15})},
            {label: "十六级", type: "radio", checked: store.get('GeovisearthImgW') === 16 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthImgWHandler',{maximumLevel:16})},
            {label: "十七级", type: "radio", checked: store.get('GeovisearthImgW') === 17 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthImgWHandler',{maximumLevel:17})},
            {label: "十八级", type: "radio", checked: store.get('GeovisearthImgW') === 18 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthImgWHandler',{maximumLevel:18})},
          ]},
          {label: "星图地球矢量", submenu:[
            {label: "无", type: "radio", checked: store.get('GeovisearthVecW') === 0 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthVecWHandler',{maximumLevel:0})},
            {label: "一级", type: "radio", checked: store.get('GeovisearthVecW') === 1 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthVecWHandler',{maximumLevel:1})},
            {label: "二级", type: "radio", checked: store.get('GeovisearthVecW') === 2 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthVecWHandler',{maximumLevel:2})},
            {label: "三级", type: "radio", checked: store.get('GeovisearthVecW') === 3 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthVecWHandler',{maximumLevel:3})},
            {label: "四级", type: "radio", checked: store.get('GeovisearthVecW') === 4 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthVecWHandler',{maximumLevel:4})},
            {label: "五级", type: "radio", checked: store.get('GeovisearthVecW') === 5 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthVecWHandler',{maximumLevel:5})},
            {label: "六级", type: "radio", checked: store.get('GeovisearthVecW') === 6 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthVecWHandler',{maximumLevel:6})},
            {label: "七级", type: "radio", checked: store.get('GeovisearthVecW') === 7 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthVecWHandler',{maximumLevel:7})},
            {label: "八级", type: "radio", checked: store.get('GeovisearthVecW') === 8 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthVecWHandler',{maximumLevel:8})},
            {label: "九级", type: "radio", checked: store.get('GeovisearthVecW') === 9 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthVecWHandler',{maximumLevel:9})},
            {label: "十级", type: "radio", checked: store.get('GeovisearthVecW') === 10 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthVecWHandler',{maximumLevel:10})},
            {label: "十一级", type: "radio", checked: store.get('GeovisearthVecW') === 11 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthVecWHandler',{maximumLevel:11})},
            {label: "十二级", type: "radio", checked: store.get('GeovisearthVecW') === 12 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthVecWHandler',{maximumLevel:12})},
            {label: "十三级", type: "radio", checked: store.get('GeovisearthVecW') === 13 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthVecWHandler',{maximumLevel:13})},
            {label: "十四级", type: "radio", checked: store.get('GeovisearthVecW') === 14 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthVecWHandler',{maximumLevel:14})},
            {label: "十五级", type: "radio", checked: store.get('GeovisearthVecW') === 15 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthVecWHandler',{maximumLevel:15})},
            {label: "十六级", type: "radio", checked: store.get('GeovisearthVecW') === 16 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthVecWHandler',{maximumLevel:16})}
          ]},
          {label: "星图地球地形晕渲图", submenu:[
            {label: "无", type: "radio", checked: store.get('GeovisearthTerW') === 0 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthTerWHandler',{maximumLevel:0})},
            {label: "一级", type: "radio", checked: store.get('GeovisearthTerW') === 1 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthTerWHandler',{maximumLevel:1})},
            {label: "二级", type: "radio", checked: store.get('GeovisearthTerW') === 2 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthTerWHandler',{maximumLevel:2})},
            {label: "三级", type: "radio", checked: store.get('GeovisearthTerW') === 3 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthTerWHandler',{maximumLevel:3})},
            {label: "四级", type: "radio", checked: store.get('GeovisearthTerW') === 4 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthTerWHandler',{maximumLevel:4})},
            {label: "五级", type: "radio", checked: store.get('GeovisearthTerW') === 5 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthTerWHandler',{maximumLevel:5})},
            {label: "六级", type: "radio", checked: store.get('GeovisearthTerW') === 6 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthTerWHandler',{maximumLevel:6})},
            {label: "七级", type: "radio", checked: store.get('GeovisearthTerW') === 7 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthTerWHandler',{maximumLevel:7})},
            {label: "八级", type: "radio", checked: store.get('GeovisearthTerW') === 8 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthTerWHandler',{maximumLevel:8})},
            {label: "九级", type: "radio", checked: store.get('GeovisearthTerW') === 9 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthTerWHandler',{maximumLevel:9})},
            {label: "十级", type: "radio", checked: store.get('GeovisearthTerW') === 10 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthTerWHandler',{maximumLevel:10})},
            {label: "十一级", type: "radio", checked: store.get('GeovisearthTerW') === 11 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthTerWHandler',{maximumLevel:11})}
          ]},
          {label: "星图地球道路网", submenu:[
            {label: "无", type: "radio", checked: store.get('GeovisearthCiaW') === 0 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthCiaWHandler',{maximumLevel:0})},
            {label: "一级", type: "radio", checked: store.get('GeovisearthCiaW') === 1 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthCiaWHandler',{maximumLevel:1})},
            {label: "二级", type: "radio", checked: store.get('GeovisearthCiaW') === 2 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthCiaWHandler',{maximumLevel:2})},
            {label: "三级", type: "radio", checked: store.get('GeovisearthCiaW') === 3 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthCiaWHandler',{maximumLevel:3})},
            {label: "四级", type: "radio", checked: store.get('GeovisearthCiaW') === 4 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthCiaWHandler',{maximumLevel:4})},
            {label: "五级", type: "radio", checked: store.get('GeovisearthCiaW') === 5 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthCiaWHandler',{maximumLevel:5})},
            {label: "六级", type: "radio", checked: store.get('GeovisearthCiaW') === 6 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthCiaWHandler',{maximumLevel:6})},
            {label: "七级", type: "radio", checked: store.get('GeovisearthCiaW') === 7 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthCiaWHandler',{maximumLevel:7})},
            {label: "八级", type: "radio", checked: store.get('GeovisearthCiaW') === 8 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthCiaWHandler',{maximumLevel:8})},
            {label: "九级", type: "radio", checked: store.get('GeovisearthCiaW') === 9 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthCiaWHandler',{maximumLevel:9})},
            {label: "十级", type: "radio", checked: store.get('GeovisearthCiaW') === 10 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthCiaWHandler',{maximumLevel:10})},
            {label: "十一级", type: "radio", checked: store.get('GeovisearthCiaW') === 11 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthCiaWHandler',{maximumLevel:11})},
            {label: "十二级", type: "radio", checked: store.get('GeovisearthCiaW') === 12 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthCiaWHandler',{maximumLevel:12})},
            {label: "十三级", type: "radio", checked: store.get('GeovisearthCiaW') === 13 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthCiaWHandler',{maximumLevel:13})},
            {label: "十四级", type: "radio", checked: store.get('GeovisearthCiaW') === 14 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthCiaWHandler',{maximumLevel:14})},
            {label: "十五级", type: "radio", checked: store.get('GeovisearthCiaW') === 15 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthCiaWHandler',{maximumLevel:15})},
            {label: "十六级", type: "radio", checked: store.get('GeovisearthCiaW') === 16 ? true:false, click: () => mainWindow.webContents.send('setGeovisearthCiaWHandler',{maximumLevel:16})}
          ]},
        ]
      },
      {
        label: "地形", submenu: [
          {label: "隐藏地形", type: "radio", checked: store.get('HideTerrain') !== undefined ? store.get('HideTerrain'): true,click: () => mainWindow.webContents.send('setHideTerrainHandler')},
          {label: "渲染地形", type: "radio", checked: store.get('ShowTerrain') !== undefined ? store.get('ShowTerrain'): false,click: () => mainWindow.webContents.send('setShowTerrainHandler')},
        ]
      },
      {label: "地形遮挡", type: "checkbox", checked: store.get('DepthTestAgainstTerrain') !== undefined ? store.get('DepthTestAgainstTerrain'): false, click:(e) => mainWindow.webContents.send('setDepthTestAgainstTerrainHandler', {checked: e.checked})},
      {label: "高程坡度图", type: "checkbox", checked: store.get('ElevationMaterial') !== undefined ? store.get('ElevationMaterial'): false, click:(e) => mainWindow.webContents.send('setElevationMaterialHandler', {checked: e.checked})},
      { type: "separator" },
      {label: "天空盒", type: "checkbox", checked: store.get('SkyBox') !== undefined ? store.get('SkyBox'): true, click:(e) => mainWindow.webContents.send('setSkyBoxHandler', {checked: e.checked})},
      {label: "大气层", type: "checkbox", checked: store.get('SkyAtmosphere') !== undefined ? store.get('SkyAtmosphere'): true, click:(e) => mainWindow.webContents.send('setSkyAtmosphereHandler', {checked: e.checked})},
      {label: "太阳", type: "checkbox", checked: store.get('Sun') !== undefined ? store.get('Sun'): true, click:(e) => mainWindow.webContents.send('setSunHandler', {checked: e.checked})},
      {label: "月亮", type: "checkbox", checked: store.get('Moon') !== undefined ? store.get('Moon'): true, click:(e) => mainWindow.webContents.send('setMoonHandler', {checked: e.checked})},
      { type: "separator" },
      {label: "罗盘", type: "checkbox", accelerator: "CommandOrControl+Alt+C", checked: store.get('Compass') !== undefined ? store.get('Compass'): true, click:(e) => mainWindow.webContents.send('setCompassHandler', {checked: e.checked})},
      {label: "比例尺", type: "checkbox", accelerator: "CommandOrControl+B", checked: store.get('DistanceLegend') !== undefined ? store.get('DistanceLegend'): true, click:(e) => mainWindow.webContents.send('setDistanceLegendHandler', {checked: e.checked})},
      { type: "separator" },
      {label: "位置信息", type: "checkbox", accelerator: "CommandOrControl+Alt+P", checked: store.get('Position') !== undefined ? store.get('Position'): false,click: (e) => mainWindow.webContents.send('setPositionHandler',{checked: e.checked})},
    ],
  },
  {
    label: "帮助(H)",
    submenu: [
      { label: "发行说明" , click:() => {shell.openExternal('https://gitee.com/dark_blue123/cosmos-package/releases')}},
      { label: "个人社区" ,accelerator: "CommandOrControl+P", click:() => {shell.openExternal('https://www.zhihu.com/people/shen-lan-48-25-1/posts')}},
      { type: "separator" },
      { label: "检查更新...", click:() => autoUpdater.checkForUpdatesAndNotify()},
      { label: "问题反馈" , accelerator: "CommandOrControl+Alt+W", click:() => {
        let detail = `使用过程中遇到问题，联系方式如下：\r\n`;
        detail += `QQ：1354334501\r\n`;
        detail += `邮箱：superwrh@foxmail.com\r\n`;
        dialog.showMessageBox(mainWindow,{
          message: appName,
          detail,
          type: "info",
          buttons: ['确定'],
          noLink: true,
          title: appName,
        });
      }},
      { type: "separator" },
      { label: "关于" ,click: () => {
        let time = new Date(process.getCreationTime());
        let detail = `版本: ${ app.getVersion() }\r\n`;
        detail += `日期: ${ time.toISOString() }\r\n`;
        detail += `Electron: ${ process.versions.electron }\r\n`;
        detail += `Chrome: ${ process.versions.chrome }\r\n`;
        detail += `Node: ${ process.versions.node }\r\n`;
        detail += `V8: ${ process.versions.v8 }\r\n`;
        detail += `OS: ${ process.env.OS } ${ process.arch } ${ process.getSystemVersion() }`;
        dialog.showMessageBox(mainWindow,{
          message: appName,
          detail,
          type: "info",
          buttons: ['确定'],
          noLink: true,
          title: appName,
        });
      }},
    ],
  },
];

//数据集目录
ipcMain.on('projectMenu',(event,arg) => {
  let menu = new Menu();
  menu.append(new MenuItem({ label: '打开文件', accelerator: "CommandOrControl+Alt+A", click: importFileWindow}));
  menu.append(new MenuItem({ label: '打开自定义矢量图形文件', accelerator: "CommandOrControl+Alt+S", click: () => mainWindow.webContents.send('customHandler')}));
  menu.append(new MenuItem({ label: '打开3DTiles三维模型数据文件夹', accelerator: "CommandOrControl+Alt+I", click: create3DTilesWindow}));
  menu.append(new MenuItem({ type: 'separator'}));
  menu.append(new MenuItem({ label: '清除', click: () => mainWindow.webContents.send('clearProject',{id:arg.id})}));
  menu.popup(mainWindow);
});

//实体集合右键菜单
ipcMain.on('entityMenu', (event,arg) => {
  let menu = new Menu();
  menu.append(new MenuItem({ label: '去目标位置', click: () => mainWindow.webContents.send('goTargetEntitys',{id:arg.id})}));
  menu.append(new MenuItem({ label: '将位置另存为...', click:() => exportFileWindow(arg.name, arg.id)}));
  menu.append(new MenuItem({ label: '重命名',click:() => mainWindow.webContents.send('reEntitysName',{id:arg.id})}));
  menu.append(new MenuItem({ type: 'separator'}));
  menu.append(new MenuItem({ label: '显示', click:() => mainWindow.webContents.send('showEntitys',{id:arg.id})}));
  menu.append(new MenuItem({ label: '隐藏', click:() => mainWindow.webContents.send('hideEntitys',{id:arg.id})}));
  menu.append(new MenuItem({ label: '删除', click:() => mainWindow.webContents.send('deleteEntitys',{id:arg.id})}));
  menu.append(new MenuItem({ type: 'separator'}));
  menu.append(new MenuItem({ label: '属性', click:() => mainWindow.webContents.send('natureEntity',{id:arg.id})}));
  menu.popup(mainWindow);
})

//多边形右键菜单
ipcMain.on('polygonMenu', (event,arg) => {
  let menu = new Menu();
  menu.append(new MenuItem({ label: '去目标位置', click: () => mainWindow.webContents.send('goTargetPlace',{id:arg.id})}));
  menu.append(new MenuItem({ label: '将位置另存为...', click:() => exportFileWindow(arg.name,arg.id)}));
  menu.append(new MenuItem({ label: '重命名',click:() => mainWindow.webContents.send('rePlaceName',{id:arg.id})}));
  menu.append(new MenuItem({ type: 'separator'}));
  menu.append(new MenuItem({ label: '缓冲区',click:() => mainWindow.webContents.send('expendEntity',{id:arg.id})}));
  menu.append(new MenuItem({ label: '合并',click:() => mainWindow.webContents.send('mergePolygon',{id:arg.id})}));
  menu.append(new MenuItem({ label: '分割',click:() => mainWindow.webContents.send('splitPolygon',{id:arg.id})}));
  menu.append(new MenuItem({ type: 'separator'}));
  menu.append(new MenuItem({ label: '显示',click:() => mainWindow.webContents.send('showEntity',{id:arg.id})}));
  menu.append(new MenuItem({ label: '隐藏',click:() => mainWindow.webContents.send('hideEntity',{id:arg.id})}));
  menu.append(new MenuItem({ label: '删除',click:() => mainWindow.webContents.send('deleteEntity',{id:arg.id})}));
  menu.append(new MenuItem({ type: 'separator'}));
  menu.append(new MenuItem({ label: '属性',click:() => mainWindow.webContents.send('naturePolygon',{id:arg.id})}));
  menu.popup(mainWindow);
})

//多段线右键菜单
ipcMain.on('polylineMenu', (event,arg) => {
  let menu = new Menu();
  menu.append(new MenuItem({ label: '去目标位置', click: () => mainWindow.webContents.send('goTargetPlace',{id:arg.id})}));
  menu.append(new MenuItem({ label: '将位置另存为...', click:() => exportFileWindow(arg.name,arg.id)}));
  menu.append(new MenuItem({ label: '重命名',click:() => mainWindow.webContents.send('rePlaceName',{id:arg.id})}));
  menu.append(new MenuItem({ type: 'separator'}));
  menu.append(new MenuItem({ label: '缓冲区',click:() => mainWindow.webContents.send('expendEntity',{id:arg.id})}));
  menu.append(new MenuItem({ label: '平滑',click:() => mainWindow.webContents.send('bezierSplineEntity',{id:arg.id})}));
  menu.append(new MenuItem({ type: 'separator'}));
  menu.append(new MenuItem({ label: '显示', click:() => mainWindow.webContents.send('showEntity',{id:arg.id})}));
  menu.append(new MenuItem({ label: '隐藏', click:() => mainWindow.webContents.send('hideEntity',{id:arg.id})}));
  menu.append(new MenuItem({ label: '删除',click:() => mainWindow.webContents.send('deleteEntity',{id:arg.id})}));
  menu.append(new MenuItem({ type: 'separator'}));
  menu.append(new MenuItem({ label: '属性', click:() => mainWindow.webContents.send('naturePolyline',{id:arg.id})}));
  menu.popup(mainWindow);
})

//点右键菜单
ipcMain.on('pointMenu', (event,arg) => {
  let menu = new Menu();
  menu.append(new MenuItem({ label: '去目标位置', click: () => mainWindow.webContents.send('goTargetPlace',{id:arg.id})}));
  menu.append(new MenuItem({ label: '将位置另存为...', click:() => exportFileWindow(arg.name,arg.id)}));
  menu.append(new MenuItem({ label: '重命名',click:() => mainWindow.webContents.send('rePlaceName',{id:arg.id})}));
  menu.append(new MenuItem({ type: 'separator'}));
  menu.append(new MenuItem({ label: '缓冲区',click:() => mainWindow.webContents.send('expendEntity',{id:arg.id})}));
  menu.append(new MenuItem({ type: 'separator'}));
  menu.append(new MenuItem({ label: '显示', click:() => mainWindow.webContents.send('showEntity',{id:arg.id})}));
  menu.append(new MenuItem({ label: '隐藏', click:() => mainWindow.webContents.send('hideEntity',{id:arg.id})}));
  menu.append(new MenuItem({ label: '删除',click:() => mainWindow.webContents.send('deleteEntity',{id:arg.id})}));
  menu.append(new MenuItem({ type: 'separator'}));
  menu.append(new MenuItem({ label: '属性', click:() => mainWindow.webContents.send('naturePoint',{id:arg.id})}));
  menu.popup(mainWindow);
})

//图元集合数据右键菜单
ipcMain.on('primitiveMenu', (event,arg) => {
  let menu = new Menu();
  menu.append(new MenuItem({ label: '去目标位置', click: () => mainWindow.webContents.send('goTargetPrimitives',{id:arg.id})}));
  menu.append(new MenuItem({ label: '重命名',click:() => mainWindow.webContents.send('rePrimitivesName',{id:arg.id})}));
  menu.append(new MenuItem({ type: 'separator'}));
  menu.append(new MenuItem({ label: '显示', click:() => mainWindow.webContents.send('showPrimitives',{id:arg.id})}));
  menu.append(new MenuItem({ label: '隐藏', click:() => mainWindow.webContents.send('hidePrimitives',{id:arg.id})}));
  menu.append(new MenuItem({ label: '删除', click:() => mainWindow.webContents.send('deletePrimitives',{id:arg.id})}));
  menu.append(new MenuItem({ type: 'separator'}));
  menu.append(new MenuItem({ label: '属性', click:() => mainWindow.webContents.send('naturePrimitive',{id:arg.id})}));
  menu.popup(mainWindow);
})

//模型右键菜单
ipcMain.on('TileMenu', (event,arg) => {
  let menu = new Menu();
  menu.append(new MenuItem({ label: '去目标位置', click: () => mainWindow.webContents.send('goTargetPlace',{id:arg.id})}));
  menu.append(new MenuItem({ label: '重命名',click:() => mainWindow.webContents.send('rePlaceName',{id:arg.id})}));
  // menu.append(new MenuItem({ label: '位置',click:() => mainWindow.webContents.send('locationTile',{id:arg.id})}));
  menu.append(new MenuItem({ type: 'separator'}));
  menu.append(new MenuItem({ label: '显示', click:() => mainWindow.webContents.send('showTile',{id:arg.id})}));
  menu.append(new MenuItem({ label: '隐藏', click:() => mainWindow.webContents.send('hideTile',{id:arg.id})}));
  menu.append(new MenuItem({ label: '删除',click:() => mainWindow.webContents.send('deleteTile',{id:arg.id})}));
  menu.append(new MenuItem({ type: 'separator'}));
  menu.append(new MenuItem({ label: '属性', click:() => mainWindow.webContents.send('natureTile',{id:arg.id})}));
  menu.popup(mainWindow);
})

//选择高程数据文件夹
function createOfflineTerrainWindow(){
  dialog.showOpenDialog(mainWindow,{
    title: '请选择高程数据文件夹(仅支持地形瓦片数据)',
    properties: ['openDirectory']
  }).then(result =>{
    if(result.canceled) return;//没传入文件则退出
    mainWindow.webContents.send('setOfflineTerrainHandler',result);
  })
}

//选择3DTiles数据文件夹
function create3DTilesWindow(){
  dialog.showOpenDialog(mainWindow,{
    title: '请选择3DTiles数据文件夹(文件夹内应包含metadata和Production文件)',
    properties: ['openDirectory']
  }).then(result =>{
    if(result.canceled) return;//没传入文件则退出
    mainWindow.webContents.send('set3DTilesHandler',result);
  })
}

//创建打开文件窗口
function importFileWindow(){
  dialog.showOpenDialog(mainWindow,{
    title: '打开文件[WGS84]',
    filters: [
      { name: 'kml文件', extensions: ['kml', 'kmz', 'Kml', 'Kmz', 'KML', 'KMZ'] },
      { name: 'shp文件', extensions: ['shp'] },
      { name: 'geojson文件', extensions: ['geojson', 'geoJson', 'topojson', 'geo.json', 'json'] },
      { name: 'GPX(GPS eXchange Format)文件', extensions: ['GPX','Gpx','gpx'] },
      { name: 'Garmin TCX(Training Center Database)文件', extensions: ['TCX','Tcx','tcx'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile','multiSelections']
  }).then(result =>{
    if(result.canceled) return;//没传入文件则退出
    mainWindow.webContents.send('importFileHandler',result);
  })
}

//创建保存区域边界文件窗口
function exportFileWindow(fileName,id){
  dialog.showSaveDialog(mainWindow,{
    title: '将数据另存为...',
    filters: [
      { name: 'kml文件', extensions: ['kml'] },
      { name: 'kmz文件', extensions: ['kmz'] },
      { name: 'geojson文件', extensions: ['geojson'] },
    ],
    defaultPath: fileName,
    properties: ['createDirectory','showOverwriteConfirmation']
  }).then(result =>{
    if(result.canceled) return;//没传入文件则退出
    mainWindow.webContents.send('saveFile',{id,filePath:result.filePath});
  })
}

//创建窗口
function createChildWindow(type, options, url = null){
  let ChildWindow = new BrowserWindow({
    title: options.title ?? "Electron",
    width: options.width,
    height: options.height,
    x: options.x ?? null,
    y: options.y ?? null,
    parent: windows[options.parent] ?? mainWindow,
    center: options.center ?? true,
    modal: options.modal ?? false,
    resizable: options.resizable ?? true,
    movable: options.movable ?? true,
    minimizable: options.minimizable ?? true,
    maximizable: options.maximizable ?? true,
    autoHideMenuBar: options.autoHideMenuBar ?? true,
    type: options.type ?? null,
    alwaysOnTop: options.alwaysOnTop ?? false,
    fullscreenable: false,
    show: false,
    webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        nativeWindowOpen: true,
        devTools: app.isPackaged ? false : true,
      }
  });

  ChildWindow.loadFile(url);
  if (!app.isPackaged) ChildWindow.webContents.openDevTools();
  
  ChildWindow.webContents.setWindowOpenHandler(handler => {
    if(handler.frameName === '' || handler.frameName === null) return {action: 'deny'};
    return {action: 'allow'};
  })

  ChildWindow.once('ready-to-show', () => ChildWindow.show());
  ChildWindow.on('close',() => ChildWindow.hide()); //避免关闭窗口时闪烁

  ChildWindow.on('closed', () => {
    ChildWindow.destroy();
    ChildWindow = null;
    windows[type] = null;
  });

  return ChildWindow;
}

//导入文件
ipcMain.on('importFile', importFileWindow);

//创建窗口
ipcMain.on('createChildWindow', (event, arg) => {
  if(!windows[arg.type]){
    windows[arg.type] = createChildWindow(arg.type,arg.options,arg.url);
    windows[arg.type].webContents.on('dom-ready',() =>{
      windows[arg.type].webContents.send('data',{type:arg.type, data:arg.data});
      windows[arg.main].webContents.send(arg.type + '-ready', arg.data);
    });
  }
});

//交换数据
ipcMain.on('data',(event, arg) => {
  if(windows[arg.target]) windows[arg.target].webContents.send(arg.sendName,arg.data);
  if(windows[arg.windowType]){ if(arg.close) windows[arg.windowType].close();};
});

//关闭窗口
ipcMain.on('close',(event, arg) => {
  if(windows[arg.windowType]){ if(arg.close) windows[arg.windowType].close();};
});

//打开自定义文件文件
ipcMain.on('openCustomFile',(event, arg) => {
  dialog.showOpenDialog(mainWindow,{
    title: '打开文件自定义图形数据文件...',
    filters: [
      { name: 'txt', extensions: ['txt'] },
      { name: 'csv', extensions: ['csv'] },
    ],
    properties: ['openFile']
  }).then(result =>{
    if(result.canceled) return;//没传入文件则退出
    windows[arg.windowType].webContents.send('customFileHandler',result);
  })
});