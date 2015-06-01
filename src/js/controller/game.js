/// <reference path="../typings/jquery/jquery.d.ts"/>
/// <reference path="../scripts/app.js" />
 

myApp.controller('myController', ['$scope', function ($scope) {
	var _self = this;

	$scope.getFile = function () {
		$.get('resources/items.txt')
			.success(function (data) {
			var regex1 = /\/\/[^\n]*\n/g;
			var regex2 = /"[ \t]+"/g;
			var regex3 = /"\s+"/g;
			var regex4 = /"\s+{/g;
			var regex5 = /}\s+"/g;

			data = data.replace(regex1, '\n');
			data = data.replace(regex2, '": "');
			data = data.replace(regex3, '", "');
			data = data.replace(regex4, '": { ');
			data = data.replace(regex5, '}, "');

			try {
				var json = JSON.parse('{' + data + '}');
				console.log(json);
			} catch (ex) {
				console.log(ex);
			}

		});
	};

	$scope.getItemsApi = function (key) {
		$.get('resources/items_webapi.json')
			.success(function(data){
				console.log('teste');
				console.log(data);
			});
	};

}]);