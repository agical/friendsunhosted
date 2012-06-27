require(['jquery', 'underscore', 'ui', 'ko', 'remoteStorage', 'when'], function($, _, ui, ko, remoteStorage, when) {

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
    self.allFriends = ko.observableArray([]);

    function StatusUpdate(suData) {
      var su = this;
      su.status = suData.status;
      su.timestamp = suData.timestamp;
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
      }
    }

    function init() {
      var localUsername = localStorage.getItem('username');
      if(localUsername) {
        self.username(JSON.parse(localUsername));
        self.loggedIn(true);
        fetchUserData(FRIENDS_KEY).then(function(value) {
          value = value || [];
          self.allFriends(value);
        }, onError)
        fetchUserData(STATUS_KEY).then(function(value) {
          value = value || [];
          addStatusUpdates(value);
        }, onError)
      }
    }

    self.addFriendsUsername = ko.observable("");
    
    self.login = function() {
      connect(self.username(), function(err, storageInfo) {
        localStorage.setItem('username', JSON.stringify(self.username()));
        localStorage.setItem('userStorageInfo', JSON.stringify(storageInfo));
        authorize(['public']);
        init();
      });
    };

    self.logout = function() {
      localStorage.clear();
      window.location.href = "/";
    };
  
    self.refresh = function() {
      if(localStorage.getItem('bearerToken') && self.allFriends().length>0) {
        updateFriends(self.allFriends());
      }
    };

    var onError = function(err) { console.log(err) };
    
    var updateFriends = function(newFriendsList) {
      _.each(newFriendsList, function(friendData) {
        connect(friendData.username, function(err1, storageInfo) {
          var client = remoteStorage.createClient(storageInfo, 'public');
          client.get(STATUS_KEY, function(err, dataStr) {
            if(err) {
              console.log("Error when reading status update for key:", key, " Error:", err);
            } else {
              addStatusUpdates(dataStr && dataStr!="null"? JSON.parse(dataStr):[]);
            }
          });
        });
      });
    };
    
    self.allFriends.subscribe(updateFriends);
        
    self.addFriend = function() {
      var emailRegex = /^([a-zA-Z0-9_\.\-])+\@([a-zA-Z0-9\-\.])+$/;
      
      if(!self.addFriendsUsername() || !emailRegex.test(self.addFriendsUsername())) {
        alert("Invalid username: " + self.addFriendsUsername());
        return;
      }
      if(_.any(self.allFriends(), function(f) {return f.username==self.addFriendsUsername();})) {
        return;
      } 
      var friendData = {"username": self.addFriendsUsername(),
                        "timestamp": new Date().getTime()};
      fetchUserData(FRIENDS_KEY).then(function(value) {
        value = value || [];
        value.push(friendData);
        putUserData(FRIENDS_KEY, value).then(function(keyValCat) {
          self.allFriends.push(friendData);
          self.addFriendsUsername("");
        }, onError); 
      }, onError)
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


    function getUserStorageClient(category) {
        var token = localStorage.getItem('bearerToken');
        var storageInfo = JSON.parse(localStorage.getItem('userStorageInfo'));
        var client = remoteStorage.createClient(storageInfo, category, token);
        return client;      
    }
  
    function fetchUserData(key, category) {
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

    function putUserData(key, value, category) {
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
    
    self.updateStatus = function() {
      if(!self.statusUpdate() || self.statusUpdate().trim().length == 0) {return;}
      self.addNewStatus(
          {"status": self.statusUpdate(),
           "timestamp": new Date().getTime(),
           "username": self.username()});
    };
    
    self.addNewStatus = function(statusUpdate) {
      fetchUserData(STATUS_KEY).then(function(statusUpdates) {
        statusUpdates = statusUpdates || [];
        statusUpdates.push(statusUpdate);
        putUserData(STATUS_KEY, statusUpdates).then(function() {
          addStatusUpdates(statusUpdates);
          self.statusUpdate('');
        });
      });
    };

    self.clearAll = function() {
      var client = getUserStorageClient('public');

      client.delete(STATUS_KEY, function(err) {
        if(err) {
          console.log("Error when clearing updates:", err);
        } else {
          self.allStatuses([]);
        }
      });

      client.delete(FRIENDS_KEY, function(err) {
        if(err) {
          console.log("Error when clearing updates:", err);
        } else {
          self.allFriends([]);
        }
      });
    }
    
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
    }

    function authorize(categories) {
      var storageInfo = JSON.parse(localStorage.getItem('userStorageInfo'));
      var redirectUri = location.protocol + '//' + location.host + '/receive_token.html';

      var oauthPage = remoteStorage.createOAuthAddress(storageInfo, categories, redirectUri);
      var popup = window.open(oauthPage);
    }

    window.addEventListener('message', function(event) {
      if(event.origin == location.protocol +'//'+ location.host) {
        console.log('Received an OAuth token: ' + event.data);
        localStorage.setItem('bearerToken', event.data);
        self.loggedIn(event.data!=null);
      }
    }, false);

    setInterval( self.refresh, 30000);
      
    init();
  };

  ko.applyBindings(new FriendsViewModel());
      
    	$(function(){

				// Accordion
				$("#accordion").accordion({ header: "h3" });

				// Tabs
				$('#tabs').tabs();

				// Dialog
				$('#dialog').dialog({
					autoOpen: false,
					width: 600,
					buttons: {
						"Ok": function() {
							$(this).dialog("close");
						},
						"Cancel": function() {
							$(this).dialog("close");
						}
					}
				});

				// Dialog Link
				$('#dialog_link').click(function(){
					$('#dialog').dialog('open');
					return false;
				});

				// Datepicker
				$('#datepicker').datepicker({
					inline: true
				});

				// Slider
				$('#slider').slider({
					range: true,
					values: [17, 67]
				});

				// Progressbar
				$("#progressbar").progressbar({
					value: 20
				});

				//hover states on the static widgets
				$('#dialog_link, ul#icons li').hover(
					function() { $(this).addClass('ui-state-hover'); },
					function() { $(this).removeClass('ui-state-hover'); }
				);

			});
});

