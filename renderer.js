const { app, shell, ipcRenderer } = require('electron')

ipcRenderer.on('about', (event, data) => {
    $("#about").trigger("click")
});