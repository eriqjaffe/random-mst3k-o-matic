if (app.isPackaged) {
    //dbBuffer = fs.readFileSync(path.join(process.resourcesPath, 'db', 'episodes.sqlite'));
    quotes = fs.readFileSync(path.join(process.resourcesPath, 'db', 'quotes.txt'), 'utf8');
    buttonquotes = fs.readFileSync(path.join(process.resourcesPath, 'db', 'buttonquotes.txt'), 'utf8');
  } else {
    //dbBuffer = fs.readFileSync(path.join(app.getAppPath(), "db", "episodes.sqlite"));
    quotes = fs.readFileSync(path.join(app.getAppPath(), "db", "quotes.txt"), 'utf8');
    //console.log(quotes)
    buttonquotes = fs.readFileSync(path.join(app.getAppPath(), "db", "buttonquotes.txt"), 'utf8');
    console.log("hikeeba")
  }