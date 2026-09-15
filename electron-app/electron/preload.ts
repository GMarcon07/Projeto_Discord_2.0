import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  isElectron: boolean;
  platform: string;
  getScreenSources: () => Promise<Array<{ id: string; name: string; thumbnail: string; appIcon?: string }>>;
  showNotification: (options: { title: string; body: string; icon?: string }) => void;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  isWindowMaximized: () => Promise<boolean>;
  getConfig: () => Promise<{ minimizeToTray: boolean; disableGpu: boolean }>;
  setConfig: (config: Partial<{ minimizeToTray: boolean; disableGpu: boolean }>) => Promise<any>;
  restartApp: () => void;
  getNetworkIps: () => Promise<Array<{ name: string; address: string; family: string }>>;
  openFolder: (path: string) => Promise<string>;
  checkServerHealth: (url: string) => Promise<{ ok: boolean; data?: any; error?: string }>;
  controlLocalServer: (action: 'start' | 'stop' | 'restart', port?: number) => Promise<{ success: boolean; message?: string }>;
  backupDatabase: () => Promise<{ success: boolean; backupPath?: string; error?: string }>;
}

const electronAPI: ElectronAPI = {
  isElectron: true,
  platform: process.platform,
  getScreenSources: async () => {
    return await ipcRenderer.invoke('desktop-capturer:get-sources');
  },
  showNotification: (options) => {
    ipcRenderer.send('notification:show', options);
  },
  minimizeWindow: () => {
    ipcRenderer.send('window:minimize');
  },
  maximizeWindow: () => {
    ipcRenderer.send('window:maximize');
  },
  closeWindow: () => {
    ipcRenderer.send('window:close');
  },
  isWindowMaximized: async () => {
    return await ipcRenderer.invoke('window:is-maximized');
  },
  getConfig: async () => {
    return await ipcRenderer.invoke('config:get');
  },
  setConfig: async (config) => {
    return await ipcRenderer.invoke('config:set', config);
  },
  restartApp: () => {
    ipcRenderer.send('app:restart');
  },
  getNetworkIps: async () => {
    return await ipcRenderer.invoke('server:get-network-ips');
  },
  openFolder: async (path: string) => {
    return await ipcRenderer.invoke('server:open-folder', path);
  },
  checkServerHealth: async (url: string) => {
    return await ipcRenderer.invoke('server:check-health', url);
  },
  controlLocalServer: async (action: 'start' | 'stop' | 'restart', port?: number) => {
    return await ipcRenderer.invoke('server:control', action, port);
  },
  backupDatabase: async () => {
    return await ipcRenderer.invoke('server:backup-db');
  }
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
