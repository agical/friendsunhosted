require(['jquery', 'underscore', 'ui', 'ko', 'remoteStorage', 'when'], function($, _, ui, ko, remoteStorage, when) {

  function LoginViewModel() {
    var self = this;
    var STATUS_KEY = 'friendsunhosted_statusupdate_testing';
    var FRIENDS_KEY = 'friendsunhosted_friends';
    
    self.loggedIn = ko.observable(false);
    
    self.username = ko.observable("");
    self.statusUpdate = ko.observable("");
    
    
    self.allStatuses = ko.observableArray([]);
    self.allFriends = ko.observableArray([]);

    self.addFriendsUsername = ko.observable("");
    
    
    self.login = function() {
      connect(self.username(), function(err, storageInfo) {
        localStorage.setItem('userStorageInfo', JSON.stringify(storageInfo));
        authorize(['public', 'friends']);
      });
      
    };

    var onError = function(err) { console.log(err) };
    
    self.allFriends.subscribe(function(newFriendsList) {
      _.each(newFriendsList, function(friendData) {
        connect(friendData.username, function(err1, storageInfo) {
          var client = remoteStorage.createClient(storageInfo, 'public');
          client.get(STATUS_KEY, function(err, dataStr) {
            if(err) {
              console.log("Error when reading status update for key:", key, " Error:", err);
            } else {
              var data = JSON.parse(dataStr);
              addStatusUpdates(data!=null?data:[]);
            }
          });
        });
      });
    });
        
    self.addFriend = function() {
      var friendData = {"username": self.addFriendsUsername(),
                        "timestamp": new Date().getTime()};
      
      fetchUserData(FRIENDS_KEY).then(function(value) {
        value = value || [];
        value.push(friendData);
        putUserData(FRIENDS_KEY, value).then(function(keyValCat) {
          self.allFriends.push(friendData);
        }, onError); 
      }, onError)
    };
    
                   

    function addStatusUpdates(statusUpdatesArray) {
      var existingStatuses = self.allStatuses();
      var all = _.union(existingStatuses, statusUpdatesArray);
      var allSorted = _.sortBy(all, function(item) {return item.timestamp;});
      var allUnique = _.unique(allSorted, true, function(item) {return item.timestamp + item.username;});
      self.allStatuses(allUnique);
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
            deferred.resolve(JSON.parse(dataStr));
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
          try {
            deferred.resolve({"key": key, "value": value, "category": category});
          } catch(e) {
            deferred.reject(e);
          }
        }
      });
      return deferred.promise;
    };
    
    function appendToPublicData(key, value) {
      var deferred = when.defer();
      
      var client = getUserStorageClient('public');

      client.get(key, function(err, dataStr) {
        if(err) {
          console.log("Error when reading status update for key:", key, " Error:", err);
          return;
        };
        var data = (dataStr!=null && dataStr!="null") ? JSON.parse(dataStr) : [];
        data.push(value);
        client.put(key, JSON.stringify(data), function(err) {
          if(err) {
            console.log("Error when writing status update:", err);
          } else {  
            deferred.resolve(data);
          }
        });
      });
      return deferred.promise;
    };
    
    self.updateStatus = function() {
      var _value = {"status": self.statusUpdate(),
                    "timestamp": new Date().getTime(),
                    "username": self.username()};
      
      appendToPublicData(STATUS_KEY, _value).then(function(savedData) {
        addStatusUpdates(savedData);
        self.statusUpdate("");
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
          alert('Could not load storage info');
          console.log(error);
        } else {
          console.log('Storage info received:');
          console.log(storageInfo);
        }

        callback(error, storageInfo);
      });
    }

    // Getting data from the "public" category doesn't require any credentials.
    // For writing to a user's public data, or reading/writing any of the other
    // categories, we need to do an OAuth request first to obtain a token.

    // This method opens a popup that sends the user to the OAuth dialog of the
    // remoteStorage provider.
    function authorize(categories) {
      var storageInfo = JSON.parse(localStorage.getItem('userStorageInfo'));
      var redirectUri = location.protocol + '//' + location.host + '/receive_token.html';

      var oauthPage = remoteStorage.createOAuthAddress(storageInfo, categories, redirectUri);
      var popup = window.open(oauthPage);
    }

    // To get the OAuth token we listen for the `message` event from the
    // receive_token.html that sends it back to _.
    window.addEventListener('message', function(event) {
      if(event.origin == location.protocol +'//'+ location.host) {
        console.log('Received an OAuth token: ' + event.data);
        localStorage.setItem('bearerToken', event.data);
        self.loggedIn(event.data!=null);
      }
    }, false);

    
    
  };

  ko.applyBindings(new LoginViewModel());
      
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

