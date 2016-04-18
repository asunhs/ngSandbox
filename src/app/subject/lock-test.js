
/* @ngInject */
function LockTest($q, FlowControl) {

    // Async and Expensive
    function callMeOnce() {
        console.log("Execute");
        return $q(function (resolve) {
            setInterval(resolve, 2000);
        }).then(() => {
            console.log("Done");
            return "Done";
        });
    }

    this.callMeOnce = callMeOnce;
    //this.callMeOnce = FlowControl.byOne(callMeOnce, 'callMeOnce');
}


require('app').service('LockTest', LockTest);