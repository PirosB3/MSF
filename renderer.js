const ipc = require('electron').ipcRenderer
const asyncMsgBtn = document.getElementById('lorem')

asyncMsgBtn.addEventListener('click', function () {
  ipc.send('getSearchOccurancesForKeyword', 'abu')
})

ipc.on('showReccomender', function (event, arg) {
    console.log(arg);
})
