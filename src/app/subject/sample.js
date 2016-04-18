
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

require('app').service('Sample1', /* @ngInject */ function ($http, $q, LockTest) {
    var svc = this;

    function send() {
        return $http.get('/test');
    }

    svc.send = send;

    function test() {
        console.log("Good");

        setTimeout(() => {
            console.log("Call");
            LockTest.callMeOnce().then(str => $q(resovle => {
                console.log("More after " + str);
                setTimeout(() => {
                    console.log("More End");
                    resovle();
                }, 2000);
            }));
        }, 200);

        setTimeout(() => {
            console.log("Call");
            LockTest.callMeOnce();
        }, 500);

        setTimeout(() => {
            console.log("Call");
            LockTest.callMeOnce();
        }, 1200);

        setTimeout(() => {
            console.log("Call");
            LockTest.callMeOnce();
        }, 4000);
    }

    svc.test = test;
});


require('app').provider('Sample2', /* @ngInject */ function () {
    this.$get = /* @ngInject */ function (Sample1) {
        this.send = () => Sample1.send();
    };
});