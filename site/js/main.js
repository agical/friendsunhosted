require(['jquery', 'underscore', 'ui', 'ko', 'when', 'friendsUnhostedApi'], 
        function($, _, ui, ko, when, fuapi) {

    function presentTimestamp(timestamp) {
        return new Date(timestamp);
    }
    
    function getTimestamp(item) {
        return item.timestamp;
    };
    
    function getLatestTimestamp(rootItem) {
        if(rootItem.comments().length>0) {
            var latestComment = _.max(rootItem.comments(), function(cs) {return cs.timestamp;});
            return latestComment.timestamp;
        } else {
            return rootItem.timestamp;
        };
    };

    
  function FriendsViewModel() {
    var self = this;
    
    self.username = ko.observable("");
    self.loggedIn = ko.observable(false);

    self.loggedIn.subscribe(function(val) {
        $('.logged-in')
            .addClass(val?'visible':'hidden')
            .removeClass(val?'hidden':'visible');
        $('.not-logged-in')
            .addClass(val?'hidden':'visible')
            .removeClass(val?'visible':'hidden');
    });


    self.addFriendsUsername = ko.observable("");
    self.me = ko.observable({});

    
    function Friend(friendData) {
        var friend = friendData;
        
        friend.allFriends = ko.observableArray([]);
        friend.allRootStatuses = ko.observableArray([]);
        friend.allComments = ko.observableArray([]);
        friend.allSeenParticipants = ko.observableArray([]);// [{thread:'123:a@be.se', seen:['u@a.se',...]}, ...]
        friend.lastUpdated = ko.observable(0);
        
        friend.updateFriends = function() {
            var updateFriendsDone = when.defer();
            fuapi.fetchFriendsOfFriend(friendData.username).then(function(data){
                friend.allFriends(_.map(data,Friend));
                updateFriendsDone.resolve(friend);
            }, updateFriendsDone.reject);
            return updateFriendsDone.promise;
        };
        
        friend.updateStatuses = function() {
            var updateDone = when.defer();
            fuapi.fetchStatusForUser(friend.username).then(function(updates) {
                var newRoots = [];
                var newComments = [];
                var newSeen = [];
                var newLastUpdate = 0;
                _.each(updates, function(update) {
                   update.username = friend.username;
                   newLastUpdate = Math.max(newLastUpdate, update.timestamp);
                   
                   if(update.inReplyTo && 
                      !_.any(friend.allComments(), function(oldComment) {
                                                      return update.timestamp==oldComment.timestamp;
                                                  })) {
                       newComments.push(update);
                   } else if(update.seen && 
                              !_.any(friend.allSeenParticipants(), function(oldSeen) {
                                                                      return update.timestamp==oldSeen.timestamp;
                                                                  })) {
                       newSeen.push(update);
                   } else if(!update.inReplyTo && !_.any(friend.allRootStatuses(), function(oldRoot) {
                                                                   return update.timestamp==oldRoot.timestamp;
                                                               })) {
                       newRoots.push(update);
                   }
                });

                if(newRoots.length>0) {
                    _.each(newRoots, function(r) {
                        var su = self.StatusUpdate(r);
                        friend.allRootStatuses.push(su);
                        self.allRootStatuses.push(su);
                    });
                }
                if(newComments.length>0) {
                    _.each(newComments, function(r) {
                        friend.allComments.push(self.StatusUpdate(r));
                    });
                }
                if(newRoots.length>0 || newComments.length>0) {
                    self.sortRootStatuses();
                }
                if(newSeen.length>0) {
                    _.each(newSeen_.sortBy(newSeen, getTimestamp), function(r) {
                        friend.allSeenParticipants.unshift(self.StatusUpdate(r));
                    });
                }
                if(newLastUpdate) {
                    friend.lastUpdated(newLastUpdate);
                }
                updateDone.resolve(friend);
            }, updateDone.reject);
            return updateDone.promise;
        };
        var max_time_between_updates = 15*60*1000;
        var min_time_between_updates = 5*1000;
        
        friend.setAutoUpdateStatuses = function() {
            var updateInterval = min_time_between_updates 
            + (max_time_between_updates - max_time_between_updates/((new Date().getTime()) - friend.lastUpdated()));
            updateInterval = 1000*15;
            setTimeout(function() {
                friend.updateStatuses().always(friend.setAutoUpdateStatuses);
            }, updateInterval);
        };

        friend.setAutoUpdateFriends = function() {
            var updateInterval = 5*60*1000;
            updateInterval = 1000*15;
            setTimeout(function() {
                friend.updateFriends().always(friend.setAutoUpdateFriends);
            }, 5*60*1000);
        };

        return friend;
    };
    
    self.addFriend = function(username) {
        fuapi.addFriend(username).then(onFriendAdded, showError);
    };

    var onFriendAdded = function(friendData) {
        self.addFriendsUsername("");
        var newFriend = Friend(friendData);
        self.me().allFriends.push(newFriend);
        newFriend
            .updateFriends()
            .then(newFriend.updateStatuses, logWarning)
            .then(newFriend.setAutoUpdateFriends, logWarning)
            .then(newFriend.setAutoUpdateStatuses, logWarning);
    };

    self.removeFriend = function(friendToRemove) {
        fuapi
            .removeFriend({username:friendToRemove.username, timestamp:friendToRemove.timestamp})
            .then(function(){onFriendRemoved(friendToRemove);}, showError);
    };

    var onFriendRemoved = function(friendData) {
        self.me().allFriends.remove(friendData); //don't use this instead of the function 
    };

    
    self.statusUpdate = ko.observable("");    
    
    self.allRootStatuses = ko.observableArray([]);
    self.sortRootStatuses = function() {
        self.allRootStatuses.sort(function(left, right) { 
            return getLatestTimestamp(left) == getLatestTimestamp(right) ? 
                    0 
                    : (getLatestTimestamp(left) < getLatestTimestamp(right) ? -1 : 1); });
    };


    self.getPageFromLocation = function () {
        try {
            var page = window.location.href.substring(window.location.href.indexOf('#', 0)+1);
            return page;
        } catch(e) {
            return "welcome";
        };
    };
    
      
    self.selectedTab = ko.observable('');

    self.selectedTab.subscribe(function(val) {
        $('.menu-selected').removeClass('menu-selected');
        $('#menu-'+val).addClass('menu-selected');
        $('.page').hide();
        $('#page-'+val).show();
        window.location.replace(location.protocol + '//' + location.host + location.pathname + '#' + val);
    });
    
    self.selectTab = function(tab) {
        self.selectedTab(tab);
        
        return true;
    };

    self.StatusUpdate = function(suData) {
      var VISIBLE_COMMENTS_IN_COLLAPSED_MODE = 2;
      var EMAIL_REGEX =/((([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,})))/gm; 
      var URL_REGEX = /(\(?\b(http|https|ftp|ssh|sftp):\/\/[-A-Za-z0-9+&@#\/%?=~_()|!:,.;]*[-A-Za-z0-9+&@#\/%=~_()|])/gm;
      var NEWLINE_REGEX = /\n/gm;
      var GT_REGEX = />/gm;
      var LT_REGEX = /</gm;
      var su = {};
      function escapeAndFormatStatusText(text) {
          return text
                  .replace(LT_REGEX, '&lt;')
                  .replace(GT_REGEX, '&gt;')
                  .replace(NEWLINE_REGEX, '<br/>')
                  .replace(EMAIL_REGEX, '<a href="mailto:$1" target="_blank">$1</a>')
                  .replace(URL_REGEX,'<a href="$1" target="_blank">$1</a>');
      }
      su.status = escapeAndFormatStatusText(suData.status);
      
      su.timestamp = suData.timestamp;
      su.username = suData.username;
      su.inReplyTo = suData.inReplyTo;

      su.collapsed = ko.observable(false);
      su.comment = ko.observable("");

      su.id = ko.computed(function() {
          return su.timestamp + ":" + su.username;
      });
        
      su.collapse = function() {
          su.collapsed(true);
      };

      su.expand = function() {
          su.collapsed(false);
      };
      
      su.relativeTimestamp = ko.computed(function() {
        var time = new Date(su.timestamp);
        return time.toLocaleDateString() == new Date().toLocaleDateString() ?
                time.toLocaleTimeString() 
                :
                time.toLocaleDateString() + ' ' + time.toLocaleTimeString();
      });
      
      su.comments = ko.computed(function() {
          var allCommentArrays = _.map(self.me().allFriends(), function(friend) {
              return friend.allComments();
          });
          allCommentArrays.push(self.me().allComments());
          var allCommentsFlat = _.flatten(allCommentArrays);
          var threadComments = _.filter(allCommentsFlat, function(item){
              return item.inReplyTo==su.id();
          });    
          var threadCommentsSorted = _.sortBy(threadComments, function(item) {return item.timestamp;});
          return threadCommentsSorted;
      });
      
      var handleCollapse = function() {
          if(su.collapsed()) {
              _.each(
                      _.initial(su.comments(), VISIBLE_COMMENTS_IN_COLLAPSED_MODE), 
                      function(item) {item.collapse();});
              _.each(
                      _.last(su.comments(), VISIBLE_COMMENTS_IN_COLLAPSED_MODE), 
                      function(item) {item.expand();});
          } else {
              _.each(su.comments(), 
                      function(item) {item.expand();});
          };
      };
      
      su.comments.subscribe(handleCollapse);
      su.collapsed.subscribe(handleCollapse);
      
      su.doComment = function() {
          var update = su.comment();
          if(!update || update.trim().length == 0) {
              return; // short-circuit
          }
          
          su.comment('');

          fuapi
              .addReply(update, su.id(), self.username())
              .then(function(updates) {
                  self.me().updateStatuses();
              }, function(err) {
                  su.comment(update);
                  showError(err);
              });    
      };
      return su;
    };

    function setPageFromUrl() {
        if(window.location.href.indexOf('#access_token') > 0) {
            window.location.replace(location.protocol + '//' + location.host + location.pathname + '#status');
            self.selectedTab("status");
        } else if(window.location.href.indexOf('#') > 0) {
            self.selectedTab(self.getPageFromLocation());
        } else {
            window.location.replace(location.protocol + '//' + location.host + location.pathname + '#welcome');
            self.selectedTab("welcome");
        }
    }
    
    function init() {
        return fuapi.init()
            .then(function(localUsername) {
                    self.username(localUsername);
                    self.loggedIn(true);
                    self.me(Friend({username:localUsername}));
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
                        }, logWarning);
                        
                    

                    setPageFromUrl();
                }, function(notLoggedInMsg) {
                    console.log(notLoggedInMsg);
                    self.selectedTab("welcome");
                    self.loggedIn(false);
                }).then(function() {
                });
      
    };

    
    self.login = function() {
        fuapi.login(self.username())
            .then(function() {;}, showError);
    };

    self.logout = function() {
        fuapi.logout().then(function() {
            self.loggedIn(false);
            self.selectedTab("about");
        });
    };
  
    self.refresh = function() {
        if(self.loggedIn()) {
            _.each(self.me().allFriends(), function(friend) {friend.updateStatuses();});
        }
    };
    
    var logWarning = function(message) {
        console.log(message);
    };

    var showError = function(message) {
        console.log(message);
        $('#error-message').text(message);
        $('#error-panel').slideDown();
        setTimeout(function() {
            $("#error-panel").slideUp();
        }, 4000);
    };
 
    self.updateStatus = function() {
        var update = self.statusUpdate();
        if(!update || update.trim().length == 0) {
            return; // short-circuit
        }
        
        self.statusUpdate('');

        fuapi.addStatus(update, self.username()).then(function(updates) {
            self.me().updateStatuses();
        }, function(err) {
            self.statusUpdate(update);
            showError(err);
        });    
    };
          
    init();
    
  };
  
    $(function(){
        ko.applyBindings(new FriendsViewModel());
        $('#loading-screen').hide();
        $('#all').slideDown('fast');
    });
  
});

