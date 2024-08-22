const { app, shell, ipcRenderer } = require('electron')

ipcRenderer.on('about', (event, data) => {
    $("#about").trigger("click")
});

ipcRenderer.on('update', (event, data) => {
    $("#checkForUpdates").trigger("click")
});

ipcRenderer.on('prefs', (event, data) => {
    $("#prefsBtn").trigger("click")
})