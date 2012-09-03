require(['jquery', 'ui', 'bootbox', 'underscore', 'ko', 'when', 'friendsUnhostedApi', 'moment'], function($, ui, bb, _, ko, when, fuapi, moment) {

    function presentTimestamp(timestamp) {
        return new Date(timestamp);
    }

    function getTimestamp(item) {
        return item.timestamp;
    };

    function getLatestTimestamp(rootItem) {
        if (rootItem.comments().length > 0) {
            var latestComment = _.max(rootItem.comments(), function(cs) {
                return cs.timestamp;
            });
            return latestComment.timestamp;
        } else {
            return rootItem.timestamp;
        };
    };

    var ENTER_KEY = 13;

    function isSubmit(keyEvent) {
        var keyCode = (keyEvent.which ? keyEvent.which : keyEvent.keyCode);
        return keyCode === ENTER_KEY && keyEvent.ctrlKey;
    };

    ko.bindingHandlers.executeOnEnter = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel) {
            var allBindings = allBindingsAccessor();
            $(element).keypress(function(event) {
                if (isSubmit(event)) {
                    allBindings.executeOnEnter.call(viewModel);
                    return false;
                }
                return true;
            });
        }
    };


    function FriendsViewModel() {
        var self = this;

        self.username = ko.observable("");
        self.loggedIn = ko.observable(false);

        self.loggedIn.subscribe(function(val) {
            $('.logged-in').addClass(val ? 'visible' : 'hidden').removeClass(val ? 'hidden' : 'visible');
            $('.not-logged-in').addClass(val ? 'hidden' : 'visible').removeClass(val ? 'visible' : 'hidden');
        });


        self.addFriendsUsername = ko.observable("");
        self.me = ko.observable({});

        var ONE_DAY_MS = 1000 * 60 * 60 * 24;
        var GET_MORE_INCREMENT = ONE_DAY_MS * 3;
        self.timeLimitForData = ko.observable(new Date().getTime() - GET_MORE_INCREMENT);

        self.getMoreUpdates = function() {
            self.timeLimitForData(self.timeLimitForData() - GET_MORE_INCREMENT);
        };

        function Friend(friendData) {
            var friend = friendData;

            friend.allFriends = ko.observableArray([]);
            friend.allRootStatuses = ko.observableArray([]);
            friend.allComments = ko.observableArray([]);
            friend.allSeenParticipants = ko.observableArray([]); // [{thread:'123:a@be.se', seen:['u@a.se',...]}, ...]
            friend.lastUpdated = ko.observable(0);

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
                    if (friend.allFriends().length == 0) {
                        friend.allFriends(_.map(newFriendsRaw, Friend));
                    } else {
                        friend.allFriends().push.apply(friend.allFriends(), _.map(newFriendsRaw, Friend));
                    }
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
                    var addThese = _.map(newRoots, self.StatusUpdate);
                    friend.allRootStatuses().push.apply(friend.allRootStatuses(), addThese);
                    self.allRootStatuses().push.apply(self.allRootStatuses(), addThese);
                    _.each(addThese, function(su) {
                        self.threadIdToRootStatus[su.id()] = su;
                    });
                    self.sortRootStatuses();
                }
                if (newComments.length > 0) {
                    _.each(newComments, function(r) {
                        var c = self.StatusUpdate(r);
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

        self.addFriend = function(username) {
            fuapi.addFriend(username).then(onFriendAdded, logWarning);
        };

        var onFriendAdded = function(friendData) {
                self.addFriendsUsername("");
                var newFriend = Friend(friendData);
                self.me().allFriends.push(newFriend);
                newFriend.updateFriends().then(newFriend.updateStatuses, logWarning).then(newFriend.setAutoUpdateFriends, logWarning).then(newFriend.setAutoUpdateStatuses, logWarning);
            };

        self.removeFriend = function(friendToRemove) {
            fuapi.removeFriend({
                username: friendToRemove.username,
                timestamp: friendToRemove.timestamp
            }).then(function() {
                onFriendRemoved(friendToRemove);
            }, showError);
        };

        var onFriendRemoved = function(friendData) {
                self.me().allFriends.remove(friendData); //don't use this instead of the function 
            };


        self.statusUpdate = ko.observable("");

        self.threadIdToRootStatus = {};
        self.allRootStatuses = ko.observableArray([]);
        self.sortRootStatuses = function() {
            self.allRootStatuses.sort(function(left, right) {
                return getLatestTimestamp(left) == getLatestTimestamp(right) ? 0 : (getLatestTimestamp(left) < getLatestTimestamp(right) ? -1 : 1);
            });
        };


        self.getPageFromLocation = function() {
            try {
                var page = window.location.href.substring(window.location.href.indexOf('#', 0) + 1);
                return page;
            } catch (e) {
                return "welcome";
            };
        };


        self.selectedTab = ko.observable('');

        self.selectedTab.subscribe(function(val) {
            $('.menu-selected').removeClass('menu-selected');
            $('#menu-' + val).addClass('menu-selected');
            $('.page').hide();
            $('#page-' + val).show();
            window.location.replace(location.protocol + '//' + location.host + location.pathname + '#' + val);
        });

        self.selectTab = function(tab) {
            self.selectedTab(tab);

            return true;
        };

        self.StatusUpdate = function(suData) {
            var VISIBLE_COMMENTS_IN_COLLAPSED_MODE = 2;
            var EMAIL_REGEX = /((([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,})))/gm;
            var URL_REGEX = /(\(?\b(http|https|ftp|ssh|sftp):\/\/[-A-Za-z0-9+&@#\/%?=~_()|!:,.;]*[-A-Za-z0-9+&@#\/%=~_()|])/gm;
            var NEWLINE_REGEX = /\n/gm;
            var GT_REGEX = />/gm;
            var LT_REGEX = /</gm;
            var su = {};

            function escapeAndFormatStatusText(text) {
                return text.replace(LT_REGEX, '&lt;').replace(GT_REGEX, '&gt;').replace(NEWLINE_REGEX, '<br/>').replace(EMAIL_REGEX, '<a href="mailto:$1" target="_blank">$1</a>').replace(URL_REGEX, '<a href="$1" target="_blank">$1</a>');
            }
            su.timestamp = suData.timestamp;
            su.username = suData.username;
            su.inReplyTo = suData.inReplyTo;

            su.status = escapeAndFormatStatusText(suData.status);

            su.participants = ko.observableArray([]);
            su.mySeenParticipants = ko.observableArray([]);
            //su.collapsed = ko.observable(false);
            su.collapsed = ko.observable(true);
            su.comments = ko.observableArray([]);
            su.comment = ko.observable("");

            su.id = ko.computed(function() {
                return su.timestamp + ":" + su.username;
            });

            su.relativeTimestamp = ko.observable("");

            var updateRelativeTimestamp = function() {
                    var time = new Date(su.timestamp);
                    su.relativeTimestamp(moment(time).fromNow());
                    setTimeout(updateRelativeTimestamp, Math.min((new Date().getTime() - su.timestamp) / 2, 1000 * 10 * (120 - Math.floor(Math.random() * 60))));
                };

            updateRelativeTimestamp();


            su.addParticipant = function(usernameToAdd) {
                //          if(su.mySeenParticipants.indexOf(usernameToAdd)<0 && usernameToAdd!=su.username) {
                //              fuapi.addThreadParticipant(self.username(), su.id(), usernameToAdd).then(
                //                  function() {su.mySeenParticipants.push(usernameToAdd);}
                //              );
                //          }
            };

            su.collapse = function() {
                su.collapsed(true);
            };

            su.expand = function() {
                su.collapsed(false);
            };



            var handleCollapse = function() {
                    if (su.collapsed()) {
                        _.each(
                        _.initial(su.comments(), VISIBLE_COMMENTS_IN_COLLAPSED_MODE), function(item) {
                            item.collapse();
                        });
                        _.each(
                        _.last(su.comments(), VISIBLE_COMMENTS_IN_COLLAPSED_MODE), function(item) {
                            item.expand();
                        });
                    } else {
                        _.each(su.comments(), function(item) {
                            item.expand();
                        });
                    };
                };

            var throttledSort = _.throttle(self.sortRootStatuses, 1000);

            su.comments.subscribe(function() {
                throttledSort();
                handleCollapse();
            });

            su.collapsed.subscribe(handleCollapse);

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
            return su;
        };

        function setPageFromUrl() {
            if (window.location.href.indexOf('#access_token') > 0) {
                window.location.replace(location.protocol + '//' + location.host + location.pathname + '#status');
                self.selectedTab("status");
            } else if (window.location.href.indexOf('#') > 0) {
                self.selectedTab(self.getPageFromLocation());
            } else {
                window.location.replace(location.protocol + '//' + location.host + location.pathname + '#welcome');
                self.selectedTab("welcome");
            }
        }

        function init() {
            return fuapi.init().then(function(localUsername) {
                self.username(localUsername);
                self.loggedIn(true);
                self.me(Friend({
                    username: localUsername
                }));
                self.me().updateFriends().then(self.me().updateStatuses, logWarning).then(self.me().setAutoUpdateFriends, logWarning).then(self.me().setAutoUpdateStatuses, logWarning).then(function() {
                    _.each(self.me().allFriends(), function(friend) {
                        friend.updateFriends().then(friend.updateStatuses, logWarning).then(friend.setAutoUpdateFriends, logWarning).then(friend.setAutoUpdateStatuses, logWarning);
                    });
                }, logWarning);



                setPageFromUrl();
            }, function(notLoggedInMsg) {
                console.log(notLoggedInMsg);
                self.selectedTab("welcome");
                self.loggedIn(false);
            }).then(function() {});

        };


        self.login = function() {
            fuapi.login(self.username()).then(function() {;
            }, showError);
        };

        self.logout = function() {
            fuapi.logout().then(function() {
                self.loggedIn(false);
                self.selectedTab("about");
            });
        };

        self.refresh = function() {
            if (self.loggedIn()) {
                _.each(self.me().allFriends(), function(friend) {
                    friend.updateStatuses();
                });
            }
        };

        var logWarning = function(message) {
                console.log(message);
            };

        var showError = function(message) {
                console.log(message);
                bootbox.alert(message);
            };

        self.updateStatus = function() {
            var update = self.statusUpdate();
            if (!update || update.trim().length == 0) {
                return; // short-circuit
            }

            self.statusUpdate('');

            fuapi.addStatus(update, self.username()).then(function(updates) {
                self.me().updateStatuses();
            }, function(err) {
                self.statusUpdate(update);
                logWarning(err);
            });
        };

        init();

    };

    $(function() {
        ko.applyBindings(new FriendsViewModel());
        $('#loading-screen').hide();
        $('#all').slideDown('fast');
    });

});