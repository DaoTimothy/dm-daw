const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false
    }
  });

  mainWindow.loadFile('index.html');
  // mainWindow.webContents.openDevTools(); // Uncomment for debugging

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  createMenu();
});

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Exit',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC Handlers for enemy data persistence
ipcMain.handle('load-enemies', async (event) => {
  try {
    const dataPath = path.join(app.getPath('userData'), 'enemies.json');
    if (fs.existsSync(dataPath)) {
      const data = fs.readFileSync(dataPath, 'utf-8');
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('Error loading enemies:', error);
    return null;
  }
});

ipcMain.handle('save-enemies', async (event, enemies) => {
  try {
    const dataPath = path.join(app.getPath('userData'), 'enemies.json');
    fs.writeFileSync(dataPath, JSON.stringify(enemies, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error saving enemies:', error);
    return false;
  }
});

ipcMain.handle('save-enemies-as', async (event, enemies) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: 'enemies.json',
      filters: [
        { name: 'JSON', extensions: ['json'] }
      ]
    });

    if (!result.canceled) {
      fs.writeFileSync(result.filePath, JSON.stringify(enemies, null, 2), 'utf-8');
      return result.filePath;
    }
    return null;
  } catch (error) {
    console.error('Error saving enemies as:', error);
    return null;
  }
});

ipcMain.handle('open-enemies-file', async (event) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'JSON', extensions: ['json'] }
      ]
    });

    if (!result.canceled) {
      const data = fs.readFileSync(result.filePaths[0], 'utf-8');
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('Error opening enemies file:', error);
    return null;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
