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
            DEFER_BY_KEY : 'deferByKey',    
            DEBOUNCE : 'debounce',
            THROTTLE : 'throttle'
        };

    Advices[Flows.DEFER] = ['$aspect', 'annotator', function ($aspect, annotator) {
        return annotator.defer($aspect.method, $aspect.targetName + "." + $aspect.methodName);
    }];

    Advices[Flows.DEFER_BY_KEY] = ['$aspect', 'annotator', function ($aspect, annotator) {
        return annotator.defer($aspect.method, $aspect.targetName + "." + $aspect.methodName, true);
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
        
        function getLocals(target, targetName, methodName) {
            return {
                $delegate : target,
                $aspect : {
                    targetName: targetName,
                    methodName: methodName,
                    method: target[methodName]
                }
            };
        }
        
        function Decorator(moduleName, $provide) {
            
            this.$provide = $provide;
            this.services = getServices(moduleName);
        }
        
        Decorator.prototype.controller = function (aspect) {

            var self = this,
                rules = angular.isArray(aspect.rules) ? aspect.rules : [aspect.rules];
            
            self.$provide.decorator('$controller', ['$delegate', '$injector', function ($delegate, $injector) {
                return function (constructor, locals) {
                    var controllerInit = $delegate.apply(this, arguments),
                        instance = controllerInit.instance,
                        origInit = instance.$onInit,
                        targetName = angular.isString(constructor) ? constructor : undefined;
                    
                    locals.$api = {};
                    
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
                    
                    function hook() {
                        
                        if (isTarget()) {
                            rules.forEach(function (rule) {
                                var methodNames = getMethods(locals.$api, rule),
                                    advice = getAdvice(rule.advice);
    
                                methodNames.forEach(function (methodName) {
                                    locals.$api[methodName] = $injector.invoke(advice, null, getLocals(locals.$api, targetName, methodName));
                                });
                            });
                        }
                        
                        angular.extend(locals.$scope, locals.$api);
                        
                        instance.$onInit = origInit;
                    }
                    
                    if (angular.isFunction(origInit)) {
                        instance.$onInit = function () {
                            origInit.call(instance);
                            hook.call(instance);
                        };
                    } else {
                        instance.$onInit = hook;
                    }
                    
                    return controllerInit;
                };
            }]);
            
        };
        
        Decorator.prototype.service = function (aspect) {
            
            var self = this,
                targets,
                rules = angular.isArray(aspect.rules) ? aspect.rules : [aspect.rules];
            
            if (angular.isString(aspect.target)) {
                targets = [aspect.target];
            } else if (!!aspect.targetPattern) {
                targets = self.services.filter(aspect.targetPattern.test);
            } else {
                targets = self.services;
            }
            
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