import { app, BrowserWindow, ipcMain, desktopCapturer, Notification, shell, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { spawn, execSync } from 'child_process';

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

// -------------------------------------------------------------
// 5. Local Server Management IPC
// -------------------------------------------------------------

// Get Local IPv4 network addresses (for LAN friends)
ipcMain.handle('server:get-network-ips', () => {
  const interfaces = os.networkInterfaces();
  const ips: Array<{ name: string; address: string; family: string }> = [];
  for (const [name, netList] of Object.entries(interfaces)) {
    if (!netList) continue;
    for (const net of netList) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push({ name, address: net.address, family: net.family });
      }
    }
  }
  return ips;
});

// Open folder in Windows Explorer
ipcMain.handle('server:open-folder', async (_, folderPath: string) => {
  const repoRoot = app.isPackaged
    ? path.dirname(app.getPath('exe'))
    : path.resolve(__dirname, '../..');

  let target = folderPath;
  if (!path.isAbsolute(target)) {
    target = path.join(repoRoot, folderPath);
  }
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
  await shell.openPath(target);
  return target;
});

// Check if a server is online and responding to /health
ipcMain.handle('server:check-health', async (_, url: string) => {
  try {
    const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    const res = await fetch(`${cleanUrl}/health`, { signal: AbortSignal.timeout(2500) });
    const data = await res.json();
    return { ok: res.ok, data };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
});

// Control local server process (Start, Stop, Restart)
let localServerChild: any = null;

ipcMain.handle('server:control', async (_, action: 'start' | 'stop' | 'restart', port = 3001) => {
  const repoRoot = app.isPackaged
    ? path.dirname(app.getPath('exe'))
    : path.resolve(__dirname, '../..');
  const serverDist = path.join(repoRoot, 'server', 'dist', 'index.js');

  const killPort = () => {
    try {
      if (process.platform === 'win32') {
        execSync(`for /f "tokens=5" %a in ('netstat -aon ^| findstr :${port} ') do taskkill /F /PID %a >nul 2>&1`, { shell: 'cmd.exe' });
      }
    } catch {}
  };

  if (action === 'stop') {
    killPort();
    if (localServerChild) {
      try { localServerChild.kill(); } catch {}
      localServerChild = null;
    }
    return { success: true, message: 'Servidor local encerrado.' };
  }

  if (action === 'restart') {
    killPort();
    if (localServerChild) {
      try { localServerChild.kill(); } catch {}
      localServerChild = null;
    }
    await new Promise((resolve) => setTimeout(resolve, 600));
  }

  if (action === 'start' || action === 'restart') {
    killPort();

    if (fs.existsSync(serverDist)) {
      localServerChild = spawn('node', [serverDist], {
        cwd: path.join(repoRoot, 'server'),
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
        env: { ...process.env, PORT: String(port) }
      });
      localServerChild.unref();
      return { success: true, message: 'Servidor local iniciado em segundo plano.' };
    } else {
      return { success: false, message: `Ficheiro ${serverDist} não encontrado. Executa a compilação primeiro.` };
    }
  }

  return { success: false, message: 'Ação inválida.' };
});

// Create Backup of Database
ipcMain.handle('server:backup-db', async () => {
  try {
    const repoRoot = app.isPackaged
      ? path.dirname(app.getPath('exe'))
      : path.resolve(__dirname, '../..');
    const dbFile = path.join(repoRoot, 'server', 'data', 'discord.db');
    const backupDir = path.join(repoRoot, 'server', 'data', 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    if (!fs.existsSync(dbFile)) {
      return { success: false, error: 'A base de dados local ainda não existe.' };
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupPath = path.join(backupDir, `discord-backup-${timestamp}.db`);
    fs.copyFileSync(dbFile, backupPath);

    return { success: true, backupPath };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});
