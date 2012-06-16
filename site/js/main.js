require(['jquery', 'ui', 'ko', 'remoteStorage'], function($, ui, ko, remoteStorage) {

  function LoginViewModel() {
    var self = this;
    
    self.loggedIn = ko.observable(false);
    
    self.username = ko.observable("");
    self.password = ko.observable("");
    self.statusUpdate = ko.observable("");
    self.allStatuses = ko.observableArray([]);
    
    self.clearAllUpdates = function() {
      var token = localStorage.getItem('bearerToken');
      if(token) {
        var storageInfo = JSON.parse(localStorage.getItem('userStorageInfo'));
        var client = remoteStorage.createClient(storageInfo, 'public', token);
        var key = 'friendsunhosted.com/statusupdate/testing';
        client.put(key, JSON.stringify(null), function(err) {
          if(err) {
            console.log("Error when clearing updates:", err);
          } else {
            self.allStatuses([]);
          }
         });
      }    
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
    // receive_token.html that sends it back to us.
    window.addEventListener('message', function(event) {
      if(event.origin == location.protocol +'//'+ location.host) {
        console.log('Received an OAuth token: ' + event.data);
        localStorage.setItem('bearerToken', event.data);
        self.loggedIn(event.data!=null);
      }
    }, false);

    // Operations
    self.login = function() {
      connect(self.username(), function(err, storageInfo) {
        localStorage.setItem('userStorageInfo', JSON.stringify(storageInfo));
        authorize(['public', 'friends']);
      });
      
    };
    
    self.updateStatus = function() {
      var token = localStorage.getItem('bearerToken');
      if(token) {
        var storageInfo = JSON.parse(localStorage.getItem('userStorageInfo'));
        var client = remoteStorage.createClient(storageInfo, 'public', token);
        var key = 'friendsunhosted.com/statusupdate/testing';
        client.get(key, function(err, data) {
          if(err) {
            console.log("Error when reading status update:", err);
            return;
          };
          var data = data!="null" ? JSON.parse(data) : [];
          var update = {"status": self.statusUpdate()};
          data.push(update);
          client.put(key, JSON.stringify(data), function(err) {
            if(err) {
              console.log("Error when writing status update:", err);
            } else {  
              self.allStatuses(data);
            }
          });
        });
      }
    };
    
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
