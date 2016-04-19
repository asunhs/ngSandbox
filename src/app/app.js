

/* @ngInject */
function AOPTest($provide, aopProvider) {

    var annotator = aopProvider.getAnnotator('sandboxApp', $provide);

    annotator.add({
        targetPattern : /^Sam.*/,
        rules : [{
            jointPoint: "before",
            advice: "LogTest",
            methodPattern: /test/
        },{
            jointPoint: "after",
            advice: "LogTest",
            methodPattern: /test/
        }]
    });

}



/* @ngInject */
function FlowTest($provide, annotatorProvider) {
    
    var decorator = annotatorProvider.getDecorator('sandboxApp', $provide);
    
    decorator.service({
        rules: [{
            methodPattern : /Once$/,
            advice : annotatorProvider.DEFER_BY_KEY
        }]
    });
    
    decorator.controller({
        targetPattern : /Ctrl$/,
        rules: [{
            methodPattern : /Once$/,
            advice : annotatorProvider.THROTTLE
        }]
    });
}



module.exports = angular.module('sandboxApp', [
    'templates-html',
    'ngAOP',
    'Annotator'
]).config(/* @ngInject */ function ($compileProvider, $httpProvider) {
    $compileProvider.debugInfoEnabled(false);
    $httpProvider.useApplyAsync(true);
}).config(FlowTest).factory("LogTest", function () {
    return function (data) {
        console.log("HI, " + data.when + ", " + data.method);
    };
}).run(/* @ngInject */ function (Sample1, $rootScope) {
    Sample1.test();

    $rootScope.$on('defer.lock', (e, data) => {
        console.log('locked', data.name, data.state);
    });

    $rootScope.$on('defer.unlock', (e, data) => {
        console.log('unlocked', data.name, data.state);
    });
});