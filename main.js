const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');

let win;
let showTimer = null;

// 渲染进程请求「躲起来一会儿」：隐藏窗口，到点自动回来
ipcMain.on('hide-for', (e, ms) => {
  if (!win) return;
  win.hide();
  clearTimeout(showTimer);
  showTimer = setTimeout(() => { if (win) win.show(); }, ms);
});

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const winW = 200;
  const winH = 150;

  win = new BrowserWindow({
    width: winW,
    height: winH,
    x: width - winW - 24,
    y: height - winH - 24,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    fullscreenable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // 永远浮在最上层，连全屏应用之上也能看到
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  // 右键菜单 / 托盘：退出用
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => app.quit());

// Dock 图标隐藏（纯桌宠，不占程序坞）
if (process.platform === 'darwin' && app.dock) {
  app.dock.hide();
}
