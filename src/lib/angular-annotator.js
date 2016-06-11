(function () {
    'use strict';

    var slice = Array.prototype.slice,
        extend = angular.extend,
        isString = angular.isString,
        isArray = angular.isArray,
        isFunction = angular.isFunction;

    var CNTRL_REG = /^(\S+)(\s+as\s+([\w$]+))?$/;

    var Annotator = angular.module('Annotator', []);

    function safeApply(fn) {
        var phase = this.$root.$$phase;
        if(phase == '$apply' || phase == '$digest') {
            if(fn && (typeof(fn) === 'function')) {
                fn();
            }
        } else {
            this.$apply(fn);
        }
    }

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
        
        var methodNames = [],
            pattern = rule.methodPattern;
        
        for (var prop in target) {
            if (target.hasOwnProperty(prop) && isFunction(target[prop])) {
                if (isString(rule.method) && prop === rule.method) {
                    return [rule.method];
                } else if (!!pattern && pattern.test(prop)) {
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
        if (isString(advice) && !!Advices[advice]) {
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
                rules = isArray(aspect.rules) ? aspect.rules : [aspect.rules];

            function isTarget(targetName) {
                if (!aspect.target && !aspect.targetPattern) {
                    return true;
                }
                if (!targetName) {
                    return false;
                }
                if (isString(aspect.target) && targetName != aspect.target) {
                    return false;
                }
                if (!!aspect.targetPattern && !aspect.targetPattern.test(targetName)) {
                    return false;
                }
                return true;
            }
            
            self.$provide.decorator('$controller', ['$delegate', '$injector', function ($delegate, $injector) {
                return function (expression, locals, later, ident) {
                    var scope = locals.$scope,
                        controllerInit = $delegate.apply(this, arguments),
                        targetName,
                        identifier,
                        match;

                    scope.safeApply = safeApply;
                    
                    if (ident && isString(ident)) {
                        identifier = ident;
                    }

                    if (isString(expression)) {
                        match = expression.match(CNTRL_REG);
                        if (match) {
                            targetName = match[1];
                            identifier = identifier || match[3];
                        }
                    }
                    
                    function hook(instance) {
                        
                        var cache = {},
                            target = !identifier ? scope : instance;
                        
                        function decorate(methodNames, decorator) {
                            return methodNames.forEach(function (methodName) {
                                if (!cache[methodName] && target[methodName][DECORATED] == DECORATED) {
                                    return;
                                }
                                target[methodName] = decorator(methodName);
                                target[methodName][DECORATED] = cache[methodName] = DECORATED;
                            });
                        }
                        
                        if (isTarget(targetName)) {
                            rules.forEach(function (rule) {
                                var methodNames = getMethods(target, rule),
                                    advice = getAdvice(rule.advice);
                                
                                function invoke(methodName) {
                                    return $injector.invoke(advice, null, getLocals(target, targetName, methodName, scope));
                                }
                                
                                if (!!rule.jointPoint && !!Aspects[rule.jointPoint]) {

                                    var joiner = Aspects[rule.jointPoint];

                                    return decorate(methodNames, function (methodName) {
                                        return joiner(target[methodName], invoke(methodName));
                                    });
                                }
    
                                decorate(methodNames, invoke);
                            });
                        }
                        
                        return instance;
                    }
                    
                    
                    if (later) {
                        return extend(function () {
                            return hook(controllerInit());
                        }, controllerInit);
                    } else {
                        return hook(controllerInit);
                    }
                    
                    
                };
            }]);
            
            return this;
        };
        
        function getTargetServices(aspect) {
            if (isString(aspect.target)) {
                return [aspect.target];
            }
            
            var modules;
            
            if (isString(aspect.modules)) {
                modules = [aspect.modules];
            } else if (isArray(aspect.modules) && aspect.modules.length > 0) {
                modules = aspect.modules;
            } else {
                throw "no conditional or service pattern matching for finding services need specific modules { modules: [] }";
            }

            if (!!aspect.targetPattern) {
                return getServices(modules).filter(function (moduleName) {
                    return aspect.targetPattern.test(moduleName);
                });
            } else {
                return getServices(modules);
            }
        }
        
        Decorator.prototype.service = function (aspect) {
            
            var self = this,
                targets = getTargetServices(aspect),
                rules = isArray(aspect.rules) ? aspect.rules : [aspect.rules];
            
            targets.forEach(function (targetName) {
                
                self.$provide.decorator(targetName, ['$delegate', '$injector', '$rootScope', function ($delegate, $injector, $rootScope) {

                    rules.forEach(function (rule) {
                        var methodNames = getMethods($delegate, rule),
                            advice = getAdvice(rule.advice, $injector);

                        function invoke(methodName) {
                            return $injector.invoke(advice, null, getLocals($delegate, targetName, methodName, $rootScope));
                        }
                        
                        if (!!rule.jointPoint && !!Aspects[rule.jointPoint]) {
                            
                            var joiner = Aspects[rule.jointPoint];
                            
                            return methodNames.forEach(function (methodName) {
                                $delegate[methodName] = joiner($delegate[methodName], invoke(methodName));
                            });
                        }

                        methodNames.forEach(function (methodName) {
                            $delegate[methodName] = invoke(methodName);
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
            return extend({
                getDecorator: getDecorator
            }, JointPoints);
        }];
        
        extend(this, JointPoints);

    }]);
})();