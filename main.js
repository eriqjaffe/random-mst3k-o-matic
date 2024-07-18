const { app, BrowserWindow, ipcMain,shell } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os")
const initSqlJs = require("sql.js/dist/sql-wasm.js");
const download = require("download");
const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs));
let db;
let dbBuffer;
let mainWindow

ipcMain.on("get-quote", (event, arg) => {
  fs.readFile(
    path.join(app.getAppPath(), "quotes.txt"),
    "utf-8",
    function (err, data) {
      if (err) {
        throw err;
      }
      const lines = data.split("\n");
      let line;
      do {
        line = lines[Math.floor(Math.random() * lines.length)];
      } while (line == arg);
      event.sender.send("quote-response", { quote: line });
    }
  );
});

ipcMain.on("movie-request", (event, arg) => {
  let sql = "select * from episodes where ";
  sql += "host " + arg.host + " ";
  sql += "and crow " + arg.crow + " ";
  sql += "and tom " + arg.tom + " ";

  arg.mads.forEach(function (mad) {
    for (const [key, value] of Object.entries(mad)) {
      sql += `and ${key} = ${value} `;
    }
  });

  arg.options.forEach(function (option) {
    for (const [key, value] of Object.entries(option)) {
      sql += `and ${key} = ${value} `;
    }
  });

  initSqlJs().then(function (SQL) {
    db = new SQL.Database(dbBuffer);
    const result = db.exec(sql + " ORDER BY RANDOM() LIMIT 1");

    if (result.length === 0 || result[0].values.length === 0) {
      db.close();
      event.sender.send("movie-sign", { rows: 0, message: "No rows found" });
      return false;
    } else {
      // Get the first (and only) row
      const row = result[0].values[0];
      const rowObject = result[0].columns.reduce((obj, col, index) => {
        obj[col] = row[index];
        return obj;
      }, {});
      db.close();
      event.sender.send("movie-sign", { rows: 1, movie: rowObject });
    }
  });
});

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1152,
    height: 864,
    icon: __dirname + "/icons/win/icon.ico",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile("index.html");

  mainWindow.once('ready-to-show', () => {
    //sleep(3000).then(() => {
      try {
        fs.unlinkSync(os.tmpdir()+"/episodes.sqlite");
      } catch (err) {}
      
      download(
        "https://eriqjaffe.github.io/db/episodes.sqlite",
        path.join(os.tmpdir())
      ).then(() => {
        dbBuffer = fs.readFileSync(os.tmpdir()+"/episodes.sqlite");
        mainWindow.webContents.send("hide-spinner", "episodes.sqlite")
      }).catch((error) => {
        dbBuffer = fs.readFileSync(path.join(app.getAppPath(), "db", "episodes_bak.sqlite"));
        mainWindow.webContents.send("hide-spinner", "episodes_bak.sqlite");
      });
    //})
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
