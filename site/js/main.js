require(['jquery', 'ui', 'ko', 'bootbox', 'underscore', 'when', 'friendsUnhostedApi', 'moment', 'statusUpdate', 'friend', 'dialog'],
        function($, ui, ko, bb, _, when, fuapi, moment, StatusUpdate, Friend, dialog) {

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

    var logWarning = function(message) {
        console.log(message);
    };

    var showError = function(message) {
        console.log(message);
        dialog.showError(message);
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
        self.inviteFriendEmail = ko.observable("");
        
        self.me = ko.observable({allFriends:function(){return [];}});

        self.profilePicture = ko.observable("");
        
        self.saveProfile = function() {
            fuapi
                .saveProfile({profilePicture:self.profilePicture()})
                .then(function(){
                        self.me().profilePicture(self.profilePicture());
                    }, logWarning);
        };
        
        var ONE_DAY_MS = 1000 * 60 * 60 * 24;
        var GET_MORE_INCREMENT = ONE_DAY_MS * 3;
        self.timeLimitForData = ko.observable(new Date().getTime() - GET_MORE_INCREMENT);

        self.getMoreUpdates = function() {
            self.timeLimitForData(self.timeLimitForData() - GET_MORE_INCREMENT);
        };
        
        self.timeLimitForData.subscribe(function() {
            setTimeout(function() {_.invoke(self.me().allFriends(), 'showMoreStatuses');}, 0);
        });

        

        self.addFriend = function(username) {
            return fuapi.addFriend(username).then(onFriendAdded, logWarning);
        };
        
        String.prototype.format = function() {
            var args = arguments;
            return this.replace(/{(\d+)}/g, function(match, number) { 
              return typeof args[number] != 'undefined'
                ? args[number]
                : match
              ;
            });
          };
        
        self.inviteFriendByEmail = function(email) {
            $.get('email-invitation.txt', function(data) {
                var bodyEscaped = encodeURIComponent(data.format(self.username()));
                var subjectEscaped = "Join me at Friends#Unhosted!";
                window.open("mailto:{0}?subject={1}&body={2}".format(email, subjectEscaped, bodyEscaped), '_blank');
                self.inviteFriendEmail("");
            });
        };

        var onFriendAdded = function(friendData) {
                self.addFriendsUsername("");
                var newFriend = Friend(friendData, self);
                self.me().addFriend(newFriend);
                newFriend
                    .updateFriends()
                    .then(newFriend.updateStatuses, logWarning)
                    .then(newFriend.setAutoUpdateFriends, logWarning)
                    .then(newFriend.setAutoUpdateStatuses, logWarning);
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


        var PENDING_USERS = "pending-users-to-add-1";

        function setPageFromUrl() {
            var href = window.location.href;
            function getReferringUser(url) {
                return url.substring(url.indexOf('?referredby=')+12);
            }
            if(self.loggedIn()===false) {
                
                if (href.indexOf('?referredby=') > 0) {
                    var pendingUsers = JSON.parse(localStorage.getItem(PENDING_USERS)||"[]");
                    var referrer = getReferringUser(href);
                    pendingUsers.push(referrer);
                    localStorage.removeItem(PENDING_USERS);
                    localStorage.setItem(PENDING_USERS, JSON.stringify(pendingUsers));
                    
                    dialog.showMessage('#referred-message', '<a class="close" data-dismiss="alert">×</a>' +
                        'You have been invited by <b>' + referrer + '</b> to join Friends#Unhosted.<br/><br/>' +
                        'To connect with your friends on Friends#Unhosted you need a remoteStorage account (read more below). ' +
                        'If you don\'t have a remoteStorage account yet, you can follow one of the links below to register for one<br/><br/>' +
                        'If you have a remoteStorage account already, just log in.<br/><br/>' +
                        'After you have logged in (in this browser), ' + referrer + ' will be automagically added to your friends.');
                    self.selectedTab("welcome");
                } else {
                    self.selectedTab("welcome");
                }
            } else {
                if (href.indexOf('#access_token') > 0) {
                    window.location.replace(location.protocol + '//' + location.host + location.pathname + '#status');
                    self.selectedTab("status");                
                } else if (href.indexOf('?referredby=') > 0) {
                    when(self.addFriend(getReferringUser(href)))
                        .always(function() {
                            self.selectedTab("myfriends");
                        });
                } else if (href.indexOf('#') > 0) {
                    self.selectedTab(self.getPageFromLocation());
                } else {
                    window.location.replace(location.protocol + '//' + location.host + location.pathname + '#welcome');
                    self.selectedTab("welcome");
                }
                var pendingUsers = JSON.parse(localStorage.getItem(PENDING_USERS)||"[]");
                function addNext(arr) {
                    if(arr.length>0) {
                        when(self.addFriend(arr.pop())).then(function(){addNext(arr);});
                    } else {
                        localStorage.removeItem(PENDING_USERS);
                    }
                } 
                addNext(pendingUsers);
            }

        }
                
        self.init = function() {
            return fuapi.init().then(function(localUsername) {
                self.username(localUsername);
                self.loggedIn(true);
                self.me(Friend({
                    username: localUsername
                }, self));
                self.me().updateProfilePicture().then(function(picture) {
                    if(picture) {self.profilePicture(picture);}
                }, logWarning);
                self.me()
                    .updateFriends()
                    .then(self.me().updateStatuses, logWarning)
                    .then(self.me().setAutoUpdateFriends, logWarning)
                    .then(self.me().setAutoUpdateStatuses, logWarning)
                    .then(function() {
                    _.each(self.me().allFriends(), function(friend) {
                        friend
                            .updateFriends()
                            .then(friend.updateStatuses, logWarning)
                            .then(friend.setAutoUpdateFriends, logWarning)
                            .then(friend.setAutoUpdateStatuses, logWarning);
                        });
                    }, logWarning)
                    .then(function() {
                    });

            }, function(notLoggedInMsg) {
                self.loggedIn(false);
            }).always(function() {
                setPageFromUrl();
            });

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
                self.me().updateStatuses();
                _.each(self.me().allFriends(), function(friend) {
                    friend.updateStatuses();
                });
            }
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

    };

    function initBindingHandlers() {
        var CR = 13;
        var LF = 10;

        function isSubmit(keyEvent) {
            var keyCode = (keyEvent.which ? keyEvent.which : keyEvent.keyCode);
            return (keyCode === CR || keyCode === LF)  && keyEvent.ctrlKey;
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
        
    }
    
    $(function() {
        setTimeout(function() {
            var viewModel = new FriendsViewModel();
            initBindingHandlers();
            ko.applyBindings(viewModel);
            fuapi.on('error', showError);
            viewModel.init();
        }, 10);
        setTimeout(function() { 
            $('#loading-screen').hide();
            $('#all').slideDown('fast');
        }, 100);
    });

});