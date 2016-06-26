const ipc = require('electron').ipcRenderer
const termBtn = document.getElementById('termBtn')
const termText = document.getElementById('termText')

termBtn.addEventListener('click', function () {
  var value = termText.value;
  if (value.length > 0) {
      ipc.send('getSearchOccurancesForKeyword', value)
  }
})

ipc.on('showReccomender', function (event, arg) {
    console.log(arg);
})
