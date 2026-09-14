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
  }
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
