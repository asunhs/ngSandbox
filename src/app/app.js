

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
    
    decorator.add({
        rules: [{
            methodPattern : /Once$/,
            advice : annotatorProvider.DEFER
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

    $rootScope.$on('flow.lock', (e, data) => {
        console.log('locked', data.name, data.state);
    });

    $rootScope.$on('flow.unlock', (e, data) => {
        console.log('unlocked', data.name, data.state);
    });
});