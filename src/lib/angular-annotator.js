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
        Aspects = {},
        JointPoints = {
            BEFORE: "before",
            AFTER: "after"
        },
        DECORATED = "__decorated";
    
    function getAdvice(advice) {
        if (angular.isString(advice) && !!Advices[advice]) {
            return Advices[advice];
        } else {
            return advice;
        }
    }

    function before(target, consumer) {
        return function () {
            consumer();
            return target.apply(this, slice.call(arguments));
        };
    }

    function after(target, functor) {
        return function () {
            var result = target.apply(this, slice.call(arguments));
            functor(result);
            return result;
        };
    }

    Aspects[JointPoints.BEFORE] = before;
    Aspects[JointPoints.AFTER] = after;

    // 1. defer
    // 2. throttle
    // 3. debounce
    // ...
    Annotator.provider('annotator', [function () {

        function getLocals(target, targetName, methodName, scope) {
            return {
                $delegate : target[methodName],
                $aspect : {
                    target: target,
                    targetName: targetName,
                    methodName: methodName
                },
                $scope : scope
            };
        }
        
        function Decorator($provide) {
            this.$provide = $provide;
        }
        
        Decorator.prototype.controller = function (aspect) {

            var self = this,
                rules = angular.isArray(aspect.rules) ? aspect.rules : [aspect.rules];

            function isTarget(targetName) {
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
            
            self.$provide.decorator('$controller', ['$delegate', '$injector', function ($delegate, $injector) {
                return function (constructor, locals, later) {
                    var scope = locals.$scope,
                        controllerInit = $delegate.apply(this, arguments),
                        targetName = angular.isString(constructor) ? constructor : undefined;
                    
                    function hook(instance) {
                        
                        var cache = {};
                        
                        function decorate(methodNames, decorator) {
                            return methodNames.forEach(function (methodName) {
                                if (!cache[methodName] && scope[methodName][DECORATED] == DECORATED) {
                                    return;
                                }
                                scope[methodName] = decorator(methodName);
                                scope[methodName][DECORATED] = cache[methodName] = DECORATED;
                            });
                        }
                        
                        if (isTarget(targetName)) {
                            rules.forEach(function (rule) {
                                var methodNames = getMethods(scope, rule),
                                    advice = getAdvice(rule.advice);
                                
                                if (!!rule.jointPoint && !!Aspects[rule.jointPoint]) {

                                    var joiner = Aspects[rule.jointPoint];

                                    return decorate(methodNames, function (methodName) {
                                        return joiner(scope[methodName], $injector.invoke(advice, null, getLocals(scope, targetName, methodName, scope)));
                                    });
                                }
    
                                decorate(methodNames, function (methodName) {
                                    return $injector.invoke(advice, null, getLocals(scope, targetName, methodName, scope));
                                });
                            });
                        }
                        
                        return instance;
                    }
                    
                    return angular.extend(function () {
                        return hook(controllerInit());
                    }, controllerInit);
                };
            }]);
            
            return this;
        };
        
        function getTargetServices(aspect) {
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
        }
        
        Decorator.prototype.service = function (aspect) {
            
            var self = this,
                targets = getTargetServices(aspect),
                rules = angular.isArray(aspect.rules) ? aspect.rules : [aspect.rules];
            
            targets.forEach(function (targetName) {
                
                self.$provide.decorator(targetName, ['$delegate', '$injector', '$rootScope', function ($delegate, $injector, $rootScope) {

                    rules.forEach(function (rule) {
                        var methodNames = getMethods($delegate, rule),
                            advice = getAdvice(rule.advice, $injector);
                        
                        if (!!rule.jointPoint && !!Aspects[rule.jointPoint]) {
                            
                            var joiner = Aspects[rule.jointPoint];
                            
                            return methodNames.forEach(function (methodName) {
                                $delegate[methodName] = joiner($delegate[methodName], $injector.invoke(advice, null, getLocals($delegate, targetName, methodName, $rootScope)));
                            });
                        }

                        methodNames.forEach(function (methodName) {
                            $delegate[methodName] = $injector.invoke(advice, null, getLocals($delegate, targetName, methodName, $rootScope));
                        });
                    });
                    
                    return $delegate;
                }]);
                
            });

            return this;
        };
        
        function getDecorator(moduleName, $provide) {
            return new Decorator(moduleName, $provide);
        }
        
        function registerAdvice(key, advice) {
            Advices[key] = advice;
        }

        this.getDecorator = getDecorator;
        this.registerAdvice = registerAdvice;
        
        this.$get = [function () {
            return angular.extend({
                getDecorator: getDecorator
            }, JointPoints);
        }];
        
        angular.extend(this, JointPoints);

    }]);
})();