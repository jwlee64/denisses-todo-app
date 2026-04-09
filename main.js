const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Expose userData path to renderer via preload
ipcMain.on('get-user-data-path', (event) => {
  event.returnValue = app.getPath('userData');
});

function createWindow() {
  const win = new BrowserWindow({
    width: 860,
    height: 680,
    minWidth: 600,
    minHeight: 500,
    title: "Denisse's Reading Tracker",
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
