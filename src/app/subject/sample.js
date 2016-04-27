
/* @ngInject */
function SampleCtrl ($scope) {
    $scope.name = "Foods";
    
    $scope.$createObservableFunction('sample').map(function () { return "Hello, " + $scope.name; }).subscribe(function (result) { console.log(result) });
}

module.exports = require('app').directive('packSample', /* @ngInject */ function () {
    return {
        templateUrl: "subject/sample.tpl.html",
        controller: SampleCtrl
    };
});