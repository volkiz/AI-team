// stealth-preload.js
// This script runs before any other script in the webview to mask the browser's identity.

(function () {
    // 1. Mask navigator.webdriver
    Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
    });

    // 2. Add fake chrome object (many bots look for this)
    window.chrome = {
        runtime: {},
        loadTimes: function () { },
        csi: function () { },
        app: {}
    };

    // 3. Mask permissions
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
    );

    // 4. Mask plugins length
    Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
    });

    // 5. Mask Languages (handled by main.js but reinforced here)
    // We can't easily know current lang here without IPC, but adding generics
    if (!navigator.languages || navigator.languages.length === 0) {
        Object.defineProperty(navigator, 'languages', {
            get: () => ['en-US', 'en'],
        });
    }

    console.log("Stealth Mode: Browser identity masked.");
})();
