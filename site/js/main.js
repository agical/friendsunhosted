require(['jquery', 'underscore', 'ui', 'ko', 'when', 'friendsUnhostedApi'], 
        function($, _, ui, ko, when, fuapi) {

    function presentTimestamp(timestamp) {
        return new Date(timestamp);
    }
    
  function FriendsViewModel() {
    var self = this;
    
    self.loggedIn = ko.observable(false);
    self.username = ko.observable("");
    
    self.statusUpdate = ko.observable("");    
    self.allStatuses = ko.observableArray([]);
    self.allRootStatuses = ko.computed(function() {
      return _.filter(self.allStatuses(), function(item) {return !item.inReplyTo;});
    });

    self.getPageFromLocation = function () {
        try {
            var page = window.location.href.substring(window.location.href.indexOf('#', 0)+1);
            return page;
        } catch(e) {
            return "welcome";
        };
    };
    
    self.addFriendsUsername = ko.observable("");
    self.allFriends = ko.observableArray([]);
    
    self.loggedIn.subscribe(function(val) {
        $('.logged-in')
            .addClass(val?'visible':'hidden')
            .removeClass(val?'hidden':'visible');
        $('.not-logged-in')
            .addClass(val?'hidden':'visible')
            .removeClass(val?'visible':'hidden');
    });

    var updateFriends = function(newFriendsList) {
        _.each(newFriendsList, function(friendData) {
            fuapi.fetchStatusForUser(friendData.username).then(function(parsedData) {
                addStatusUpdates(parsedData);
            }, logWarning);
        });
    };
      
    self.allFriends.subscribe(updateFriends);
      
    self.selectedTab = ko.observable('');

    self.selectedTab.subscribe(function(val) {
        $('.menu-bar-item').removeClass('menu-selected');
        $('#menu-'+val).addClass('menu-selected');
        $('.page').hide();
        $('#page-'+val).show();
        window.location.replace(location.protocol + '//' + location.host + "#" + val);
    });
    
    self.selectTab = function(tab) {
        self.selectedTab(tab);
        
        return true;
    };

    function StatusUpdate(suData) {
      var VISIBLE_COMMENTS_IN_COLLAPSED_MODE = 2;
      var EMAIL_REGEX =/((([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,})))/gm; 
      var URL_REGEX = /(\(?\b(http|https|ftp|ssh|sftp):\/\/[-A-Za-z0-9+&@#\/%?=~_()|!:,.;]*[-A-Za-z0-9+&@#\/%=~_()|])/gm;
      var NEWLINE_REGEX = /\n/gm;
      var GT_REGEX = />/gm;
      var LT_REGEX = /</gm;
      var su = this;
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
        var res = _.filter(self.allStatuses(), function(item) {
          return item.inReplyTo == su.id();
        });
        return res;
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
          }
      };
      
      su.comments.subscribe(handleCollapse);
      su.collapsed.subscribe(handleCollapse);
      
      su.doComment = function() {
          fuapi.addReply(su.comment(), su.id(), self.username()).
           then(function(updates) {
               addStatusUpdates(updates);
               su.comment('');
           }, showError);
      };
    }

    function setPageFromUrl() {
        if(window.location.href.indexOf('#access_token') > 0) {
            window.location.replace(location.protocol + '//' + location.host + "#status");
            self.selectedTab("status");
        } else if(window.location.href.indexOf('#') > 0) {
            self.selectedTab(self.getPageFromLocation());
        } else {
            window.location.replace(location.protocol + '//' + location.host + "#welcome");
            self.selectedTab("welcome");
        }
    }
    
    function init() {
        return fuapi.init()
            .then(function(localUsername) {
                    self.username(localUsername);
                    self.loggedIn(true);

                    setPageFromUrl();
                    self.refresh();
                }, function(notLoggedInMsg) {
                    console.log(notLoggedInMsg);
                    self.selectedTab("welcome");
                    self.loggedIn(false);
                }).then(function() {
                    setTimeout(function() {
                        _.each(self.allRootStatuses(), function(item) {
                            item.collapse();});
                    },1000);
                });
      
    };

    
    self.login = function() {
        fuapi.login(self.username())
            .then(function() {;}, showError);
    };

    self.logout = function() {
        fuapi.logout().then(function() {
            self.loggedIn(false);
            self.selectedTab("support");
        });
    };
  
    
    self.refresh = function() {
        if(self.loggedIn()) {
            fuapi.fetchFriends().then(function(value) {
                self.allFriends(_.map(value, function(friend){
                    var f = Friend(friend);
                    f.updateFriends();
                    return f;
                }));
            }, logWarning),
            
            fuapi.fetchStatus().then(function(value) {
                addStatusUpdates(value);
            }, logWarning);
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
        
    function Friend(friendData) {
        var friend = friendData;
        friend.allFriends = ko.observableArray([]);
        friend.updateFriends = function() {
            fuapi.fetchFriendsOfFriend(friendData.username).then(function(data){
                friend.allFriends(_.map(data,Friend));
            });
        }
        return friend;
    };
    
    self.addFriend = function() {
        fuapi.addFriend(self.addFriendsUsername()).then(onFriendAdded, showError);
    };

    var onFriendAdded = function(friendData) {
        var friend = Friend(friendData);
        friend.updateFriends();
        self.allFriends.push(friend);
        self.addFriendsUsername("");
    };

    self.removeFriend = function(friendToRemove) {
        fuapi.removeFriend(friendToRemove).then(onFriendRemoved, showError);
    };

    var onFriendRemoved = function(friendData) {
        self.allFriends.remove(friendData); //don't use this instead of the function 
    };
  
    function addStatusUpdates(statusUpdatesArray) {
      function statusEquals(s1, s2) {
          return s1.username == s2.username && 
                 s1.timestamp == s2.timestamp;
      }
      var existingStatuses = self.allStatuses();
      var newUpdates = _.filter(statusUpdatesArray, function(item) {
        return !existingStatuses || _.all(existingStatuses, function(existing) {
            return !statusEquals(existing, item);
          });
      });
      var newUpdatesAsObjects = _.map(newUpdates, function(item) {
        return new StatusUpdate(item);
      });
      var all = _.union(existingStatuses, newUpdatesAsObjects);
      var allSorted = _.sortBy(all, function(item) {
          if(item.comments().length>0) {
              var latestComment = _.max(item.comments(), function(cs) {return cs.timestamp;});
              return latestComment.timestamp;
          } else {
              return item.timestamp;
          };
      });
      self.allStatuses(allSorted);
    }


    
    self.updateStatus = function() {
        if(!self.statusUpdate() || self.statusUpdate().trim().length == 0) {
            return; // short-circuit
        }
      
        fuapi.addStatus(self.statusUpdate(), self.username()).then(function(updates) {
            addStatusUpdates(updates);
            self.statusUpdate('');
        }, showError);    
    };

    self.clearAll = function() {
        fuapi.removeAllFriends().then(function() {
            self.allFriends([]);
        }, showError);

        fuapi.removeAllStatuses().then(function() {
            self.allStatuses([]);
        }, showError);
    };
    

    setInterval( self.refresh, 15000);
      
    init();
    
  };
  
    $(function(){
        ko.applyBindings(new FriendsViewModel());
        $('#loading-screen').hide();
        $('#all').slideDown('fast');
    });
  
});

