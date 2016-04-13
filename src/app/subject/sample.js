
/* @ngInject */
function SampleCtrl ($scope) {
    $scope.name = "Foods";
}

function hello(fn) {
    fn("hello");
}

hello(str => console.log(str));

module.exports = require('app').directive('packSample', /* @ngInject */ function () {
    return {
        templateUrl: "subject/sample.tpl.html",
        controller: SampleCtrl
    };
});