'use strict';

//Declare module which depends on filters, and services
angular.module('notificationWidget', [])
// Declare an http interceptor that will signal the start and end of each request
.config(['$httpProvider', function ($httpProvider) {
    var $http = undefined,
        interceptor = ['$q', '$injector', function ($q, $injector) {
            var notificationChannel = undefined;
            var loadingWidgetOverride = undefined;

            function success(response) {
                // get $http via $injector because of circular dependency problem
                $http = $http || $injector.get('$http');
                // don't send notification until all requests are complete
                if ($http.pendingRequests.length < 1) {
                    // get requestNotificationChannel via $injector because of circular dependency problem
                    notificationChannel = notificationChannel || $injector.get('requestNotificationChannel');
                    // send a notification requests are complete
                    notificationChannel.requestEnded();
                }
                return response;
            }

            function error(response) {
                // get $http via $injector because of circular dependency problem
                $http = $http || $injector.get('$http');
                // don't send notification until all requests are complete
                if ($http.pendingRequests.length < 1) {
                    // get requestNotificationChannel via $injector because of circular dependency problem
                    notificationChannel = notificationChannel || $injector.get('requestNotificationChannel');
                    // send a notification requests are complete
                    notificationChannel.requestEnded();
                }
                return $q.reject(response);
            }

            return function (promise) {
                // get requestNotificationChannel via $injector because of circular dependency problem
                notificationChannel = notificationChannel || $injector.get('requestNotificationChannel');
                // get loadingWidgetOverride via $injector because of circular dependency problem
                loadingWidgetOverride = loadingWidgetOverride || $injector.get('loadingWidgetOverride');
                // send a notification requests are complete only if we have not received a request to cancel
                if (!loadingWidgetOverride.getCancelNextRequestNotification()) {
                  notificationChannel.requestStarted();
                }

                return promise.then(success, error);
            };
        }];

    $httpProvider.responseInterceptors.push(interceptor);
}])
// declare the notification pub/sub channel
.factory('requestNotificationChannel', ['$rootScope', function($rootScope){
    // private notification messages
    var _START_REQUEST_ = '_START_REQUEST_';
    var _END_REQUEST_ = '_END_REQUEST_';

    // publish start request notification
    var requestStarted = function() {
        $rootScope.$broadcast(_START_REQUEST_);
    };
    // publish end request notification
    var requestEnded = function() {
        $rootScope.$broadcast(_END_REQUEST_);
    };
    // subscribe to start request notification
    var onRequestStarted = function($scope, handler){
        $scope.$on(_START_REQUEST_, function(event){
            handler();
        });
    };
    // subscribe to end request notification
    var onRequestEnded = function($scope, handler){
        $scope.$on(_END_REQUEST_, function(event){
            handler();
        });
    };

    return {
        requestStarted:  requestStarted,
        requestEnded: requestEnded,
        onRequestStarted: onRequestStarted,
        onRequestEnded: onRequestEnded
    };
}])
// declare the directive that will show and hide the loading widget
.directive('loadingWidget', ['requestNotificationChannel', function (requestNotificationChannel) {
    return {
        restrict: "A",
        link: function (scope, element) {
            // hide the element initially
            element.hide();

            var startRequestHandler = function() {
                // got the request start notification, show the element
                element.show();
            };

            var endRequestHandler = function() {
                // got the request start notification, show the element
                element.hide();
            };
            // register for the request start notification
            requestNotificationChannel.onRequestStarted(scope, startRequestHandler);
            // register for the request end notification
            requestNotificationChannel.onRequestEnded(scope, endRequestHandler);
        }
    };
}])
// Added extra service to communicate with interceptor and tell it to cancel the loading widget on the next request
.service('loadingWidgetOverride', function() {
  var overrideCount = 0;

  return {
    cancelNextRequestNotification : function () {
      overrideCount++;
    },

    getCancelNextRequestNotification : function () {
      if (overrideCount > 0) {
        overrideCount--;
        return true;
      }
      else {
        return false;
      }
    } 
  };
});
