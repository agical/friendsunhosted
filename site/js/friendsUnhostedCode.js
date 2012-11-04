define([], function () {
    return function (_, when, rem, dialog) {

        var fuapi = {};
        var STATUS_KEY = 'friendsunhosted_status';
        var FRIENDS_KEY = 'friendsunhosted_friends';
        var PROFILE = 'friendsunhosted/profile';
        var currentUser = null;
        var listeners = {
            'error': [],
            'login': [],
            'logout': [],
            'status': [],
            'profile': [],
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

        var updateProfileListeners = function (username, profile) {
            _.each(listeners['profile'], function (listener) {
                listener(username, profile);
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

        var updateLoginListeners = function (username) {
            _.each(listeners['login'], function (listener) {
                listener(username);
            });
        };

        var updateLogoutListeners = function (username) {
            _.each(listeners['logout'], function (listener) {
                listener(username);
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
                    dialog.info(friendsUsername + " is already your friend!").then(function() {
                        updateErrorListeners(friendsUsername + " is already your friend!");
                        afterAdding.reject(friendsUsername + " is already your friend!");
                    }, afterAdding.reject);

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

        fuapi.fetchStatusForUser = function (username) {
            var afterUserStatus = when.defer();

            rem
                .getPublicData(username, STATUS_KEY)
                .then(function (statuses) {
                    updateStatusListeners(statuses);
                    afterUserStatus.resolve(statuses || []);
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
                rem.putUserData(PROFILE, profile).then(
                    function(profile) {
                        updateProfileListeners(rem.username(), profile);
                        afterSaveProfile.resolve(profile);
                    }, function(err) {
                        updateErrorListeners("Could not write profile.");
                        afterSaveProfile.reject("Could not write profile.");
                    });
            };
            when(rem.fetchUserData(PROFILE)).then(function (data) {
                writeProfile();
            }, function (err) {
                updateErrorListeners("Could not write profile.");
                afterStatusUpdate.reject("Could not write profile.");
            });
            return afterSaveProfile.promise;
        };

        fuapi.getProfile = function (username) {
            var afterGetProfile = when.defer();
            when(rem.getPublicData(username, PROFILE))
                .then(function(profile) {
                    updateProfileListeners(username, profile);
                    afterGetProfile.resolve(profile);
                }, afterGetProfile.reject
                );
            return afterGetProfile.promise;
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
            rem.fetchUserData(STATUS_KEY).then(function (statusUpdates) {
                statusUpdates = statusUpdates || [];
                statusUpdates = cleanFromSeenInThread(statusUpdates);
                statusUpdates.push(statusData);
                rem.putUserData(STATUS_KEY, statusUpdates).then(function () {
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
            var afterLogin = when.defer();
            rem.login(username)
                .then(function(retUsername) {
                    updateLoginListeners(retUsername);
                    afterLogin.resolve(retUsername);
                }, function(err) {
                    afterLogin.reject(err);
                }
            )
            return afterLogin.promise;
        };

        fuapi.logout = function () {
            var afterLogout = when.defer();

            var username = rem.username();

            rem.logout()
                .then(function() {
                    updateLogoutListeners(username);
                    afterLogout.resolve(username);
                }, function(err) {
                    afterLogout.reject(err);
                }
            )
            return afterLogout.promise;
        };

        return fuapi;
    };
});