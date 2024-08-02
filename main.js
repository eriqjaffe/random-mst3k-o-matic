const { app, BrowserWindow, dialog, Menu, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os")
const initSqlJs = require("sql.js/dist/sql-wasm.js");
const download = require("download");
const versionCheck = require('github-version-checker');
const pkg = require('./package.json');
const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs));
const movier = require('movier')
let db;
let dbBuffer;
let mainWindow

const updateOptions = {
	repo: 'random-mst3k-o-matic',
	owner: 'eriqjaffe',
	currentVersion: pkg.version
};

ipcMain.on('check-for-update', (event, arg) => {
	versionCheck(updateOptions, function (error, update) { // callback function
		if (error) {
			dialog.showMessageBox(null, {
				type: 'error',
				message: 'An error occurred checking for updates:\r\n\r\n'+error.message
			});	
		}
		if (update) { // print some update info if an update is available
			dialog.showMessageBox(null, {
				type: 'question',
				message: "Current version: "+pkg.version+"\r\n\r\nVersion "+update.name+" is now availble.  Click 'OK' to go to the releases page.",
				buttons: ['OK', 'Cancel'],
			}).then(result => {
				if (result.response === 0) {
					shell.openExternal(update.url)
				}
			})	
		} else {
			if (arg.type == "manual") {
				dialog.showMessageBox(null, {
					type: 'info',
					message: "Current version: "+pkg.version+"\r\n\r\nThere is no update available at this time."
				});	
			}
		}
	});
})

ipcMain.on("movie-request", (event, arg) => {
  console.log(arg)
  let sql = "SELECT e.*, s.summary  FROM episodes e JOIN summaries s ON e.experiment = s.experiment where ";
  sql += "e.host " + arg.host + " ";
  sql += "and e.crow " + arg.crow + " ";
  sql += "and e.tom " + arg.tom + " ";

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
    sql += "and e.experiment in (select experiment from actors where name = '"+arg.producers+"') "
  }

  if (arg.characters != "null") {
    sql += "and e.experiment in (select experiment from characters where name = '"+arg.characters+"') "
  } 

  initSqlJs().then(function (SQL) {
    console.log(sql)
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
      try {
        movier.getTitleDetailsByIMDBId(rowObject.imdb).then((data) => {
          let directors = [];
          let producers = [];
          let writers = [];
          let actors = [];
          let productionCompanies = []
          for (director of data.directors) {
            directors.push(director.name)
          }
          json.directors = directors.join(', ');
          for (producer of data.producers) {
            producers.push(producer.name)
          }
          json.producers = producers.join(', ');
          for (writer of data.writers) {
            writers.push(writer.name)
          }
          json.writers = writers.join(', ');
          for (x = 0; x < 4; x++) {
            actors.push(data.casts[x].name)
          }
          json.actors = actors.join(', ');

          json.tagline = (data.taglines.length > 0) ? data.taglines[Math.floor(Math.random()*data.taglines.length)] : null;
          
          for (productionCompany of data.productionCompanies) {
            if (productionCompany.extraInfo == "Production Companies") { productionCompanies.push(productionCompany.name) }
          }

          json.productionCompanies = productionCompanies.join(', ')
          json.year = data.dates.titleYear
          json.runtime = (parseInt(data.runtime.seconds) / 60)
          event.sender.send("movie-sign", { rows: 1, movie: rowObject, meta: json })
          db.close()
        });
      } catch (err) {
        console.log(err)
        json.directors = ""
        json.producers = ""
        json.writers = ""
        json.actors = ""
        json.tagline = ""
        json.productionCompanies = ""
        json.runtime = ""
        event.sender.send("movie-sign", { rows: 1, movie: rowObject, meta: json })
        db.close()
      }
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

      try {
        movier.getTitleDetailsByIMDBId(rowObject.imdb).then((data) => {
          let directors = [];
          let producers = [];
          let writers = [];
          let actors = [];
          let productionCompanies = []
          for (director of data.directors) {
            directors.push(director.name)
          }
          json.directors = directors.join(', ');
          for (producer of data.producers) {
            producers.push(producer.name)
          }
          json.producers = producers.join(', ');
          for (writer of data.writers) {
            writers.push(writer.name)
          }
          json.writers = writers.join(', ');
          for (x = 0; x < 4; x++) {
            actors.push(data.casts[x].name)
          }
          json.actors = actors.join(', ');

          json.tagline = (data.taglines.length > 0) ? data.taglines[Math.floor(Math.random()*data.taglines.length)] : null;
          
          for (productionCompany of data.productionCompanies) {
            if (productionCompany.extraInfo == "Production Companies") { productionCompanies.push(productionCompany.name) }
          }
          json.productionCompanies = productionCompanies.join(', ')
          json.year = data.dates.titleYear
          json.runtime = (parseInt(data.runtime.seconds) / 60)
          //console.log(json)
          event.sender.send("movie-sign", { rows: 1, movie: rowObject, meta: json })
          db.close()
        });
      } catch (err) {
        console.log(err)
        json.directors = ""
        json.producers = ""
        json.writers = ""
        json.actors = ""
        json.tagline = ""
        json.productionCompanies = ""
        json.runtime = ""
        event.sender.send("movie-sign", { rows: 1, movie: rowObject, meta: json })
        db.close()
      }
    }
  });
});

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1152,
    height: 864,
    icon: __dirname + "/images/icon.ico",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
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
        {
          click: () => mainWindow.webContents.send('update','click'),
          label: 'Check For Updates',
        }
        ]
    }
    ]

    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)

  // and load the index.html of the app.
  mainWindow.loadFile("index.html");

  mainWindow.once('ready-to-show', () => {
    //sleep(3000).then(() => {
      /* try {
        fs.unlinkSync(os.tmpdir()+"/episodes.sqlite");
      } catch (err) {}
      
      download(
        "https://eriqjaffe.github.io/db/episodes.sqlite",
        app.getPath('userData')
      ).then(() => {
        console.log('database downloaded')
        dbBuffer = fs.readFileSync(app.getPath('userData')+"/episodes.sqlite");
        mainWindow.webContents.send("hide-spinner", "episodes.sqlite")
      }).catch((error) => {
        console.error(error)
        console.log("using backup database")
        dbBuffer = fs.readFileSync(path.join(app.getAppPath(), "db", "episodes.sqlite"));
        //mainWindow.webContents.send("hide-spinner", "episodes.sqlite");
      }); */
      if (app.isPackaged) {
        dbBuffer = fs.readFileSync(path.join(process.resourcesPath, 'db', 'episodes.sqlite'));
      } else {
        dbBuffer = fs.readFileSync(path.join(app.getAppPath(), "db", "episodes.sqlite"));
      }
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
