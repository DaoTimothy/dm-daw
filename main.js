const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        backgroundColor: '#1a1a2e',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    mainWindow.loadFile('index.html');
    mainWindow.webContents.openDevTools(); // Remove in production
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

// IPC Handlers
ipcMain.handle('select-audio-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'm4a'] }]
    });
    return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('select-audio-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });
    return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('load-scenes', async () => {
    const scenesPath = path.join(__dirname, 'scenes.json');
    if (fs.existsSync(scenesPath)) {
        return JSON.parse(fs.readFileSync(scenesPath, 'utf-8'));
    }
    return { scenes: [], soundboard: [] };
});

ipcMain.handle('save-scenes', async (event, data) => {
    const scenesPath = path.join(__dirname, 'scenes.json');
    fs.writeFileSync(scenesPath, JSON.stringify(data, null, 2));
    return true;
});

// New handlers for specific config files
ipcMain.handle('open-config-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [{ name: 'JSON Config', extensions: ['json'] }],
        title: 'Open Configuration File'
    });

    if (result.canceled) return null;

    try {
        const filePath = result.filePaths[0];
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        return { data, filePath };
    } catch (err) {
        console.error('Error reading config:', err);
        return null;
    }
});

ipcMain.handle('save-config-file-as', async (event, data) => {
    const result = await dialog.showSaveDialog(mainWindow, {
        filters: [{ name: 'JSON Config', extensions: ['json'] }],
        title: 'Save Configuration As',
        defaultPath: 'dnd-config.json'
    });

    if (result.canceled) return null;

    try {
        fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2));
        return result.filePath;
    } catch (err) {
        console.error('Error saving config:', err);
        return null;
    }
});

ipcMain.handle('save-config-to-path', async (event, { data, filePath }) => {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (err) {
        console.error('Error saving config:', err);
        return false;
    }
});