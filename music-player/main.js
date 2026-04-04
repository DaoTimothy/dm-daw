const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const youtubedlExec = require('youtube-dl-exec');
const youtubedl = youtubedlExec.default || youtubedlExec;

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

// YouTube stream handler using youtube-dl-exec
ipcMain.handle('get-youtube-stream', async (event, videoUrl) => {
    try {
        console.log('Fetching YouTube info for:', videoUrl);
        
        // Get video info with format details - request JSON output
        let result = await youtubedl(videoUrl, {
            dumpJson: true,
            noWarnings: true,
            noCheckCertificates: true
        });

        // Parse if it's a string (youtube-dl sometimes returns JSON as string)
        let info = result;
        if (typeof result === 'string') {
            try {
                info = JSON.parse(result);
            } catch (e) {
                console.error('Failed to parse youtube-dl JSON:', result.substring(0, 200));
                info = result;
            }
        }

        // Extract title and duration
        const videoTitle = (info && info.title) || 'YouTube Audio';
        const duration = (info && info.duration) || 0;
        
        // Get the playable URL
        // youtube-dl returns the URL that can be directly played
        let audioUrl = null;
        
        if (info && typeof info === 'object') {
            // Try direct URL field
            audioUrl = info.url;
            
            // If no direct url, try to find from formats
            if (!audioUrl && info.formats && Array.isArray(info.formats)) {
                // Find audio-only or best format
                const audioOnly = info.formats.find(f => 
                    (f.vcodec === 'none' || f.vcodec === undefined) && 
                    (f.acodec && f.acodec !== 'none')
                );
                
                if (audioOnly && audioOnly.url) {
                    audioUrl = audioOnly.url;
                } else if (info.formats[0] && info.formats[0].url) {
                    audioUrl = info.formats[0].url;
                }
            }
        }

        if (!audioUrl) {
            console.error('No URL found in response:', {
                hasUrl: !!info?.url,
                hasFormats: !!info?.formats,
                formatsLength: info?.formats?.length,
                infoKeys: info ? Object.keys(info).slice(0, 15) : 'no info'
            });
            return { 
                success: false, 
                error: 'Could not extract playable stream' 
            };
        }

        console.log('Got YouTube stream - Title:', videoTitle, 'URL length:', audioUrl.length);

        return {
            success: true,
            url: audioUrl,
            title: videoTitle,
            duration: duration
        };
    } catch (err) {
        console.error('YouTube error:', {
            message: err.message,
            stderr: err.stderr,
            code: err.code
        });
        
        const message = ((err.message || '') + (err.stderr || '')).toLowerCase();
        
        if (message.includes('not available') || message.includes('unavailable')) {
            return { success: false, error: 'Video is not available.' };
        }
        
        if (message.includes('age')) {
            return { success: false, error: 'Video is age-restricted.' };
        }
        
        if (message.includes('403')) {
            return { success: false, error: 'Access denied to video.' };
        }
        
        return { success: false, error: 'Failed to load YouTube.' };
    }
});