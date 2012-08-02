define(['underscore', 'when', 'remoteAdapter', 'storageConversion'], 
        function( _, when, rem, storageConversion) {

    var fuapi = {};
    var STATUS_KEY_V0 = 'friendsunhosted_statusupdate_testing';
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
                        "timestamp": new Date().getTime()};
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
        
        rem.getPublicData(username, STATUS_KEY_V0)
               .then(afterUserStatus.resolve, afterUserStatus.reject);
        
        return afterUserStatus.promise;
    };
    
    var addStatusOrReply = function(statusData) {
        var afterStatusUpdate = when.defer();
        
        rem.fetchUserData(STATUS_KEY_V3).then(function(statusUpdates) {
            statusUpdates = statusUpdates || [];
            statusUpdates.push(statusData);
            rem.putUserData(STATUS_KEY_V3, statusUpdates).then(function() {
                afterStatusUpdate.resolve(statusUpdates);
            }, function(err) { afterStatusUpdate.reject("Could not update status: " + err);});
        }, function(err) { afterStatusUpdate.reject("Could access status data: " + err);});

        return afterStatusUpdate.promise;
    };

    fuapi.addStatus = function(status, username) {
        return addStatusOrReply({
                "status": status,
                "timestamp": new Date().getTime(),
                "username": username,
            });
    };

    fuapi.addReply = function(reply, inReplyTo, username) {
        return addStatusOrReply({
            'username': username,
            'timestamp': new Date().getTime(),
            'status': reply,
            'inReplyTo': inReplyTo,
          });
    };
    
    fuapi.addBackgroundTaskListeners = function(before, after) {
      fuapi.beforeBackgroundTaskListeners.push(before);  
      fuapi.afterBackgroundTaskListeners.push(after);  
    };
    
    fuapi.init = function() {
        var deferred = when.defer();
        
        rem.restoreLogin().then(function(username) {
                for(var i = 0; i<fuapi.beforeBackgroundTaskListeners.length; i++) {
                    fuapi.beforeBackgroundTaskListeners[i]();
                }
//              _.each(fuapi.beforeBackgroundTaskListeners, function(fn) {fn();});
                
                storageConversion.convertStorage().then(function(version) {
                    for(var j = 0; j<fuapi.afterBackgroundTaskListeners.length; j++) {
                        fuapi.afterBackgroundTaskListeners[j]();
                    }
                    //_.each(fuapi.afterBackgroundTaskListeners, function(fn) {fn();});
                    deferred.resolve(username);
                }, deferred.reject);
            }, deferred.reject );
        
        return deferred.promise;
    };
    
    fuapi.login = function(username) {
        return rem.login(username);
    };
    
    fuapi.logout = function() {
        return rem.logout();
    };
    
    fuapi.removeAllStatuses = function() {
        return rem.deleteUserData(STATUS_KEY_V3)
            .then(function() {
                return rem.deleteUserData(STATUS_KEY_V0);
            });
    };
    
    fuapi.removeAllFriends = function() {
        return rem.deleteUserData(FRIENDS_KEY);
    };
    
    return fuapi;
});

