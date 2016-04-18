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
    
    
    var Advices = {},
        Flows = {
            BY_ONE : 'byOne'
        };

    Advices[Flows.BY_ONE] = ['$aspect', 'flowControl', function ($aspect, flowControl) {
        return flowControl.byOne($aspect.method, $aspect.serviceName + "." + $aspect.methodName);
    }];
    
    function getAdvice(advice) {
        if (angular.isString(advice) && !!Advices[advice]) {
            return Advices[advice];
        } else {
            return advice;
        }
    }

    // 1. one by one
    // 2. throttle
    // 3. debounce
    // ...
    FlowControl.provider('flowControl', [function () {


        function Decorator(moduleName, $provide) {
            this.$provide = $provide;
            this.services = getServices(moduleName);
        }
        
        Decorator.prototype.add = function (aspect) {
            
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
                
                self.$provide.decorator(serviceName, ['$delegate', '$injector', function ($delegate, $injector) {

                    var methodNames = getMethods($delegate, aspect),
                        advice = getAdvice(aspect.advice);
                    
                    methodNames.forEach(function (methodName) {
                        $delegate[methodName] = $injector.invoke(advice, null, {
                            $aspect : {
                                target: $delegate,
                                serviceName: serviceName,
                                methodName: methodName,
                                method: $delegate[methodName]
                            }
                        });
                    });
                    
                    return $delegate;
                }]);
                
            });
        };
        
        function getDecorator(moduleName, $provide) {
            return new Decorator(moduleName, $provide);
        }

        this.getDecorator = getDecorator;

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

        angular.extend(this, Flows);
        
    }]);
})();