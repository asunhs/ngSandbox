
/* @ngInject */
function SampleCtrl ($scope) {
    $scope.name = "Foods";
    
    $scope.$createObservableFunction('sample').map(() => "Hello, " + $scope.name).subscribe(result => console.log(result));
}

module.exports = require('app').directive('packSample', /* @ngInject */ function () {
    return {
        templateUrl: "subject/sample.tpl.html",
        controller: SampleCtrl
    };
});