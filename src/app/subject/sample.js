
function bye() {
    console.log("Bye");
}


/* @ngInject */
function SampleCtrl ($q, $scope, Sample1) {
    
    var sample = this;

    sample.name = "Foods";
    sample.bye = () => Sample1.byeOne();
    sample.byeOne = () => console.log("Good");
    sample.doBye = () => {
        return $q(res => {
            setTimeout(() => {
                console.log("Do");
                return res();
            }, 2000);
        });
    };
    
    $scope.$on("defer.lock", function () {
        console.log("SampleCtrl!!!!");
    });
}

function hello(fn) {
    fn("hello");
}

hello(str => console.log(str));

module.exports = require('app').directive('packSample', /* @ngInject */ function () {
    return {
        templateUrl: "subject/sample.tpl.html",
        compile: function compile(tElement, tAttrs, transclude) {
            return {
                pre: function (scope, element, attr) {
                    console.log("Pre", scope.name);
                },
                post : function (scope, element, attr) {
                    console.log("Post", scope.name);
                }
            };
        },
        controller: 'SampleCtrl',
        controllerAs: 'sample'
    };
}).controller('SampleCtrl', SampleCtrl);

require('app').service('Sample1', /* @ngInject */ function ($http, $q, LockTest) {
    var svc = this;

    function send() {
        return $http.get('/test');
    }

    svc.send = send;

    function test() {
        /*
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
            LockTest.callMeOnce(5);
        }, 500);

        setTimeout(() => {
            console.log("Call");
            LockTest.callMeOnce();
        }, 1200);

        setTimeout(() => {
            console.log("Call");
            LockTest.callMeOnce();
        }, 4000);
        */
    }

    svc.test = test;
    
    svc.byeOne = bye;
});


require('app').provider('Sample2', /* @ngInject */ function () {
    this.$get = /* @ngInject */ function (Sample1) {
        this.send = () => Sample1.send();
    };
});