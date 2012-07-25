require(['jquery', 'underscore', 'ui', 'ko', 'when', 'remoteAdapter', 'storageConversion'], function($, _, ui, ko, when, rem, storageConversion) {

    function onError(err) { 
        console.log(err); 
    };
    
    function presentTimestamp(timestamp) {
        return new Date(timestamp);
    }
    
    
  function FriendsViewModel() {
    var self = this;
    var STATUS_KEY = 'friendsunhosted_statusupdate_testing';
    var FRIENDS_KEY = 'friendsunhosted_friends';
    
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
        }
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
          rem.getPublicData(friendData.username, STATUS_KEY).then(function(parsedData) {
              addStatusUpdates(parsedData);
          }, onError);
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
        self.addNewStatus({
          'username': self.username(),
          'timestamp': new Date().getTime(),
          'status': su.comment(),
          'inReplyTo': su.id(),
        });
      };
    }

    function init() {
        rem.init().then(function(localUsername) {
            self.username(localUsername);
            self.loggedIn(true);
            if(window.location.href.indexOf('#access_token') > 0) {
                window.location.replace(location.protocol + '//' + location.host + "#status");
                self.selectedTab("status");
            } else if(window.location.href.indexOf('#') > 0) {
                self.selectedTab(self.getPageFromLocation());
            } else {
                window.location.replace(location.protocol + '//' + location.host + "#welcome");
                self.selectedTab("welcome");
            }
            rem.fetchUserData(FRIENDS_KEY).then(function(value) {
                value = value || [];
                self.allFriends(value);
            }, onError);
            rem.fetchUserData(STATUS_KEY).then(function(value) {
                value = value || [];
                addStatusUpdates(value);
            }, onError);
        }, function(notLoggedInMsg) {
            console.log(notLoggedInMsg);
            self.selectedTab("welcome");
            self.loggedIn(false);
        });
    };

    
    self.login = function() {
        rem
            .login(self.username())
            .then(function(loggedInUser) {
                init();
            }, onError);
    };

    self.logout = function() {
        rem.logout().then(function() {
            self.loggedIn(false);
            self.selectedTab("support");
        });
    };
  
    self.refresh = function() {
        init();
    };

    
        
    self.addFriend = function() {
      var emailRegex = /^([a-zA-Z0-9_\.\-])+\@([a-zA-Z0-9\-\.])+$/;
      
      if(!self.addFriendsUsername() || !emailRegex.test(self.addFriendsUsername())) {
        alert("Invalid username: " + self.addFriendsUsername());
        return;
      }
      if(_.any(self.allFriends(), function(f) {return f.username==self.addFriendsUsername();})) {
        $('#error-message').text('Cannot add the same user twice');
        $('#error-panel').slideDown();
        setTimeout(function() {
            $("#error-panel").slideUp();
        }, 4000);
        return;
      } 
      var friendData = {"username": self.addFriendsUsername(),
                        "timestamp": new Date().getTime()};
      rem.fetchUserData(FRIENDS_KEY).then(function(value) {
        value = value || [];
        value.push(friendData);
        rem.putUserData(FRIENDS_KEY, value).then(function(keyValCat) {
          self.allFriends.push(friendData);
          self.addFriendsUsername("");
        }, onError); 
      }, onError);
    };
    
    self.removeFriend = function(friendToRemove) {
        rem.fetchUserData(FRIENDS_KEY).then(function(value) {
            value = value || [];
            if(value.pop(friendToRemove)) {
                rem.putUserData(FRIENDS_KEY, value).then(function(keyValCat) {
                  self.allFriends.remove(friendToRemove);
                }, onError); 
            }
        }, onError);
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
          }
      });
      self.allStatuses(allSorted);
    }


    
    self.updateStatus = function() {
      if(!self.statusUpdate() || self.statusUpdate().trim().length == 0) {return;}
      self.addNewStatus(
          {"status": self.statusUpdate(),
           "timestamp": new Date().getTime(),
           "username": self.username()});
    };
    
    self.addNewStatus = function(statusUpdate) {
      rem.fetchUserData(STATUS_KEY).then(function(statusUpdates) {
        statusUpdates = statusUpdates || [];
        statusUpdates.push(statusUpdate);
        rem.putUserData(STATUS_KEY, statusUpdates).then(function() {
          addStatusUpdates(statusUpdates);
          self.statusUpdate('');
        });
      });
    };

    

    self.clearAll = function() {
      rem.deleteUserData(STATUS_KEY).then(function() {
          self.allStatuses([]);
      }, onError);

      rem.deleteUserData(FRIENDS_KEY).then(function() {
          self.allFriends([]);
      }, onError);

    };
    

    setInterval( self.refresh, 15000);
      
    init();
  };
  
    $(function(){
        storageConversion.convertStorage().then(function(){
            ko.applyBindings(new FriendsViewModel());
            $('#loading-screen').hide();
            $('#all').slideDown();
        });
    });
  
});

