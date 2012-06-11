require(['jquery', 'ui', 'ko', 'remoteStorage'], function($, ui, ko, remoteStorage) {
  
  function LoginViewModel() {
    var self = this;
    
    self.loggedIn = ko.observable(false);
    
    self.username = ko.observable("");
    self.password = ko.observable("");
    self.token = ko.observable("");
    
    // Operations
    self.login = function() {
      remoteStorage.getStorageInfo(self.username(), function(err, storageInfo) {
        var receivedToken = remoteStorage.receiveToken();
        if(receivedToken) {
          self.loggedIn(true);
          self.token(receivedToken);
        } else {
          //get an access token for 'notes' by dancing OAuth with the remoteStorage of user@example.com:
          window.location = remoteStorage.createOAuthAddress(storageInfo, ['notes'], window.location.href);
        }
      }
      /*
        if(token) {
          //we can access the 'notes' category on the remoteStorage of user@example.com:
          var client = remoteStorage.createClient(storageInfo, 'notes', token);

          client.put('key', 'value', function(err) {
            client.get('key', function(err, data) {
              client.delete('key', function(err) {
              });
            });
          });

        */
      );      
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
