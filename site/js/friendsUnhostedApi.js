define(['underscore', 'when', 'remoteAdapter'], 
        function( _, when, rem) {

    var fuapi = {};
    var STATUS_KEY_V3 = 'friendsunhosted_status';
    var FRIENDS_KEY = 'friendsunhosted_friends';
    var currentUser = null;

    fuapi.beforeBackgroundTaskListeners = [];
    fuapi.afterBackgroundTaskListeners = [];
    
    fuapi.addFriend = function(friendsUsername) {
        var afterAdding = when.defer();

        var emailRegex = /^([a-zA-Z0-9_\.\-])+\@([a-zA-Z0-9\-\.])+$/;
        
        if(!friendsUsername || !emailRegex.test(friendsUsername)) {
          afterAdding.reject("Invalid username: " + friendsUsername);
          return afterAdding.promise;
        }
        
        var friendData = {"username": friendsUsername,
                        "timestamp": fuapi.getTimestamp()};
        rem.fetchUserData(FRIENDS_KEY).then(function(value) {
            value = value || [];
            if(_.any(value, function(f) {
                    return f.username==friendsUsername;
                })) {
                afterAdding.reject('Cannot add the same user twice');
            } else {
                value.push(friendData);
                rem.putUserData(FRIENDS_KEY, value).then(function(keyValCat) {
                    afterAdding.resolve(friendData);
                }, function(err) { afterAdding.reject("Could not put friend in storage: "+ err);});
            }
        }, function(err) { afterAdding.reject("Could not fetch friend data from storage: "+ err);});        

        return afterAdding.promise;
    };
    
    fuapi.removeFriend = function(friendToRemove) {
        var afterRemoving = when.defer();
        
        rem.fetchUserData(FRIENDS_KEY).then(function(value) {
            value = value || [];
            if(value.pop(friendToRemove)) {
                rem.putUserData(FRIENDS_KEY, value).then(function(keyValCat) {
                    afterRemoving.resolve(friendToRemove);
                }, function(err) {
                    afterRemoving.reject("Could not remove friend: " + err);
                });
            } else {
                afterRemoving.reject("No such friend");
            }
        }, function(err) { afterRemoving.reject("Could not fetch friend data from storage: "+ err);});

        return afterRemoving.promise;
    };
    
    fuapi.fetchFriends = function() {
        var def = when.defer();
        rem.fetchUserData(FRIENDS_KEY).then(
                function(data) {def.resolve(data||[]);},
                def.reject);
        return def.promise;
    };
    
    fuapi.fetchStatus = function() {
        var def = when.defer();
        rem.fetchUserData(STATUS_KEY_V3).then(
                function(data) {def.resolve(data||[]);},
                def.reject);
        return def.promise;
    };

    var getVersionForUser = function(username) {
        return rem.getPublicData(username, 'VERSION');
    };
    
    fuapi.fetchStatusForUser = function(username) {
        var afterUserStatus = when.defer();
        
        rem.getPublicData(username, STATUS_KEY_V3).then(
            function(data) {
                afterUserStatus.resolve(data||[]);
            },
            function(error) {
                afterUserStatus.reject(error);
            }
        );
               
        return afterUserStatus.promise;
    };
    
    var addStatusOrReply = function(statusData) {
        var afterStatusUpdate = when.defer();
        rem.fetchUserData(STATUS_KEY_V3).then(function(statusUpdates) {
            statusUpdates = statusUpdates || [];
            statusUpdates.push(statusData);
            rem.putUserData(STATUS_KEY_V3, statusUpdates).then(function() {
                afterStatusUpdate.resolve(statusUpdates);
            }, function(err) { 
                afterStatusUpdate.reject("Could set status data: " + err);
            });
        }, function(err) { 
            if(err == 404) {
                rem.putUserData(STATUS_KEY_V3, [statusData]).then(function(data) {
                    afterStatusUpdate.resolve([statusData]);
                }, afterStatusUpdate.reject);
            } else {
                afterStatusUpdate.reject("Could not access status data: " + err);
            }
        });

        return afterStatusUpdate.promise;
    };

    fuapi.getTimestamp = function() {
        return new Date().getTime();
    };
    
    fuapi.addStatus = function(status, username) {
        return addStatusOrReply({
                "status": status,
                "timestamp": fuapi.getTimestamp(),
                "username": username,
            });
    };

    fuapi.addReply = function(reply, inReplyTo, username) {
        return addStatusOrReply({
            'username': username,
            'timestamp': fuapi.getTimestamp(),
            'status': reply,
            'inReplyTo': inReplyTo,
          });
    };
    
    fuapi.addBackgroundTaskListeners = function(before, after) {
      fuapi.beforeBackgroundTaskListeners.push(before);  
      fuapi.afterBackgroundTaskListeners.push(after);  
    };
    
    fuapi.init = function() {
        return rem.restoreLogin();
    };
    
    fuapi.login = function(username) {
        return rem.login(username);
    };
    
    fuapi.logout = function() {
        return rem.logout();
    };
    
    fuapi.removeAllStatuses = function() {
        return rem.deleteUserData(STATUS_KEY_V3);
    };
    
    fuapi.removeAllFriends = function() {
        return rem.deleteUserData(FRIENDS_KEY);
    };
    
    return fuapi;
});

