
/* @ngInject */
function LockTest($q) {

    // Async and Expensive
    function callMeOnce(key) {
        console.log("Execute : " + key);
        return $q(function (resolve) {
            setInterval(resolve, 1800);
        }).then(() => {
            console.log("Done");
            return "Done";
        });
    }

    this.callMeOnce = callMeOnce;
    //this.callMeOnce = FlowControl.byOne(callMeOnce, 'callMeOnce');
}


require('app').service('LockTest', LockTest);