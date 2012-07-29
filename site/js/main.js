require(['jquery', 'underscore', 'ui', 'ko', 'when', 'friendsUnhostedApi'], 
        function($, _, ui, ko, when, fuapi) {

    function onError(err) { 
        console.log(err); 
    };
    
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
          }, showError);
        });
    };
      
    self.allFriends.subscribe(updateFriends);
      
    self.selectedTab = ko.observable('');

    self.selectedTab.subscribe(function(val) {
        $('.menu-bar-item').removeClass('menu-selected');
        $('#menu-'+val).addClass('menu-selected');
        $('.page').hide();
        $('#page-'+val).show();
    });
    
    self.selectTab = function(data, event) {
        var tab = event.srcElement.href.split("#")[1];
        self.selectedTab(tab);
        
        return true;
    };

    function StatusUpdate(suData) {
      var su = this;
      su.status = suData.status;
      su.timestamp = suData.timestamp;
      su.relativeTimestamp = ko.computed(function() {
        var time = new Date(su.timestamp);
        return time.getFullYear()+'-'+time.getMonth()+'-'+time.getDate()+' '+time.getHours()+':'+time.getMinutes();
      });
      su.username = suData.username;
      su.inReplyTo = suData.inReplyTo;
      su.comment = ko.observable("");
          
      su.id = ko.computed(function() {
        return su.timestamp + ":" + su.username;
      });
      
      su.comments = ko.computed(function() {
        var res = _.filter(self.allStatuses(), function(item) {
          return item.inReplyTo == su.id();
        });
        return res;
      });
      
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
        fuapi.init()
            .then(function(localUsername) {
                    self.username(localUsername);
                    self.loggedIn(true);

                    setPageFromUrl();
                    
                    fuapi.fetchFriends().then(function(value) {
                        self.allFriends(value);
                    }, onError);
                    
                    fuapi.fetchStatus().then(function(value) {
                        addStatusUpdates(value);
                    }, onError);
                    
                }, function(notLoggedInMsg) {
                    console.log(notLoggedInMsg);
                    self.selectedTab("welcome");
                    self.loggedIn(false);
                });
    };

    
    self.login = function() {
        fuapi.login(self.username())
            .then(function() {;}, onError);
    };

    self.logout = function() {
        fuapi.logout().then(function() {
            self.loggedIn(false);
            self.selectedTab("support");
        });
    };
  
    self.refresh = function() {
        init();
    };

    var showError = function(message) {
        $('#error-message').text(message);
        $('#error-panel').slideDown();
        setTimeout(function() {
            $("#error-panel").slideUp();
        }, 4000);
    };
        
    self.addFriend = function() {
        fuapi.addFriendAPI(self.addFriendsUsername()).then(onFriendAdded, showError);
    };

    var onFriendAdded = function(friendData) {
        self.allFriends.push(friendData);
        self.addFriendsUsername("");
    };

    self.removeFriend = function(friendToRemove) {
        fuapi.removeFriendAPI(friendToRemove).then(onFriendRemoved, showError);
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
        }, onError);

        fuapi.removeAllStatuses().then(function() {
            self.allStatuses([]);
        }, onError);
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

