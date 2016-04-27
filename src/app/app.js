module.exports = angular.module('sandbaxApp', [
    'templates-html',
    'rx'
]).config(/* @ngInject */ function ($compileProvider, $httpProvider) {
    $compileProvider.debugInfoEnabled(false);
    $httpProvider.useApplyAsync(true);
});