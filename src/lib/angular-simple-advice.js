(function () {
    'use strict';

    var slice = Array.prototype.slice;

    var SimpleAdvice = angular.module('SimpleAdvice', []);

    var Advices = {},
        Flows = {
            DEFER : 'defer',
            DEFER_BY_KEY : 'deferByKey',
            DEBOUNCE : 'debounce',
            THROTTLE : 'throttle'
        };

    Advices[Flows.DEFER] = ['$delegate', '$aspect', 'simpleAdvice', function ($delegate, $aspect, simpleAdvice) {
        return simpleAdvice.defer($delegate, $aspect.targetName + "." + $aspect.methodName);
    }];

    Advices[Flows.DEFER_BY_KEY] = ['$delegate', '$aspect', 'simpleAdvice', function ($delegate, $aspect, simpleAdvice) {
        return simpleAdvice.defer($delegate, $aspect.targetName + "." + $aspect.methodName, true);
    }];

    Advices[Flows.DEBOUNCE] = ['$delegate', 'simpleAdvice', function ($delegate, simpleAdvice) {
        return simpleAdvice.debounce($delegate);
    }];

    Advices[Flows.THROTTLE] = ['$delegate', 'simpleAdvice', function ($delegate, simpleAdvice) {
        return simpleAdvice.throttle($delegate);
    }];

    function getAdvice(advice) {
        if (angular.isString(advice) && !!Advices[advice]) {
            return Advices[advice];
        } else {
            return;
        }
    }

    // 1. defer
    // 2. throttle
    // 3. debounce
    // ...
    SimpleAdvice.provider('simpleAdvice', [function () {

        var defaultDebounceTime = 1000,
            defaultThrottleTime = 1000;

        function setDefaultDebounceTime(time) {
            defaultDebounceTime = time || 1000;
        }

        function setDefaultThrottleTime(time) {
            defaultThrottleTime = time || 1000;
        }
        
        function forEach(fn) {
            var key;
            for (key in Flows) {
                fn(Flows[key], Advices[Flows[key]]);
            }
        }

        this.setDefaultDebounceTime = setDefaultDebounceTime;
        this.setDefaultThrottleTime = setDefaultThrottleTime;
        
        this.getAdvice = getAdvice;
        this.forEach = forEach;

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
            
            return angular.extend({
                before: before,
                after: after,
                defer: defer,
                debounce: debounce,
                throttle: throttle
            }, Flows);
        }];

        angular.extend(this, Flows);

    }]);
})();