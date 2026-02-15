const { contextBridge, ipcRenderer } = require('electron');

// Bridge to allow the renderer (UI) to talk to the Main process if needed,
// but primarily to safely expose features to the webview logic is handled inside the views.

contextBridge.exposeInMainWorld('electronAPI', {
    getConfig: () => ipcRenderer.invoke('get-config'),
    sendSetupComplete: (config) => ipcRenderer.send('setup-complete', config),
    updateLang: (lang) => ipcRenderer.invoke('update-lang', lang)
});

// Since we use <webview>, the "content script" logic actually goes into
// a separate preload script that we attach to the <webview> tag itself.
// But for simplicity, we can sometimes inject JS directly from the renderer into the webview.
