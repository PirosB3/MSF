const ipc = require('electron').ipcRenderer
// const termBtn = document.getElementById('termBtn')
// const termText = document.getElementById('termText')

// alert("OK")

// termBtn.addEventListener('click', function () {
//   var value = termText.value;
//   if (value.length > 0) {
//       
//   }
// })

// ipc.on('showReccomender', function (event, arg) {
//     console.log(arg);
// })

angular.module('matchApp', [])
    .controller('MainController', function($scope) {

		ipc.on('showReccomender', function (event, arg) {

			var wordMap = {}
			arg.forEach(function(a) {
				if (!wordMap[a.actual_word]) {
					wordMap[a.actual_word] = {
						actual_word: a.actual_word,
						fileCounter: {},
						totalSeen: 0
					};
				}
				var detailwordMap = wordMap[a.actual_word];
				if (!detailwordMap.fileCounter[a.file_name]) {
					detailwordMap.fileCounter[a.file_name] = 0
				}
				detailwordMap.fileCounter[a.file_name]++;
				detailwordMap.totalSeen++;
			})


			var items = [];
			Object.keys(wordMap).forEach(function(k) {
				items.push(wordMap[k]);
			})

			items.sort(function(a, b) {
				if (a.totalSeen < b.totalSeen) {
					return 1;
				} else if (a.totalSeen > b.totalSeen) {
					return -1;
				}
				return 0;
			});

		    $scope.$apply(function() {
		    	$scope.items = items;
		    })
		})

    	$scope.getMatches = function() {
    		var city = $scope.city;
    		ipc.send('getSearchOccurancesForKeyword', city);
    	}
    });