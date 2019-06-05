const { app, BrowserWindow, Menu } = require('electron');
const ipc = require('electron').ipcMain;

let loginWin, dashboardWin;

function showLoginWindow() {

    loginWin = new BrowserWindow({ width: 322, height: 560 });
    loginWin.setResizable(false);

    loginWin.loadFile('login.html');

    loginWin.on('closed', () => {
        loginWin = null
    });

    ipc.on('login', (event, credentials) => {
        showDashboardWindow(credentials);
        loginWin.close();
    });

}

function showDashboardWindow (credentials) {

    dashboardWin = new BrowserWindow({ width: 800, height: 600 });
    dashboardWin.maximize();

    dashboardWin.loadFile('index.html');

    dashboardWin.on('closed', () => {
        dashboardWin = null
    });

    dashboardWin.webContents.once('dom-ready', () => dashboardWin.webContents.send('login', credentials));
}

app.on('browser-window-created',function(e, window) {
    window.setMenuBarVisibility(false);
});

app.on('ready', showLoginWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
});

app.on('activate', () => {
    if (showLoginWindow === null || dashboardWin === null) {
        showLoginWindow()
    }
});
