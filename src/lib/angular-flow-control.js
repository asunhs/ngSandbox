(function () {
    'use strict';

    var slice = Array.prototype.slice;

    var FlowControl = angular.module('FlowControl', []);

    function getServices(moduleName) {
        return angular.module(moduleName)._invokeQueue.filter(function (info) {
            return info[1] === "service" || info[1] === "factory" || info[1] === "provider";
        }).map(function (info) {
            return info[2][0];
        });
    }

    function getMethods(target, aspect) {
        
        var methodNames = [];
        
        for (var prop in target) {
            if (target.hasOwnProperty(prop) && angular.isFunction(target[prop])) {
                if (angular.isString(aspect.method) && prop === aspect.method) {
                    return [aspect.method];
                } else if (!!aspect.methodPattern && aspect.methodPattern.test(prop)) {
                    methodNames.push(prop);
                }
            }
        }
        
        return methodNames;
    }

    // 1. one by one
    // 2. throttle
    // 3. debounce
    // ...
    FlowControl.provider('FlowControl', [function () {


        function Aspector(moduleName, $provide) {
            this.$provide = $provide;
            this.services = getServices(moduleName);
        }
        
        Aspector.prototype.add = function (aspect) {
            
            var self = this,
                targets;
            
            if (angular.isString(aspect.service)) {
                targets = [aspect.service];
            } else if (!!aspect.servicePattren) {
                targets = self.services.filter(aspect.servicePattren.test);
            } else {
                targets = self.services;
            }
            
            targets.forEach(function (serviceName) {
                self.$provide.decorator(serviceName, ['$delegate', 'FlowControl', function ($delegate, FlowControl) {
                    
                    var methodNames = getMethods($delegate, aspect);

                    methodNames.forEach(function (methodName) {
                        $delegate[methodName] = FlowControl.byOne($delegate[methodName], serviceName + "." + methodName);
                    });
                    
                    return $delegate;
                }]);
            });
        };
        
        function getAspector(moduleName, $provide) {
            return new Aspector(moduleName, $provide);
        }

        this.getAspector = getAspector;

        this.$get = ['$q', '$rootScope', function ($q, $rootScope) {

            // release

            function byOne(target, name) {

                var lock = {
                        name : name,
                        state : undefined
                    };

                return function __byOneWrapper__() {

                    if (lock.state == 'locked') {
                        return;
                    }

                    var args = slice.call(arguments);

                    lock.state = 'locked';

                    $rootScope.$emit('flow.lock', lock);

                    var result = target.apply(this, args);

                    $q.when(result).finally(function () {
                        lock.state = undefined;
                        $rootScope.$emit('flow.unlock', lock);
                    });

                    return result;
                }
            }

            return {
                byOne: byOne
            };
        }];
    }]);
})();