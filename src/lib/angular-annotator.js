(function () {
    'use strict';

    var slice = Array.prototype.slice;

    var Annotator = angular.module('Annotator', []);

    function getServices(moduleName) {
        return angular.module(moduleName)._invokeQueue.filter(function (info) {
            return info[1] === "service" || info[1] === "factory" || info[1] === "provider";
        }).map(function (info) {
            return info[2][0];
        });
    }

    function getMethods(target, rule) {
        
        var methodNames = [];
        
        for (var prop in target) {
            if (target.hasOwnProperty(prop) && angular.isFunction(target[prop])) {
                if (angular.isString(rule.method) && prop === rule.method) {
                    return [rule.method];
                } else if (!!rule.methodPattern && rule.methodPattern.test(prop)) {
                    methodNames.push(prop);
                }
            }
        }
        
        return methodNames;
    }
    
    
    var Advices = {},
        Flows = {
            DEFER : 'defer',
            DEBOUNCE : 'debounce',
            THROTTLE : 'throttle'
        };

    Advices[Flows.DEFER] = ['$aspect', 'annotator', function ($aspect, annotator) {
        return annotator.defer($aspect.method, $aspect.serviceName + "." + $aspect.methodName);
    }];
    
    Advices[Flows.DEBOUNCE] = ['$aspect', 'annotator', function ($aspect, annotator) {
        return annotator.debounce($aspect.method);
    }];

    Advices[Flows.THROTTLE] = ['$aspect', 'annotator', function ($aspect, annotator) {
        return annotator.throttle($aspect.method);
    }];
    
    function getAdvice(advice) {
        if (angular.isString(advice) && !!Advices[advice]) {
            return Advices[advice];
        } else {
            return advice;
        }
    }

    // 1. defer
    // 2. throttle
    // 3. debounce
    // ...
    Annotator.provider('annotator', [function () {

        var defaultDebounceTime = 1000,
            defaultThrottleTime = 1000;

        function Decorator(moduleName, $provide) {
            this.$provide = $provide;
            this.services = getServices(moduleName);
        }
        
        Decorator.prototype.add = function (aspect) {
            
            var self = this,
                targets,
                rules = angular.isArray(aspect.rules) ? aspect.rules : [aspect.rules];
            
            if (angular.isString(aspect.service)) {
                targets = [aspect.service];
            } else if (!!aspect.servicePattren) {
                targets = self.services.filter(aspect.servicePattren.test);
            } else {
                targets = self.services;
            }
            
            targets.forEach(function (serviceName) {
                
                self.$provide.decorator(serviceName, ['$delegate', '$injector', function ($delegate, $injector) {

                    rules.forEach(function (rule) {
                        var methodNames = getMethods($delegate, rule),
                            advice = getAdvice(rule.advice);

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
                    });
                    
                    return $delegate;
                }]);
                
            });
        };
        
        function getDecorator(moduleName, $provide) {
            return new Decorator(moduleName, $provide);
        }
        
        function setDefaultDebounceTime(time) {
            defaultDebounceTime = time || 1000;
        }

        function setDefaultThrottleTime(time) {
            defaultThrottleTime = time || 1000;
        }

        this.getDecorator = getDecorator;
        this.setDefaultDebounceTime = setDefaultDebounceTime;
        this.setDefaultThrottleTime = setDefaultThrottleTime;

        this.$get = ['$q', '$rootScope', function ($q, $rootScope) {

            // release

            function defer(target, name) {

                var lock = {
                        name : name,
                        state : undefined
                    };

                return function __deferWrapper__() {

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
            
            
            function debounce(target, time) {
                return _.debounce(target, time || defaultDebounceTime);
            }
            
            
            function throttle(target, time) {
                return _.throttle(target, time || defaultThrottleTime);
            }
            
            
            return {
                defer: defer,
                debounce: debounce,
                throttle: throttle
            };
        }];

        angular.extend(this, Flows);
        
    }]);
})();