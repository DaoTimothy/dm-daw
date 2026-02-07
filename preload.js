const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    selectAudioFile: () => ipcRenderer.invoke('select-audio-file'),
    selectAudioFolder: () => ipcRenderer.invoke('select-audio-folder'),
    loadScenes: () => ipcRenderer.invoke('load-scenes'),
    saveScenes: (data) => ipcRenderer.invoke('save-scenes', data),
    openConfigFile: () => ipcRenderer.invoke('open-config-file'),
    saveConfigFileAs: (data) => ipcRenderer.invoke('save-config-file-as', data),
    saveConfigToPath: (data, filePath) => ipcRenderer.invoke('save-config-to-path', { data, filePath })
});