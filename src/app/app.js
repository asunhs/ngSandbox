module.exports = angular.module('sandboxApp', [
    'templates-html',
    'ngAOP'
]).config(/* @ngInject */ function ($compileProvider, $httpProvider) {
    $compileProvider.debugInfoEnabled(false);
    $httpProvider.useApplyAsync(true);
}).config(/* @ngInject */ function ($provide, aopProvider) {
    var annotator = aopProvider.getAnnotator('sandboxApp', $provide);

    annotator.add({
        target : /^Sam.*/,
        rule : [{
            jointPoint: "before",
            advice: "LogTest"
        },{
            jointPoint: "after",
            advice: "LogTest"
        }]
    });
}).factory("LogTest", function () {
    return function () {
        console.log("HI");
    };
}).run(/* @ngInject */ function (Sample1) {
    Sample1.test();
});