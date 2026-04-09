const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// Get userData path from main process
const userDataPath = ipcRenderer.sendSync('get-user-data-path');
const dataFile = path.join(userDataPath, 'data.json');

function readData() {
  try {
    if (fs.existsSync(dataFile)) {
      return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    }
  } catch (e) {
    console.error('Failed to read data:', e);
  }
  return { tasks: [], completions: {} };
}

function writeData(data) {
  try {
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to write data:', e);
  }
}

contextBridge.exposeInMainWorld('store', {
  readData,
  writeData,
  getVersion: () => ipcRenderer.invoke('get-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: (url) => ipcRenderer.invoke('download-update', url)
});
