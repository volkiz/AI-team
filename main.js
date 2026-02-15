const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');

// FORCE PERSISTENCE
const userDataPath = path.join(__dirname, 'userData');
app.setPath('userData', userDataPath);
const configPath = path.join(userDataPath, 'config.json');

let mainWindow;

function checkSetup() {
    return fs.existsSync(configPath);
}

const partitions = [
    'persist:chatgpt',
    'persist:gemini',
    'persist:grok',
    'persist:claude',
    'persist:deepseek'
];

const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36';

function applyHeaders(ses, lang = 'en') {
    const langHeader = lang === 'tr' ? 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7' : 'en-US,en;q=0.9';

    // Stealth: Inject pre-defined script to mask navigator
    try {
        ses.registerPreloadScript({
            filePath: path.join(__dirname, 'stealth-preload.js')
        });
    } catch (e) {
        // If already registered, it might throw or we can ignore
        // ses.setPreloads was overwriting, registerPreloadScript might be additive
    }

    ses.webRequest.onBeforeSendHeaders((details, callback) => {
        details.requestHeaders['User-Agent'] = userAgent;
        delete details.requestHeaders['X-Requested-With'];

        details.requestHeaders['sec-ch-ua'] = '"Not A(Brand";v="8", "Chromium";v="132", "Google Chrome";v="132"';
        details.requestHeaders['sec-ch-ua-mobile'] = '?0';
        details.requestHeaders['sec-ch-ua-platform'] = '"Windows"';
        details.requestHeaders['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7';
        details.requestHeaders['Accept-Language'] = langHeader;
        details.requestHeaders['Sec-Fetch-Site'] = 'none';
        details.requestHeaders['Sec-Fetch-Mode'] = 'navigate';
        details.requestHeaders['Sec-Fetch-User'] = '?1';
        details.requestHeaders['Sec-Fetch-Dest'] = 'document';
        details.requestHeaders['Upgrade-Insecure-Requests'] = '1';

        callback({ cancel: false, requestHeaders: details.requestHeaders });
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        title: "AI-Team",
        autoHideMenuBar: true,
        icon: path.join(__dirname, 'icons/icon128.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webviewTag: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.setMenu(null);
    // mainWindow.webContents.openDevTools();

    if (!checkSetup()) {
        mainWindow.loadFile('setup.html');
    } else {
        mainWindow.loadFile('index.html');
    }

    const currentConfig = checkSetup() ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : { lang: 'en' };
    const lang = currentConfig.lang || 'en';

    partitions.forEach(part => {
        const ses = session.fromPartition(part);
        ses.setUserAgent(userAgent);
        applyHeaders(ses, lang);
    });

    // Handle Popups
    app.on('web-contents-created', (event, contents) => {
        contents.on('will-attach-webview', (event, webPreferences, params) => {
            webPreferences.allowpopups = true;
        });
        contents.setWindowOpenHandler(({ url }) => {
            return { action: 'allow' };
        });
    });
}

// IPC Handlers
ipcMain.on('setup-complete', (event, config) => {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    mainWindow.loadFile('index.html');
});

ipcMain.handle('get-config', () => {
    if (checkSetup()) {
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    return { lang: 'en', members: [] };
});

ipcMain.handle('update-lang', async (event, newLang) => {
    let config = { lang: 'en', members: [] };
    if (checkSetup()) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    config.lang = newLang;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    partitions.forEach(part => {
        const ses = session.fromPartition(part);
        applyHeaders(ses, newLang);
    });
    return true;
});

app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
