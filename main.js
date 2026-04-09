const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const GITHUB_REPO = 'jwlee64/denisses-todo-app';

// ---- IPC: userData path ----
ipcMain.on('get-user-data-path', (event) => {
  event.returnValue = app.getPath('userData');
});

// ---- IPC: current version ----
ipcMain.handle('get-version', () => app.getVersion());

// ---- IPC: check for updates ----
ipcMain.handle('check-for-updates', async () => {
  try {
    const pkgRes = await fetch(
      `https://raw.githubusercontent.com/${GITHUB_REPO}/main/package.json`
    );
    if (!pkgRes.ok) return { hasUpdate: false };
    const pkg = await pkgRes.json();
    const latestVersion = pkg.version;
    const currentVersion = app.getVersion();

    if (!isNewer(latestVersion, currentVersion)) {
      return { hasUpdate: false, currentVersion, latestVersion };
    }

    // Get download URL from latest release
    const releaseRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      { headers: { 'User-Agent': 'DenissesTodo' } }
    );
    if (!releaseRes.ok) return { hasUpdate: true, latestVersion, currentVersion, downloadUrl: null };
    const release = await releaseRes.json();
    const dmg = release.assets.find(a => a.name.endsWith('.dmg'));
    return {
      hasUpdate: true,
      currentVersion,
      latestVersion,
      downloadUrl: dmg ? dmg.browser_download_url : null
    };
  } catch (e) {
    return { hasUpdate: false };
  }
});

// ---- IPC: download + open update ----
ipcMain.handle('download-update', async (_event, url) => {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
    const buffer = await res.arrayBuffer();
    const dest = path.join(os.tmpdir(), 'DenissesTodo-update.dmg');
    fs.writeFileSync(dest, Buffer.from(buffer));
    shell.openPath(dest);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// ---- Version comparison ----
function isNewer(latest, current) {
  const parse = v => v.replace(/^v/, '').split('.').map(Number);
  const [la, lb, lc] = parse(latest);
  const [ca, cb, cc] = parse(current);
  if (la !== ca) return la > ca;
  if (lb !== cb) return lb > cb;
  return lc > cc;
}

// ---- Window ----
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
      sandbox: false,
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
