(function () {
    'use strict';

    var slice = Array.prototype.slice;

    var Annotator = angular.module('Annotator', []);

    function getServices(moduleNames) {
        return moduleNames.map(function (moduleName) {
            return angular.module(moduleName)._invokeQueue.filter(function (info) {
                return info[1] === "service" || info[1] === "factory" || info[1] === "provider";
            }).map(function (info) {
                return info[2][0];
            });
        }).reduce(function (lhs, rhs) { return lhs.concat(rhs); });
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
            DEFER_BY_KEY : 'deferByKey',    
            DEBOUNCE : 'debounce',
            THROTTLE : 'throttle'
        };

    Advices[Flows.DEFER] = ['$delegate', '$aspect', 'annotator', function ($delegate, $aspect, annotator) {
        return annotator.defer($delegate, $aspect.targetName + "." + $aspect.methodName);
    }];

    Advices[Flows.DEFER_BY_KEY] = ['$delegate', '$aspect', 'annotator', function ($delegate, $aspect, annotator) {
        return annotator.defer($delegate, $aspect.targetName + "." + $aspect.methodName, true);
    }];
    
    Advices[Flows.DEBOUNCE] = ['$delegate', 'annotator', function ($delegate, annotator) {
        return annotator.debounce($delegate);
    }];

    Advices[Flows.THROTTLE] = ['$delegate', 'annotator', function ($delegate, annotator) {
        return annotator.throttle($delegate);
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
        
        function getLocals(target, targetName, methodName) {
            return {
                $delegate : target[methodName],
                $aspect : {
                    target: target,
                    targetName: targetName,
                    methodName: methodName
                }
            };
        }
        
        function Decorator($provide) {
            this.$provide = $provide;
        }
        
        Decorator.prototype.controller = function (aspect) {

            var self = this,
                rules = angular.isArray(aspect.rules) ? aspect.rules : [aspect.rules];
            
            self.$provide.decorator('$controller', ['$delegate', '$injector', function ($delegate, $injector) {
                return function (constructor, locals, later) {
                    var apis = {},
                        $api = function (obj) {
                            angular.extend(apis, obj);
                        };
                    
                    locals.$api = $api;
                    
                    var controllerInit = $delegate.apply(this, arguments),
                        targetName = angular.isString(constructor) ? constructor : undefined;
                    
                    function isTarget() {
                        if (!aspect.target && !aspect.targetPattern) {
                            return true;
                        }
                        if (!targetName) {
                            return false;
                        }
                        if (angular.isString(aspect.target) && targetName != aspect.target) {
                            return false;
                        }
                        if (!!aspect.targetPattern && !aspect.targetPattern.test(targetName)) {
                            return false;
                        }
                        return true;
                    }
                    
                    function hook(instance) {
                        
                        if (isTarget()) {
                            rules.forEach(function (rule) {
                                var methodNames = getMethods(apis, rule),
                                    advice = getAdvice(rule.advice);
    
                                methodNames.forEach(function (methodName) {
                                    apis[methodName] = $injector.invoke(advice, null, getLocals(apis, targetName, methodName));
                                });
                            });
                        }
                        
                        angular.extend(locals.$scope, apis);
                        
                        return instance;
                    }
                    
                    return angular.extend(function () {
                        return hook(controllerInit());
                    }, controllerInit);
                };
            }]);
            
        };
        
        Decorator.prototype.getTargetServices = function (aspect) {
            if (angular.isString(aspect.target)) {
                return [aspect.target];
            }
            
            var modules;
            
            if (angular.isString(aspect.modules)) {
                modules = [aspect.modules];
            } else if (angular.isArray(aspect.modules) && aspect.modules.length > 0) {
                modules = aspect.modules;
            } else {
                throw "no conditional or service pattern matching for finding services need specific modules { modules: [] }";
            }

            if (!!aspect.targetPattern) {
                return getServices(modules).filter(aspect.targetPattern.test);
            } else {
                return getServices(modules);
            }
        };
        
        Decorator.prototype.service = function (aspect) {
            
            var self = this,
                targets = self.getTargetServices(aspect),
                rules = angular.isArray(aspect.rules) ? aspect.rules : [aspect.rules];
            
            targets.forEach(function (targetName) {
                
                self.$provide.decorator(targetName, ['$delegate', '$injector', function ($delegate, $injector) {

                    rules.forEach(function (rule) {
                        var methodNames = getMethods($delegate, rule),
                            advice = getAdvice(rule.advice);

                        methodNames.forEach(function (methodName) {
                            $delegate[methodName] = $injector.invoke(advice, null, getLocals($delegate, targetName, methodName));
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

            function Lock(name) {
                this.name = name;
                this.state = undefined;
            }
            
            Lock.defaultKey = 'DEFAULT';
            Lock.LOCKED = 'LOCKED';
            Lock.UNLOCKED = 'UNLOCKED';
            Lock.LOCKE_EVENT = 'defer.lock';
            Lock.UNLOCKE_EVENT = 'defer.unlock';

            function defer(target, name, usingKey) {

                var locks = {};

                return function __deferWrapper__(key) {
                    
                    var lock;
                    
                    key = (!usingKey || !key) ? Lock.defaultKey : key;
                    
                    if (!locks[key]) {
                        locks[key] = new Lock(name);
                    }
                    
                    lock = locks[key];

                    if (lock.state == Lock.LOCKED) {
                        return;
                    }

                    var args = slice.call(arguments);

                    lock.state = Lock.LOCKED;

                    $rootScope.$emit(Lock.LOCKE_EVENT, lock);

                    var result = target.apply(this, args);

                    $q.when(result).finally(function () {
                        lock.state = undefined;
                        $rootScope.$emit(Lock.UNLOCKE_EVENT, lock);
                        delete locks[key];
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