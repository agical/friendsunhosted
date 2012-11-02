define([], function () {
    return function (_, when, rem, dialog) {

        var fuapi = {};
        var STATUS_KEY_V3 = 'friendsunhosted_status';
        var FRIENDS_KEY = 'friendsunhosted_friends';
        var PROFILE = 'friendsunhosted/profile';
        var currentUser = null;
        var listeners = {
            'status': [],
            'error': [],
            'friends-of-friend': [],
            'friend-added': [],
            'friends': []
        };

        var verifyUpdatingEmptyFriends = function () {
            return dialog.confirm("You seem to have no friends in your store. Press Cancel if you have added friends previously! " + "If this really is the first friend you add, then all is fine and you may press the ok button.");
        };

        fuapi.on = function (event, callback) {
            listeners[event].push(callback);
        };

        var updateStatusListeners = function (data, username) {
            _.each(listeners['status'], function (listener) {
                listener(data, username);
            });
        };

        var updateErrorListeners = function (error) {
            _.each(listeners['error'], function (listener) {
                listener(error);
            });
        };

        var updateFriendsOfFriendListeners = function (friend, friends) {
            _.each(listeners['friends-of-friend'], function (listener) {
                listener(friend, friends);
            });
        };

        var updateFriendsListeners = function (friends) {
            _.each(listeners['friends'], function (listener) {
                listener(friends);
            });
        };

        var updateFriendAddedListeners = function (friend, allFriends) {
            _.each(listeners['friend-added'], function (listener) {
                listener(friend, allFriends);
            });
        };

        fuapi.addFriend = function (friendsUsername) {
            var afterAdding = when.defer();

            var emailRegex = /^([a-zA-Z0-9_\.\-])+\@([a-zA-Z0-9\-\.])+$/;

            if (!friendsUsername || !emailRegex.test(friendsUsername)) {
                afterAdding.reject("Invalid username: " + friendsUsername);
                return afterAdding.promise;
            }

            var friendData = {
                "username": friendsUsername,
                "timestamp": fuapi.getTimestamp()
            };

            rem.fetchUserData(FRIENDS_KEY).then(function (existingFriends) {
                if (existingFriends && _.any(existingFriends, function (f) {
                    return f.username == friendsUsername;
                })) {
                    updateErrorListeners(friendsUsername + " is already your friend!");
                    afterAdding.reject(friendsUsername + " is already your friend!");
                    return afterAdding.promise;
                }

                existingFriends = existingFriends || [];
                existingFriends.push(friendData);
                rem.putUserData(FRIENDS_KEY, existingFriends).then(function (keyValCat) {
                    updateFriendAddedListeners(friendData, existingFriends);
                    afterAdding.resolve(friendData);
                }, function (err) {
                    updateErrorListeners("Could not put friend in storage: " + err);
                    afterAdding.reject("Could not put friend in storage: " + err);
                });

            }, function (err) {
                updateErrorListeners("Could not fetch friend data from storage: " + err);
                afterAdding.reject("Could not fetch friend data from storage: " + err);
            });

            return afterAdding.promise;
        };

        fuapi.removeFriend = function (friendToRemove) {
            var afterRemoving = when.defer();

            rem.fetchUserData(FRIENDS_KEY).then(function (value) {
                var updatedArray = _.reject(value, function (item) {
                    return item.username === friendToRemove.username;
                }) || [];
                if (value.length !== updatedArray.length) {
                    rem.putUserData(FRIENDS_KEY, updatedArray).then(function (keyValCat) {
                        afterRemoving.resolve(friendToRemove);
                    }, function (err) {
                        afterRemoving.reject("Could not remove friend: " + err);
                    });
                } else {
                    afterRemoving.reject("No such friend");
                }
            }, function (err) {
                afterRemoving.reject("Could not fetch friend data from storage: " + err);
            });

            return afterRemoving.promise;
        };

        fuapi.fetchFriends = function () {
            var def = when.defer();
            rem.fetchUserData(FRIENDS_KEY).then(

                function (friendsArray) {
                    updateFriendsListeners(friendsArray);
                    def.resolve(friendsArray || []);
                }, def.reject);
            return def.promise;
        };

        fuapi.fetchFriendsOfFriend = function (friend) {
            var def = when.defer();
            rem
                .getPublicData(friend, FRIENDS_KEY)
                .then(function (data) {

                    updateFriendsOfFriendListeners(friend, data);
                    def.resolve(data || []);
                }, def.reject);
            return def.promise;
        };

        fuapi.fetchStatus = function () {
            var def = when.defer();
            rem.fetchUserData(STATUS_KEY_V3).then(

                function (data) {
                    def.resolve(data || []);
                }, def.reject);
            return def.promise;
        };

        fuapi.fetchStatusForUser = function (username) {
            var afterUserStatus = when.defer();

            rem
                .getPublicData(username, STATUS_KEY_V3)
                .then(function (data) {
                    updateStatusListeners(data);
                    afterUserStatus.resolve(data || []);
                },
                function (error) {
                    updateErrorListeners(error);
                    afterUserStatus.reject(error);
                });

            return afterUserStatus.promise;
        };

        fuapi.saveProfile = function (profile) {
            var afterSaveProfile = when.defer();
            var writeProfile = function () {
                rem.putUserData(PROFILE, profile).then(afterSaveProfile.resolve, afterSaveProfile.reject);
            };
            when(rem.fetchUserData(PROFILE)).then(function (data) {
                if (!data) {
                    verifyUpdatingEmptyStatus().then(writeProfile, afterSaveProfile.reject);
                } else {
                    writeProfile();
                }
            }, function (err) {
                if (err == 404 || err == 204) {
                    if (verifyUpdatingEmptyStatus()) {
                        writeProfile();
                    } else {
                        afterStatusUpdate.reject();
                    }
                } else {
                    afterStatusUpdate.reject("Could not access status data: " + err);
                }
            });
            return afterSaveProfile.promise;
        };

        fuapi.getProfile = function (username) {
            return rem.getPublicData(username, PROFILE);
        };

        var cleanFromSeenInThread = function (updates) {
            return _.reject(updates, function (item) {
                return item.seen;
            });
        };

        var verifyUpdatingEmptyStatus = function () {
            return dialog.confirm("You seem to have no data in your store. Press Cancel if you have made previous updates! " + "If this really is your first update, then all is fine and you may press the ok button.");
        };


        var addStatusOrReply = function (statusData) {
            var afterStatusUpdate = when.defer();
            rem.fetchUserData(STATUS_KEY_V3).then(function (statusUpdates) {
                statusUpdates = statusUpdates || [];
                statusUpdates = cleanFromSeenInThread(statusUpdates);
                statusUpdates.push(statusData);
                rem.putUserData(STATUS_KEY_V3, statusUpdates).then(function () {
                    updateStatusListeners(statusUpdates, null);
                    afterStatusUpdate.resolve(statusUpdates);
                }, function (err) {
                    updateErrorListeners("Could set status data: " + err);
                    afterStatusUpdate.reject("Could set status data: " + err);
                });
            }, function (err) {
                updateErrorListeners("Could not access status data: " + err);
                afterStatusUpdate.reject("Could not access status data: " + err);
            });

            return afterStatusUpdate.promise;
        };

        fuapi.getTimestamp = function () {
            return new Date().getTime();
        };

        fuapi.addStatus = function (status, username) {
            return addStatusOrReply({
                "status": status,
                "timestamp": fuapi.getTimestamp(),
                "username": username
            });
        };

        fuapi.addReply = function (reply, inReplyTo, username) {
            return addStatusOrReply({
                'username': username,
                'timestamp': fuapi.getTimestamp(),
                'status': reply,
                'inReplyTo': inReplyTo
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

        fuapi.init = function () {
            return rem.restoreLogin();
        };

        fuapi.login = function (username) {
            return rem.login(username);
        };

        fuapi.logout = function () {
            return rem.logout();
        };

        fuapi.removeAllStatuses = function () {
            return rem.deleteUserData(STATUS_KEY_V3);
        };

        fuapi.removeAllFriends = function () {
            return rem.deleteUserData(FRIENDS_KEY);
        };

        return fuapi;
    };
});