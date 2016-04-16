(function () {
    'use strict';

    var ngAOP = angular.module('ngAOP', ['AngularAOP']);

    ngAOP.provider('aop', ['executeProvider', function (executeProvider) {

        function Annotator(moduleName, $provide) {

            this.$provide = $provide;

            this.services = angular.module(moduleName)._invokeQueue.filter(function (info) {
                return info[1] === "service" || info[1] === "factory" || info[1] === "provider";
            }).map(function (info) {
                return info[2][0];
            });
        }

        Annotator.prototype.add = function add(annotation) {

            var self = this;

            if (angular.isString(annotation.target)) {
                executeProvider.annotate(self.$provide, trans(annotation.target, annotation.rule));
            } else {
                this.services.filter(function (serviceName) {
                    return annotation.target.test(serviceName);
                }).forEach(function (serviceName) {
                    executeProvider.annotate(self.$provide, trans(serviceName, annotation.rule));
                });
            }

        };

        function trans(name, rule) {
            var target = {};
            target[name] = rule;
            return target;
        }



        function getAnnotator(moduleName, $provide) {
            return new Annotator(moduleName, $provide);
        }

        this.getAnnotator = getAnnotator;

        this.$get = executeProvider.$get;

    }]);
})();