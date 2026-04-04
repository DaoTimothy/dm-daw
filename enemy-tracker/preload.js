const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  loadEnemies: () => ipcRenderer.invoke('load-enemies'),
  saveEnemies: (enemies) => ipcRenderer.invoke('save-enemies', enemies),
  saveEnemiesAs: (enemies) => ipcRenderer.invoke('save-enemies-as', enemies),
  openEnemiesFile: () => ipcRenderer.invoke('open-enemies-file')
});
