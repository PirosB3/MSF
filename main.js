const XLSX = require('xlsx');
const fs = require('fs');
const electron = require('electron')
const sqlite3 = require("sqlite3").verbose();
const ipc = require('electron').ipcMain;
const dialog = require('electron').dialog;
const path = require('path');
// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow

const TO_PROCESS_EXTENSIONS = ['.xls', '.xlsx'];
const AVAILABLE_EXTENSIONS = ['.xls', '.xlsx', '.csv'];
const readTypeForExtension = {
    '.xls': 'binary',
    '.xlsx': 'binary',
    '.csv': 'utf8',
};

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
let db = null;


var uploadCSVFile = function(data, filename) {
    var completion = [];
    var lineCount = 0;
    var lines = data.split('\n')
    lines.forEach(function(line) {
        var words = line.split(',');
        words.forEach(function(word) {
            completion.push(new Promise(function(resolve, reject) {
                if (word.length > 0) {
                    db.run('INSERT INTO cities(word) VALUES (?);', word.toLowerCase().trim(), function() {
                      db.run('INSERT INTO cities_map(word, actual_word, file_name) VALUES (?, ?, ?);',
                          word.toLowerCase().trim(), word.trim(), 
                          filename,
                          function() {
                              lineCount++;
                              resolve();
                          }
                      );
                    });
                } else {
                    resolve();
                }
            }));
        });
    });
    return Promise.all(completion).then(function() {
        return lineCount;
    });
}


ipc.on('uploadNewFile', function (event, arg) {
    dialog.showOpenDialog({properties: ['openFile', 'openDirectory', 'multiSelections']}, function(filenames) {
        if (!filenames) return;

        let filename = filenames[0];
        let extension = path.extname(filename);
        let basename = path.basename(filename);

        if (AVAILABLE_EXTENSIONS.indexOf(extension) == -1) {
            event.sender.send('uploadFailed');
            return;
        }

        let readType = readTypeForExtension[extension]
        fs.readFile(filename, readType, function (err, data) {
            if (err) {
                return console.log(err);
            }

            let to_process = [];
            if (TO_PROCESS_EXTENSIONS.indexOf(extension) != -1) {
                let doc = XLSX.read(data, {type: 'binary'});
                doc.SheetNames.forEach(function(sheetName) {
                    let sheet = XLSX.utils.sheet_to_csv(doc.Sheets[sheetName]);
                    console.log(sheetName);
                    to_process.push(uploadCSVFile(sheet, sheetName));
                });
            } else {
                to_process.push(uploadCSVFile(data, basename));
            }

            Promise.all(to_process).then(function(lineCount) {
                let totalLineCount = lineCount.reduce(function(a, b) {
                    return a + b;
                }, 0);
                event.sender.send('uploadComplete', totalLineCount);
            });
        });
    });
});

ipc.on('getSearchOccurancesForKeyword', function (event, arg) {
  var completeInner;
  var els = []
  db.each("SELECT word, score FROM cities WHERE word MATCH ? and score <= 170 ORDER BY score DESC;", arg, function(err, row) {
    completeInner = new Promise(function(success, failure) {
        db.each("SELECT actual_word, file_name FROM cities_map where word = ?;", row.word, function(err, row) {
            els.push(row);
        }, function() {
            success();
        });
    });
  }, function() {
      if (!completeInner) {
          event.sender.send('showReccomender', []);
          return
      }
      completeInner.then(function() {
          event.sender.send('showReccomender', els);
      });
  });
});

function getDatabase() {
    return new Promise(function(resolve, reject) {
        if (db != null) {
            reolve();
        }
        const dbPath = path.join(__dirname, 'db.sqlite')
        const extPath = path.join(__dirname, 'spellfix1.so')
        db = new sqlite3.Database(dbPath);
        db.loadExtension(extPath, function() {
            db.run('CREATE VIRTUAL TABLE IF NOT EXISTS cities using spellfix1', function() { 
                db.run('CREATE TABLE IF NOT EXISTS cities_map(word TEXT NOT NULL, actual_word TEXT NOT NULL, file_name TEXT NOT NULL)', function() {
                    resolve();
                });
            });
        });
    });
}

function createWindow() {
  getDatabase().then(function() {
      // Create the browser window.
      mainWindow = new BrowserWindow({width: 800, height: 600})

      // and load the index.html of the app.
      mainWindow.loadURL(`file://${__dirname}/index.html`)

      // Open the DevTools.
      //mainWindow.webContents.openDevTools()

      // Emitted when the window is closed.
      mainWindow.on('closed', function () {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null
      })
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
