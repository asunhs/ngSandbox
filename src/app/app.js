

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
    
    function register(key) {
        annotatorProvider.registerAdvice(key, simpleAdviceProvider.getAdvice(key));
    }

    register(simpleAdviceProvider.DEFER);
    register(simpleAdviceProvider.DEFER_BY_KEY);
    register(simpleAdviceProvider.DEBOUNCE);
    register(simpleAdviceProvider.THROTTLE);
    
    var decorator = annotatorProvider.getDecorator($provide);
    
    decorator.service({
        modules: ['sandboxApp'],
        rules: [{
            methodPattern : /Once$/,
            advice : simpleAdviceProvider.DEFER_BY_KEY
        }]
    });
    
    decorator.controller({
        targetPattern : /Ctrl$/,
        rules: [{
            methodPattern : /Once$/,
            advice : simpleAdviceProvider.THROTTLE
        }]
    });
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