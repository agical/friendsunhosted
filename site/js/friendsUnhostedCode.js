define([], function() {
    return function( _, when, rem, dialog) {

        var fuapi = {};
        var STATUS_KEY_V3 = 'friendsunhosted_status';
        var FRIENDS_KEY = 'friendsunhosted_friends';
        var currentUser = null;

        fuapi.beforeBackgroundTaskListeners = [];
        fuapi.afterBackgroundTaskListeners = [];
        
        
        var verifyUpdatingEmptyFriends = function() {
            return dialog
                .confirm("You seem to have no friends in your store. Press Cancel if you have added friends previously! " +
                "If this really is the first friend you add, then all is fine and you may press the ok button.");
        };

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
                if(value && _.any(value, function(f) {
                    return f.username==friendsUsername;
                })) {
                    afterAdding.reject('Cannot add the same user twice');
                    return afterAdding.promise;
                }

                function doAddFriend() {
                    value = value || [];
                    value.push(friendData);
                    rem.putUserData(FRIENDS_KEY, value).then(function(keyValCat) {
                        afterAdding.resolve(friendData);
                    }, function(err) { afterAdding.reject("Could not put friend in storage: "+ err);});
                }
                                
                if(!value) {
                    verifyUpdatingEmptyFriends()
                        .then(doAddFriend, afterAdding.reject);
                } else {
                    doAddFriend();
                }

            }, function(err) { 
                if(err == 404) {
                    verifyUpdatingEmptyFriends()
                        .then(function() {
                            rem.putUserData(FRIENDS_KEY, [friendData]).then(function(keyValCat) {
                                afterAdding.resolve(friendData);
                            }, function(err) { afterAdding.reject("Could not put friend in storage: "+ err);});
                        }, afterAdding.reject);
                } else {
                    afterAdding.reject("Could not fetch friend data from storage: "+ err);
                }
            });        
                
            return afterAdding.promise;
        };
        
        fuapi.removeFriend = function(friendToRemove) {
            var afterRemoving = when.defer();
            
            rem.fetchUserData(FRIENDS_KEY).then(function(value) {
                var updatedArray = _.reject(value, function(item){return item.username===friendToRemove.username;}) || [];
                if(value.length !== updatedArray.length) {
                    rem.putUserData(FRIENDS_KEY, updatedArray).then(function(keyValCat) {
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
        
        fuapi.fetchFriendsOfFriend = function(friend) {
            var def = when.defer();
            rem.getPublicData(friend, FRIENDS_KEY).then(
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
        
        var cleanFromSeenInThread = function(updates) {
            return _.reject(updates, function(item) {
                return item.seen;
            });
        };
        
        var verifyUpdatingEmptyStatus = function() {
            return dialog
                .confirm("You seem to have no data in your store. Press Cancel if you have made previous updates! " +
                "If this really is your first update, then all is fine and you may press the ok button.");
        };
        
        var addStatusOrReply = function(statusData) {
            var afterStatusUpdate = when.defer();
            rem.fetchUserData(STATUS_KEY_V3).then(function(statusUpdates) {
                var doUpdate = function() {
                    statusUpdates = statusUpdates || [];
                    statusUpdates = cleanFromSeenInThread(statusUpdates);
                    statusUpdates.push(statusData);
                    rem.putUserData(STATUS_KEY_V3, statusUpdates).then(function() {
                        afterStatusUpdate.resolve(statusUpdates);
                    }, function(err) { 
                        afterStatusUpdate.reject("Could set status data: " + err);
                    });
                };
                if(!statusUpdates) {
                    verifyUpdatingEmptyStatus()
                        .then(doUpdate, afterStatusUpdate.reject);
                } else {
                    doUpdate();
                }
            }, function(err) { 
                if(err == 404) {
                    verifyUpdatingEmptyStatus()
                    .then( function() {
                                rem.putUserData(STATUS_KEY_V3, [statusData]).then(function(data) {
                                    afterStatusUpdate.resolve([statusData]);
                                }, afterStatusUpdate.reject);
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
        
        /*
        fuapi.addThreadParticipant = function(username, thread, usernameSeen ) {
            return addStatusOrReply({
                'timestamp': fuapi.getTimestamp(),
                'thread': thread,
                'seen': usernameSeen,
              });
        };
        */
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
    };
});
        
