(function () {
    'use strict';

    var slice = Array.prototype.slice;

    var FlowControl = angular.module('FlowControl', []);



    // 1. one by one
    // 2. throttle
    // 3. debounce
    // ...
    FlowControl.provider('FlowControl', [function () {






        this.$get = ['$q', '$rootScope', function ($q, $rootScope) {

            // release

            function byOne(target, name) {

                var lock = {
                        name : name,
                        state : undefined
                    };

                return function () {

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