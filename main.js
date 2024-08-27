const { app, BrowserWindow, dialog, Menu, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os")
const initSqlJs = require("sql.js/dist/sql-wasm.js");
const download = require("download");
const versionCheck = require('github-version-checker');
const pkg = require('./package.json');
const chokidar = require('chokidar')
const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs));
const Store = require('electron-store')
let db;
let dbBuffer;
let quotesPath;
let quotes;
let buttonquotesPath;
let buttonquotes;
let mainWindow

let chokidarQuotes;
let chokidarButtonQuotes;

const store = new Store()

const updateOptions = {
	repo: 'random-mst3k-o-matic',
	owner: 'eriqjaffe',
	currentVersion: pkg.version
};

ipcMain.on('set-prefs', (event, arg) => {
  store.set(arg.pref, arg.val)
})

ipcMain.on('get-prefs', (event, arg) => {
  let json = {}
  json.titlecard = store.get("titlecard",0)
  json.checkForUpdates = store.get("checkForUpdates",false)
  json.theHost = store.get("theHost",0)
  json.theCrow = store.get("theCrow",0)
  json.theTom = store.get("theTom",0)
  event.sender.send('get-prefs', json)
})

ipcMain.on('check-for-update', (event, arg) => {
	versionCheck(updateOptions, function (error, update) { // callback function
		if (error) {
			dialog.showMessageBox(null, {
				type: 'error',
				message: 'An error occurred checking for updates:\r\n\r\n'+error.message
			});	
		}
		if (update) { // print some update info if an update is available
      event.sender.send('update-available',{update: true, currentVersion: pkg.version, newVersion: update.name, url: update.url})
		} else {
			if (arg.type == "manual") {
        event.sender.send('update-available',{update: false, currentVersion: pkg.version})
			}
		}
	});
})

ipcMain.on("movie-request", (event, arg) => {
  let sql = "SELECT e.*, s.summary  FROM episodes e JOIN summaries s ON e.experiment = s.experiment where ";
  sql += "e.host " + arg.host + " ";
  sql += "and e.crow " + arg.crow + " ";
  sql += "and e.tom " + arg.tom + " ";
  sql += "and e.gpc " + arg.gpc + " ";
  sql += "and e.network " + arg.network + " ";
  sql += "and e.oscar " + arg.oscar + " ";

  arg.mads.forEach(function (mad) {
    for (const [key, value] of Object.entries(mad)) {
      sql += `and e.${key} = ${value} `;
    }
  });

  arg.options.forEach(function (option) {
    for (const [key, value] of Object.entries(option)) {
      sql += `and e.${key} = ${value} `;
    }
  });

  sql += "and e.originalyear " + arg.decade + " ";
  sql += "and e.country " + arg.country + " ";
  sql += "and e.genres " + arg.genre + " ";

  if (arg.actors != "null") {
    sql += "and e.experiment in (select experiment from actors where name = '"+arg.actors+"') "
  }

  if (arg.directors != "null") {
    sql += "and e.experiment in (select experiment from directors where name = '"+arg.directors+"') "
  }

  if (arg.producers != "null") {
    sql += "and e.experiment in (select experiment from producers where name = '"+arg.producers+"') "
  }

  if (arg.characters != "null") {
    sql += "and e.experiment in (select experiment from characters where name = '"+arg.characters+"') "
  } 

  //console.log(sql)
  initSqlJs().then(function (SQL) {
    db = new SQL.Database(dbBuffer);
    const result = db.exec(sql + " ORDER BY RANDOM() LIMIT 2");
    let rowObject
    let json = {}
    
    if (result.length === 0 || result[0].values.length === 0) {
      db.close();
      event.sender.send("movie-sign", { rows: 0, message: "No rows found" });
      return false;
    }
    if (result[0].values.length === 1) {
      const row = result[0].values[0]
      rowObject = result[0].columns.reduce((obj, col, index) => {
        obj[col] = row[index];
        return obj;
      }, {});
    } else {
      let row;
      if (result[0].values[0][0].toString() != arg.lastMovie.toString()) {
        row = result[0].values[0];
      } else {
        row = result[0].values[1];
      }
      rowObject = result[0].columns.reduce((obj, col, index) => {
        obj[col] = row[index];
        return obj;
      }, {});
    }
    event.sender.send("movie-sign", { rows: 1, movie: rowObject, meta: json })
    db.close()
  });
});

ipcMain.on("get-quotes", (event, arg) => {
  let json = {}
  if (quotes == undefined || quotes == null) {
    if (app.isPackaged) {
      quotesPath = path.join(process.resourcesPath, 'db', 'quotes.txt')
    } else {
      quotesPath = path.join(app.getAppPath(), "db", "quotes.txt")
    }
    chokidarQuotes = chokidar.watch(quotesPath, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true
    });
    chokidarQuotes.on('ready', () => {})
    chokidarQuotes
      .on('change', path => quotes = fs.readFileSync(quotesPath, 'utf8'))
  }
  if (buttonquotes == undefined || buttonquotes == null) {
    if (app.isPackaged) {
      buttonquotesPath = path.join(process.resourcesPath, 'db', 'buttonquotes.txt')
    } else {
      buttonquotesPath = path.join(app.getAppPath(), "db", "buttonquotes.txt")
    }
    chokidarButtonQuotes = chokidar.watch(buttonquotesPath, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true
    });
    chokidarButtonQuotes.on('ready', () => {})
    chokidarButtonQuotes
      .on('change', path => buttonquotes = fs.readFileSync(buttonquotesPath, 'utf8'))
  }
  quotes = fs.readFileSync(quotesPath, 'utf8');
  buttonquotes = fs.readFileSync(buttonquotesPath, 'utf8');
  const normalizedQuotes = quotes.replace(/\r\n|\r/g, '\n');
  const quoteLines = normalizedQuotes.split('\n');
  const normalizedButtons = buttonquotes.replace(/\r\n|\r/g, '\n');
  const buttonLines = normalizedButtons.split('\n');
  let newQuote;
  let newButton;
  do {
    newQuote = quoteLines[Math.floor(Math.random()*quoteLines.length)]
  } while (newQuote.length < 1)
  do {
    newButton = buttonLines[Math.floor(Math.random()*buttonLines.length)]
  } while (newButton.length < 1)
  json.quote = newQuote;
  json.buttonquote = newButton;
  event.sender.send('get-quote-response',json)
})
const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1152,
    height: 864,
    icon: __dirname + "/images/icon.ico",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      //preload: path.join(__dirname, 'preload.js')
    },
  });

  const template = [
    ...(process.platform === 'darwin' ? [{
        label: app.name,
        submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
        ]
    }] : []),
    {
        label: 'File',
        submenu: [
          process.platform === 'darwin' ? { role: 'close' } : { role: 'quit' }
        ]
    },
    {
		  label: 'Edit',
		  submenu: [
			{
				click: () => mainWindow.webContents.send('prefs','click'),
				accelerator: process.platform === 'darwin' ? 'Cmd+Shift+P' : 'Control+Shift+P',
				label: 'Edit Preferences',
			}
		  ]
	  },
    {
        label: 'View',
        submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
        ]
    },
    {
        label: 'Window',
        submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(process.platform === 'darwin' ? [
            { type: 'separator' },
            { role: 'front' },
            { type: 'separator' },
            { role: 'window' }
        ] : [
            { role: 'close' }
        ])
        ]
    },
    {
        role: 'help',
        submenu: [
        {
            click: () => mainWindow.webContents.send('about','click'),
                label: 'About the Random MST3K-O-Matic',
        },
        {
            label: 'About Node.js',
            click: async () => {    
            await shell.openExternal('https://nodejs.org/en/about/')
            }
        },
        {
            label: 'About Electron',
            click: async () => {
            await shell.openExternal('https://electronjs.org')
            }
        },
        {
            label: 'View project on GitHub',
            click: async () => {
            await shell.openExternal('https://github.com/eriqjaffe/random-mst3k-o-matic')
            }
        },
        { type: 'separator' },
        {
          click: () => mainWindow.webContents.send('update','click'),
          label: 'Check For Updates',
        },
        { 
          label: 'Edit header quotes',
            click: async () => {
            await shell.openExternal(quotesPath)
            },
            visible: process.platform != 'darwin'
        },
        { 
          label: 'Edit button quotes',
            click: async () => {
            await shell.openExternal(buttonquotesPath)
            },
            visible: process.platform != 'darwin'
        }
        ]
    }
    ]

    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)

  // and load the index.html of the app.

  

  mainWindow.loadFile("index.html");

  mainWindow.once('ready-to-show', () => {
    if (app.isPackaged) {
      dbBuffer = fs.readFileSync(path.join(process.resourcesPath, 'db', 'episodes.sqlite'));
    } else {
      dbBuffer = fs.readFileSync(path.join(app.getAppPath(), "db", "episodes.sqlite"));
    }
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
