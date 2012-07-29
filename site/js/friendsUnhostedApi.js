define(['underscore', 'when', 'remoteAdapter', 'storageConversion'], 
        function( _, when, rem, storageConversion) {

    var val = {};
    var STATUS_KEY = 'friendsunhosted_statusupdate_testing';
    var FRIENDS_KEY = 'friendsunhosted_friends';
    var userToStorageVersion = {};
    var currentUser = null;
    
    val.addFriend = function(friendsUsername) {
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
    
    val.removeFriend = function(friendToRemove) {
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
    
    val.fetchFriends = function() {
        var def = when.defer();
        rem.fetchUserData(FRIENDS_KEY).then(
                function(data) {def.resolve(data||[]);},
                def.reject);
        return def.promise;
    };
    
    val.fetchStatus = function() {
        var def = when.defer();
        rem.fetchUserData(STATUS_KEY).then(
                function(data) {def.resolve(data||[]);},
                def.reject);
        return def.promise;
    };

    val.fetchStatusForUser = function(username) {
        return rem.getPublicData(username, STATUS_KEY);
    };
    
    var addStatusOrReply = function(statusData) {
        var afterStatusUpdate = when.defer();
        
        rem.fetchUserData(STATUS_KEY).then(function(statusUpdates) {
            statusUpdates = statusUpdates || [];
            statusUpdates.push(statusData);
            rem.putUserData(STATUS_KEY, statusUpdates).then(function() {
                afterStatusUpdate.resolve(statusUpdates);
            }, function(err) { afterStatusUpdate.reject("Could not update status: " + err);});
        }, function(err) { afterStatusUpdate.reject("Could access status data: " + err);});

        return afterStatusUpdate.promise;
    };

    val.addStatus = function(status, username) {
        return addStatusOrReply({
                "status": status,
                "timestamp": new Date().getTime(),
                "username": username,
            });
    };

    val.addReply = function(reply, inReplyTo, username) {
        return addStatusOrReply({
            'username': username,
            'timestamp': new Date().getTime(),
            'status': reply,
            'inReplyTo': inReplyTo,
          });
    };
    
    val.init = function() {
        return rem.init();
    };
    
    val.login = function(username) {
        return rem.login(username);
    };
    
    val.logout = function() {
        return rem.logout();
    };
    
    val.removeAllStatuses = function() {
        return rem.deleteUserData(STATUS_KEY);
    };
    
    val.removeAllFriends = function() {
        return rem.deleteUserData(FRIENDS_KEY);
    };
    
    return val;
});

