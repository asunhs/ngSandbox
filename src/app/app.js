

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
function FlowTest($provide, annotatorProvider, simpleAdviceProvider) {
    
    simpleAdviceProvider.forEach(annotatorProvider.registerAdvice);
    
    annotatorProvider.getDecorator($provide).service({
        modules: ['sandboxApp'],
        rules: [{
            methodPattern : /Once$/,
            advice : simpleAdviceProvider.DEFER_BY_KEY
        },{
            methodPattern : /One$/,
            advice : simpleAdviceProvider.DEBOUNCE
        }]
    }).controller({
        targetPattern : /Ctrl$/,
        rules: [{
            methodPattern : /One$/,
            jointPoint : annotatorProvider.BEFORE,
            advice : /* @ngInject */ function ($aspect) {
                return () => console.log($aspect.targetName + "." + $aspect.methodName);
            }
        },{
            methodPattern : /One$/,
            jointPoint : annotatorProvider.AFTER,
            advice : /* @ngInject */ function ($aspect) {
                return result => console.log($aspect.targetName + "." + $aspect.methodName, result);
            }
        },{
            methodPattern : /One$/,
            advice : simpleAdviceProvider.LEADING
        }]
    });

    simpleAdviceProvider.setDefaultDebounceTime(500);
}



module.exports = angular.module('sandboxApp', [
    'templates-html',
    'ngAOP',
    'Annotator',
    'SimpleAdvice'
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