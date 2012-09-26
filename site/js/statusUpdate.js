define(['underscore', 'ko', 'when', 'moment'], 
        function(_, ko, when, moment) {
    var StatusUpdate = function(suData) {
        var VISIBLE_COMMENTS_IN_COLLAPSED_MODE = 2;
        var EMAIL_REGEX = /((([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,})))/gm;
        var URL_REGEX = /(\(?\b(http|https|ftp|ssh|sftp):\/\/[-A-Za-z0-9+&@#\/%?=~_()|!:,.;]*[-A-Za-z0-9+&@#\/%=~_()|])/gm;
        var NEWLINE_REGEX = /\n/gm;
        var GT_REGEX = />/gm;
        var LT_REGEX = /</gm;
        var su = {};

        function escapeAndFormatStatusText(text) {
            return text.replace(LT_REGEX, '&lt;').replace(GT_REGEX, '&gt;').replace(NEWLINE_REGEX, '<br/>').replace(EMAIL_REGEX, '<a href="mailto:$1" target="_blank">$1</a>').replace(URL_REGEX, '<a href="$1" target="_blank">$1</a>');
        }
        su.timestamp = suData.timestamp;
        su.username = suData.username;
        su.inReplyTo = suData.inReplyTo;

        su.status = escapeAndFormatStatusText(suData.status);

        su.participants = ko.observableArray([]);
        su.mySeenParticipants = ko.observableArray([]);
        //su.collapsed = ko.observable(false);
        su.collapsed = ko.observable(true);
        su.comments = ko.observableArray([]);
        su.comment = ko.observable("");

        su.id = ko.computed(function() {
            return su.timestamp + ":" + su.username;
        });

        su.relativeTimestamp = ko.observable("");

        var updateRelativeTimestamp = function() {
                var time = new Date(su.timestamp);
                su.relativeTimestamp(moment(time).fromNow());
                setTimeout(updateRelativeTimestamp, Math.min((new Date().getTime() - su.timestamp) / 2, 1000 * 10 * (120 - Math.floor(Math.random() * 60))));
            };

        updateRelativeTimestamp();


        su.addParticipant = function(usernameToAdd) {
            //          if(su.mySeenParticipants.indexOf(usernameToAdd)<0 && usernameToAdd!=su.username) {
            //              fuapi.addThreadParticipant(self.username(), su.id(), usernameToAdd).then(
            //                  function() {su.mySeenParticipants.push(usernameToAdd);}
            //              );
            //          }
        };

        su.collapse = function() {
            su.collapsed(true);
        };

        su.expand = function() {
            su.collapsed(false);
        };



        su.handleCollapse = function() {
                if (su.collapsed()) {
                    _.each(
                    _.initial(su.comments(), VISIBLE_COMMENTS_IN_COLLAPSED_MODE), function(item) {
                        item.collapse();
                    });
                    _.each(
                    _.last(su.comments(), VISIBLE_COMMENTS_IN_COLLAPSED_MODE), function(item) {
                        item.expand();
                    });
                } else {
                    _.each(su.comments(), function(item) {
                        item.expand();
                    });
                };
            };

        su.collapsed.subscribe(su.handleCollapse);

        return su;
    };
    return StatusUpdate;
});