define(['ko', 'underscore', 'when', 'friendsUnhostedApi', 'statusUpdate'], 
        function(ko, _, when, fuapi, StatusUpdate) {
    
    function getTimestamp(item) {
        return item.timestamp;
    };

    function presentTimestamp(timestamp) {
        return new Date(timestamp);
    }
   
    var Friend = function(friendData, rootModel) {
	var friend = friendData; 
	var threadIdToRootStatus = rootModel.threadIdToRootStatus;
	friend.allFriends = ko.observableArray([]);
	friend.allRootStatuses = ko.observableArray([]);
	friend.allComments = ko.observableArray([]);
	friend.allSeenParticipants = ko.observableArray([]); // [{thread:'123:a@be.se', seen:['u@a.se',...]}, ...]
	friend.lastUpdated = ko.observable(0);
	friend.profilePicture = ko.observable("img/nopicture.png");
	friend.friendsByUsername = {};
	friend.latestStatus = ko.computed(function() {
	    rootModel.allRootStatuses();
	    var status = friend.allRootStatuses();
	    return friend.allRootStatuses().length == 0 ? 'Is acting quiet ... ' : 'says;  ' + friend.allRootStatuses()[status.length -1].status;
	}, friend);
       
       friend.addFriend = function(friendObject) {
           friend.allFriends.push(friendObject);
           friend.friendsByUsername[friendObject.username] = friendObject;
           friendObject.updateProfilePicture();
       };
       
       friend.friendByUsername = function(username) {
           if(username === friend.username) return friend;
           return friend.friendsByUsername[username];
       };

       var checkUrl = function(url) { 
           var regex = /^https?:\/\/[\w\.\-\/:\_]+$/;
           var result = regex.test(url);
           return result;
       };
       friend.updateProfilePicture = function() {
           var afterProfileUpdate = when.defer();
           fuapi.getProfile(friend.username).then(function(profileData) {
               if(profileData 
                       && profileData.profilePicture 
                       && checkUrl(profileData.profilePicture)) {
                   friend.profilePicture(profileData.profilePicture);
                   afterProfileUpdate.resolve(profileData.profilePicture);
               } else {
                   afterProfileUpdate.reject();
               }
           }, afterProfileUpdate.reject);
           return afterProfileUpdate.promise;
       };
       
       var rawUpdates = [];

       var addCommentToRootLater = function(comment, rootId) {
               setTimeout(function() {
                   var r = threadIdToRootStatus[rootId];

                   if (r) {
                       r.addParticipant(comment.username);
                   }

                   if (r && !_.any(r.comments(), function(c) {
                       return c.timestamp == comment.timestamp;
                   })) {
                       var index = _.sortedIndex(r.comments(), comment, getTimestamp);
                       r.comments.splice(index, 0, comment);
                   } else {
                       comment.tries = comment.tries + 1;
                       addCommentToRootLater(comment, rootId);
                   }
               }, (comment.tries - 1) ^ 2 * 100);
           };

       var addParticipantsToRootLater = function(seen, rootId) {
               setTimeout(function() {
                   var r = threadIdToRootStatus[rootId];
                   if (r && !_.any(r.participants(), function(c) {
                       return c == seen.seen;
                   })) {
                       r.participants.push(seen.seen);
                   } else {
                       seen.tries = seen.tries + 1;
                       addParticipantsToRootLater(seen, rootId);
                   }
               }, (seen.tries - 1) ^ 2 * (100 + Math.floor(Math.random() * 51)));
           };

       friend.updateFriends = function() {
           var updateFriendsDone = when.defer();
           fuapi.fetchFriendsOfFriend(friendData.username).then(function(fetchedFriends) {
               var newFriendsRaw = _.reject(fetchedFriends, function(newFriend) {
                   return _.any(friend.allFriends(), function(oldFriend) {
                       return oldFriend.username == newFriend.username;
                   });
               });
               _.map(_.map(newFriendsRaw, function(data) { return Friend(data, rootModel);}), friend.addFriend);
               updateFriendsDone.resolve(friend);
           }, updateFriendsDone.reject);
           return updateFriendsDone.promise;
       };

       friend.showMoreStatuses = function() {
           var updateDone = when.defer();

           var newRoots = [];
           var newComments = [];
           var newSeen = [];
           var newLastUpdate = 0;
           var onlyRecentUpdates = _.reject(rawUpdates, function(u) {
               return u.timestamp < rootModel.timeLimitForData(); //|| u.timestamp<friend.lastUpdated(); 
           });

           _.each(onlyRecentUpdates, function(update) {
               update.username = friend.username;
               newLastUpdate = Math.max(newLastUpdate, update.timestamp);
               
               var isThisUpdate = function(anUpdate) {
                   return update.timestamp == anUpdate.timestamp;
               };
               if (update.inReplyTo && !_.any(friend.allComments(), isThisUpdate)) {
                   newComments.push(update);
               } else if (update.seen) {
                   newSeen.push(update);
               } else if (!update.inReplyTo 
                       && !threadIdToRootStatus[update.timestamp + update.username] 
                       && !_.any(friend.allRootStatuses(), isThisUpdate)) {
                   newRoots.push(update);
               }
           });

           if (newRoots.length > 0) {
               var addThese = _.map(newRoots, StatusUpdate);
               friend.allRootStatuses().push.apply(friend.allRootStatuses(), addThese);
               rootModel.allRootStatuses().push.apply(rootModel.allRootStatuses(), addThese);
               _.each(addThese, function(su) {
                   var throttledSort = _.throttle(rootModel.sortRootStatuses, 1000);
                   su.comments.subscribe(function() {
                       throttledSort();
                       su.handleCollapse();
                   });

                   su.doComment = function() {
                       var updateText = su.comment();
                       if (!updateText || updateText.trim().length == 0) {
                           return; // short-circuit
                       }

                       su.comment('');

                       var resetFormAndLogWarning = function(err) {
                           su.comment(updateText);
                           logWarning(err);
                       };
                       fuapi
                           .addReply(updateText, su.id(), rootModel.username())
                           .then(rootModel.me().updateStatuses, resetFormAndLogWarning);
                   };                        
                   threadIdToRootStatus[su.id()] = su;
               });
               rootModel.sortRootStatuses();
           }
           if (newComments.length > 0) {
               _.each(newComments, function(r) {
                   var c = StatusUpdate(r);
                   c.tries = 0;
                   addCommentToRootLater(c, r.inReplyTo);
               });
           }
           if (newSeen.length > 0) {
               _.each(newSeen, function(r) {
                   r.tries = 0;
                   addParticipantsToRootLater(r, r.thread);
               });
           }
           if (newLastUpdate) {
               friend.lastUpdated(newLastUpdate);
           }
           updateDone.resolve(friend);

           return updateDone.promise;
       };

       friend.updateStatuses = function() {
           var updateDone = when.defer();

           fuapi.fetchStatusForUser(friend.username).then(function(updates) {
               rawUpdates = updates;

               friend.showMoreStatuses().then(updateDone.resolve, updateDone.reject);
           }, updateDone.reject);
           return updateDone.promise;
       };

       var max_time_between_updates = 15 * 60 * 1000;
       var min_time_between_updates = 5 * 1000;

       friend.setAutoUpdateStatuses = function() {
           var updateInterval = min_time_between_updates + (max_time_between_updates - max_time_between_updates / ((new Date().getTime()) - friend.lastUpdated()));
           setTimeout(function() {
               friend.updateStatuses().always(friend.setAutoUpdateStatuses);
           }, updateInterval);
       };

       friend.setAutoUpdateFriends = function() {
           var updateInterval = 5 * 60 * 1000;
           setTimeout(function() {
               friend.updateFriends().always(friend.setAutoUpdateFriends);
           }, updateInterval);
       };

       
       
       return friend;
   };
   
   return Friend;

});