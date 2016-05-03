
/* @ngInject */
function TestCtrl ($q, $scope, Sample1) {
    
    var test = this;

    test.lets = () => console.log("LETS");
}

require('app').controller('TestCtrl', TestCtrl);