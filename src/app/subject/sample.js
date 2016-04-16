
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

require('app').service('Sample1', /* @ngInject */ function ($http) {
    var svc = this;

    function send() {
        return $http.get('/test');
    }

    svc.send = send;

    svc.test = function () {
        console.log("Good");
    };
});


require('app').provider('Sample2', /* @ngInject */ function () {
    this.$get = /* @ngInject */ function (Sample1) {
        this.send = () => Sample1.send();
    };
});