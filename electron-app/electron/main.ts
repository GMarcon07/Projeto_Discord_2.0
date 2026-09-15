import { app, BrowserWindow, ipcMain, desktopCapturer, Notification, shell, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import fs from 'fs';

// Necessary for Windows 10/11 native toast notifications
app.setAppUserModelId('com.aresenha.app');

interface AppConfig {
  minimizeToTray: boolean;
  disableGpu: boolean;
}

const configPath = path.join(app.getPath('userData'), 'user-config.json');

function loadConfig(): AppConfig {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (e) {
    console.error('Erro ao ler config:', e);
  }
  return { minimizeToTray: false, disableGpu: false };
}

function saveConfig(cfg: AppConfig) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf8');
  } catch (e) {
    console.error('Erro ao gravar config:', e);
  }
}

let appConfig = loadConfig();

// Disable hardware acceleration if configured by user
if (appConfig.disableGpu) {
  app.disableHardwareAcceleration();
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

function createTray() {
  if (tray) return;

  const iconPath = path.join(__dirname, '../resources/icon.png');
  let icon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty();
  
  tray = new Tray(icon);
  tray.setToolTip('A resenha');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Mostrar A resenha',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Sair',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
      }
    }
  });
}

function createWindow() {
  const iconPath = path.join(__dirname, '../resources/icon.png');
  mainWindow = new BrowserWindow({
    title: 'A resenha',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    frame: false, // Custom Discord-style titlebar
    backgroundColor: '#121316',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
  if (!app.isPackaged) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('close', (event) => {
    if (!isQuitting && appConfig.minimizeToTray) {
      event.preventDefault();
      mainWindow?.hide();
      if (Notification.isSupported()) {
        new Notification({
          title: 'A resenha',
          body: 'A aplicação continua a correr em segundo plano na barra de tarefas.'
        }).show();
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createTray();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && (!appConfig.minimizeToTray || isQuitting)) {
    app.quit();
  }
});

// -------------------------------------------------------------
// IPC Handlers
// -------------------------------------------------------------

// 1. Desktop Capturer (Screen & Window Sources for streaming)
ipcMain.handle('desktop-capturer:get-sources', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 480, height: 270 },
      fetchWindowIcons: true
    });

    return sources.map((s) => ({
      id: s.id,
      name: s.name,
      thumbnail: s.thumbnail.toDataURL(),
      appIcon: s.appIcon ? s.appIcon.toDataURL() : undefined
    }));
  } catch (error) {
    console.error('Erro ao obter fontes de captura de ecrã:', error);
    return [];
  }
});

// 2. Windows Native Notifications
ipcMain.on('notification:show', (_, { title, body }) => {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title,
      body,
      silent: false
    });

    notification.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      }
    });

    notification.show();
  }
});

// 3. Window Controls
ipcMain.on('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window:close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window:is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

// 4. System Settings (Tray, GPU)
ipcMain.handle('config:get', () => {
  return appConfig;
});

ipcMain.handle('config:set', (_, partial: Partial<AppConfig>) => {
  appConfig = { ...appConfig, ...partial };
  saveConfig(appConfig);
  return appConfig;
});

ipcMain.on('app:restart', () => {
  isQuitting = true;
  app.relaunch();
  app.exit(0);
});
