define(['ko', 'underscore', 'when', 'friendsUnhostedApi', 'moment', 'statusUpdate'],
        function(ko, _, when, fuapi, moment, StatusUpdate) {
    
    function Friend(friendData) {
        var friend = friendData;

        friend.allFriends = ko.observableArray([]);
        friend.allRootStatuses = ko.observableArray([]);
        friend.allComments = ko.observableArray([]);
        friend.allSeenParticipants = ko.observableArray([]); // [{thread:'123:a@be.se', seen:['u@a.se',...]}, ...]
        friend.lastUpdated = ko.observable(0);
        friend.profilePicture = ko.observable("img/nopicture.png");
        friend.friendsByUsername = {};
        
        friend.addFriend = function(friendObject) {
            friend.allFriends.push(friendObject);
            friend.friendsByUsername[friendObject.username] = friendObject;
            friendObject.updateProfilePicture();
        };
        
        friend.friendByUsername = function(username) {
            if(username === friend.username) return friend;
            return friend.friendsByUsername[username];
        };

        var checkUrl = function(url) { 
            var regex = /^https?:\/\/[\w\.\-\/:\_]+$/;
            var result = regex.test(url);
            return result;
        };
        friend.updateProfilePicture = function() {
            var afterProfileUpdate = when.defer();
            fuapi.getProfile(friend.username).then(function(profileData) {
                if(profileData 
                        && profileData.profilePicture 
                        && checkUrl(profileData.profilePicture)) {
                    friend.profilePicture(profileData.profilePicture);
                    afterProfileUpdate.resolve(profileData.profilePicture);
                } else {
                    afterProfileUpdate.reject();
                }
            }, afterProfileUpdate.reject);
            return afterProfileUpdate.promise;
        };
        
        var rawUpdates = [];

        self.timeLimitForData.subscribe(function() {
            setTimeout(friend.showMoreStatuses, 0);
        });

        var addCommentToRootLater = function(comment, rootId) {
                setTimeout(function() {
                    var r = self.threadIdToRootStatus[rootId];

                    if (r) {
                        r.addParticipant(comment.username);
                    }

                    if (r && !_.any(r.comments(), function(c) {
                        return c.timestamp == comment.timestamp;
                    })) {
                        var index = _.sortedIndex(r.comments(), comment, getTimestamp);
                        r.comments.splice(index, 0, comment);
                    } else {
                        comment.tries = comment.tries + 1;
                        addCommentToRootLater(comment, rootId);
                    }
                }, (comment.tries - 1) ^ 2 * 100);
            };

        var addParticipantsToRootLater = function(seen, rootId) {
                setTimeout(function() {
                    var r = self.threadIdToRootStatus[rootId];
                    if (r && !_.any(r.participants(), function(c) {
                        return c == seen.seen;
                    })) {
                        r.participants.push(seen.seen);
                    } else {
                        seen.tries = seen.tries + 1;
                        addParticipantsToRootLater(seen, rootId);
                    }
                }, (seen.tries - 1) ^ 2 * (100 + Math.floor(Math.random() * 51)));
            };

        friend.updateFriends = function() {
            var updateFriendsDone = when.defer();
            fuapi.fetchFriendsOfFriend(friendData.username).then(function(fetchedFriends) {
                var newFriendsRaw = _.reject(fetchedFriends, function(newFriend) {
                    return _.any(friend.allFriends(), function(oldFriend) {
                        return oldFriend.username == newFriend.username;
                    });
                });
                _.map(_.map(newFriendsRaw, Friend), friend.addFriend);
                updateFriendsDone.resolve(friend);
            }, updateFriendsDone.reject);
            return updateFriendsDone.promise;
        };

        friend.showMoreStatuses = function() {
            var updateDone = when.defer();

            var updates = rawUpdates;

            var newRoots = [];
            var newComments = [];
            var newSeen = [];
            var newLastUpdate = 0;
            var onlyRecentUpdates = _.reject(updates, function(u) {
                return u.timestamp < self.timeLimitForData(); //|| u.timestamp<friend.lastUpdated(); 
            });

            _.each(onlyRecentUpdates, function(update) {
                update.username = friend.username;
                newLastUpdate = Math.max(newLastUpdate, update.timestamp);

                if (update.inReplyTo && !_.any(friend.allComments(), function(oldComment) {
                    return update.timestamp == oldComment.timestamp;
                })) {
                    newComments.push(update);
                } else if (update.seen) {
                    newSeen.push(update);
                } else if (!update.inReplyTo && !self.threadIdToRootStatus[update.timestamp + update.username] && !_.any(friend.allRootStatuses(), function(oldRoot) {
                    return update.timestamp == oldRoot.timestamp;
                })) {
                    newRoots.push(update);
                }
            });

            if (newRoots.length > 0) {
                var addThese = _.map(newRoots, StatusUpdate);
                friend.allRootStatuses().push.apply(friend.allRootStatuses(), addThese);
                self.allRootStatuses().push.apply(self.allRootStatuses(), addThese);
                _.each(addThese, function(su) {
                    var throttledSort = _.throttle(self.sortRootStatuses, 1000);
                    su.comments.subscribe(function() {
                        throttledSort();
                        su.handleCollapse();
                    });

                    su.doComment = function() {
                        var update = su.comment();
                        if (!update || update.trim().length == 0) {
                            return; // short-circuit
                        }

                        su.comment('');

                        fuapi.addReply(update, su.id(), self.username()).then(function(updates) {
                            self.me().updateStatuses();
                        }, function(err) {
                            su.comment(update);
                            logWarning(err);
                        });
                    };                        
                    self.threadIdToRootStatus[su.id()] = su;
                });
                self.sortRootStatuses();
            }
            if (newComments.length > 0) {
                _.each(newComments, function(r) {
                    var c = StatusUpdate(r);
                    c.tries = 0;
                    addCommentToRootLater(c, r.inReplyTo);
                });
            }
            if (newSeen.length > 0) {
                _.each(newSeen, function(r) {
                    r.tries = 0;
                    addParticipantsToRootLater(r, r.thread);
                });
            }
            if (newLastUpdate) {
                friend.lastUpdated(newLastUpdate);
            }
            updateDone.resolve(friend);

            return updateDone.promise;
        };

        friend.updateStatuses = function() {
            var updateDone = when.defer();

            fuapi.fetchStatusForUser(friend.username).then(function(updates) {
                rawUpdates = updates;

                friend.showMoreStatuses().then(updateDone.resolve, updateDone.reject);
            }, updateDone.reject);
            return updateDone.promise;
        };

        var max_time_between_updates = 15 * 60 * 1000;
        var min_time_between_updates = 5 * 1000;

        friend.setAutoUpdateStatuses = function() {
            var updateInterval = min_time_between_updates + (max_time_between_updates - max_time_between_updates / ((new Date().getTime()) - friend.lastUpdated()));
            setTimeout(function() {
                friend.updateStatuses().always(friend.setAutoUpdateStatuses);
            }, updateInterval);
        };

        friend.setAutoUpdateFriends = function() {
            var updateInterval = 5 * 60 * 1000;
            setTimeout(function() {
                friend.updateFriends().always(friend.setAutoUpdateFriends);
            }, updateInterval);
        };

        
        
        return friend;
    };
    
    return Friend;
});
