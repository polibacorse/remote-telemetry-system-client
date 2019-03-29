const { app, BrowserWindow } = require('electron');

let win;

function createWindow () {

    win = new BrowserWindow({ width: 800, height: 600 });
    win.maximize();

    win.loadFile('index.html');

    win.on('closed', () => {
        win = null
    });

    //win.webContents.toggleDevTools();
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
});

app.on('activate', () => {
    if (win === null) {
        createWindow()
    }
});
