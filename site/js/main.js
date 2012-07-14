require(['jquery', 'underscore', 'ui', 'ko', 'remoteStorage', 'when'], function($, _, ui, ko, remoteStorage, when) {

    var daStore = function() {
        var val = {};
        var getUserStorageClient = function(category) {
            var token = localStorage.getItem('bearerToken');
            var storageInfo = JSON.parse(localStorage.getItem('userStorageInfo'));
            var client = remoteStorage.createClient(storageInfo, category, token);
            return client;      
        };
      
        val.fetchUserData = function(key, category) {
            category = category || 'public';
            var deferred = when.defer();
          
            var client = getUserStorageClient(category);
            client.get(key, function(err, dataStr) {
                if(err) {
                    deferred.reject(err);
                } else {
                    try {
                        deferred.resolve(dataStr?JSON.parse(dataStr):null);
                    } catch(e) {
                        deferred.reject(e);
                    }
                }
            });
            return deferred.promise;
        };

        val.putUserData = function(key, value, category) {
          category = category || 'public';
          var deferred = when.defer();
          
          var client = getUserStorageClient(category);
          client.put(key, JSON.stringify(value), function(err) {
            if(err) {
              deferred.reject(err);
            } else {
              deferred.resolve({"key": key, "value": value, "category": category});
            }
          });
          return deferred.promise;
        };

        val.getPublicData = function(username, key) {
            var deferred = when.defer();
            
            connect(username, function(err, storageInfo) {
                if(err) { deferred.reject(err); return;}
                
                var client = remoteStorage.createClient(storageInfo, 'public');
                client.get(key, function(err2, dataStr) {
                    if(err2) {
                        deferred.reject("Error when reading status update for key:" + key + " Error:" + err2);
                    } else {
                        deferred.resolve(dataStr && dataStr!="null"? JSON.parse(dataStr):[]);
                    }
                });
            });
            
            return deferred.promise();
        };

        function connect(userAddress, callback) {
            remoteStorage.getStorageInfo(userAddress, function(error, storageInfo) {
              if(error) {
                alert('Could not load storage info:' + error);
                console.log(error);
              } else {
                console.log('Storage info received:');
                console.log(storageInfo);
              }

              callback(error, storageInfo);
            });
        };

        var authorize = function(categories) {
            var storageInfo = JSON.parse(localStorage.getItem('userStorageInfo'));
            var redirectUri = location.protocol + '//' + location.host + '/receive_token.html';

            var oauthPage = remoteStorage.createOAuthAddress(storageInfo, categories, redirectUri);
            var popup = window.open(oauthPage);
        };

        val.init = function() {
            var deferred = when.defer();
            
            var localUsername = localStorage.getItem('username');
            var token = localStorage.getItem('bearerToken');
            
            if(localUsername && token) {
                deferred.resolve(JSON.parse(localUsername));
            } else {
                deferred.reject("No logged in user");
            }
            return deferred.promise;
        };

        window.addEventListener('message', function(event) {
            if(event.origin == location.protocol +'//'+ location.host) {
                console.log('Received an OAuth token: ' + event.data);
                localStorage.setItem('bearerToken', event.data);
                val.init();
            }
        }, false);

          
        val.login = function(username) {
              var deferred = when.defer();
              connect(username, function(err, storageInfo) {
                    if(err) {
                        deferred.reject(err);
                    } else {
                        localStorage.setItem('username', JSON.stringify(username));
                        localStorage.setItem('userStorageInfo', JSON.stringify(storageInfo));
                        authorize(['public']);
                    }
              });
              return deferred.promise;
        };

        val.logout = function() {
              var deferred = when.defer();
              localStorage.clear('username');
              localStorage.clear('userStorageInfo');
              localStorage.clear('bearerToken');
              deferred.resolve();
              return deferred.promise;
        };

        val.deleteUserData = function(key) {
              var deferred = when.defer();
              
              var client = getUserStorageClient('public');

              client.delete(key, function(err) {
                if(err) {
                  deferred.reject(err);
                } else {
                  deferred.resolve(key);
                }
              });
              
              return deferred.promise;
        };

        return val;
    };
    
  function FriendsViewModel() {
    var self = this;
    var STATUS_KEY = 'friendsunhosted_statusupdate_testing';
    var FRIENDS_KEY = 'friendsunhosted_friends';
    
    var rem = daStore();
    
    self.loggedIn = ko.observable(false);
    self.username = ko.observable("");
    
    self.statusUpdate = ko.observable("");    
    self.allStatuses = ko.observableArray([]);
    self.allRootStatuses = ko.computed(function() {
      return _.filter(self.allStatuses(), function(item) {return !item.inReplyTo;});
    });
    
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
            rem.fetchUserData(FRIENDS_KEY).then(function(value) {
                value = value || [];
                self.allFriends(value);
            }, onError);
            rem.fetchUserData(STATUS_KEY).then(function(value) {
                value = value || [];
                addStatusUpdates(value);
            }, onError);
        }, function(errMsg) {
            console.log(errMsg);
            self.loggedIn(false);
        });
    };

    
    self.login = function() {
        rem.login(self.username()).then(function() {init();}, onError);
    };

    self.logout = function() {
        rem.logout().then(function() {
            window.location.href = "/";
        });
    };
  
    self.refresh = function() {
        init();
    };

    var onError = function(err) { console.log(err); };
    
    function presentTimestamp(timestamp) {
      return new Date(timestamp);
    }
    
    
        
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
      var allSorted = _.sortBy(all, function(item) {return item.timestamp;});
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
      rem.deleteUserData(STATUS_KEY, function() {
          self.allStatuses([]);
      }, onError);

      rem.deleteUserData(FRIENDS_KEY, function() {
          self.allFriends([]);
      }, onError);

    };
    

    window.addEventListener('message', function(event) {
      if(event.origin == location.protocol +'//'+ location.host) {
        console.log('Received an OAuth token: ' + event.data);
        localStorage.setItem('bearerToken', event.data);
        init();
      }
    }, false);

    setInterval( self.refresh, 30000);
      
    init();
  };

  var initFlattr = function() {
      var s = document.createElement('script'), t = document.getElementsByTagName('script')[0];
      s.type = 'text/javascript';
      s.async = true;
      s.src = 'http://api.flattr.com/js/0.6/load.js?mode=auto';
      t.parentNode.insertBefore(s, t);
  };
      
  $(function(){
    ko.applyBindings(new FriendsViewModel());
    setTimeout(initFlattr, 0);
  });
  
});

