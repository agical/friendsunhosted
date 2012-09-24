var buster = require("buster");
var when = require("when");

var siterobot = require("./siterobot");
var createRobot = siterobot.createRobot;
var createTestUser = siterobot.createTestUser;

var assert = buster.assertions.assert;


var eq = function(expected) {
    return (function(e) { 
                return function(actual) {
                    assert.equals(actual, e);
                };
    })(expected);
};

var match = function(expected) {
    return (function(e) { 
                return function(actual) {
                    assert.match(actual, e);
                };
    })(expected);
};

var assertVisible = function() {
    return function(b) {
                assert(b.isVisible(css));
            };
};


buster.testCase("Friends#Unhosted", {
    "- has a title and info on load": function (done) {
        this.timeout = 5000;
        
        createRobot(done)   
            .openStartPage()
            .title(eq('FRIENDS#UNHOSTED - Own your network!'))
            .welcomeHeadline(eq('What is FRIENDS#UNHOSTED?'))
        .end();
    },
    
    "- can login a user": function (done) {
        this.timeout = 25000;
            
        createRobot(done)  
            .loginNewUser()
            .loggedInUser(function(user) {
                return eq(user.username);
            })
        .end();
    },
    
    "- keeps login status on refresh": function (done) {
        this.timeout = 25000;
        
        createRobot(done).loginNewUser()
            .setStatus("Hello, #unhosted world!")
            .clickOkInConfirmWriteToEmptyStore()
            .refresh()
            .statusUpdate(1, eq("Hello, #unhosted world!"))
        .end();
    },

    "- can logout user": function (done) {
        this.timeout = 25000;
        
        createRobot(done).loginNewUser()
            .logout()
            .visibleLoginBox(assert)
            .refresh()
            .visibleLoginBox(assert)
        .end();
    },

    "- can let user add status updates": function (done) {
        this.timeout = 25000;

        createRobot(done)  
            .loginNewUser()
            .setStatus("Hello, #unhosted world!")
            .clickOkInConfirmWriteToEmptyStore()
            .statusUpdate(1, eq("Hello, #unhosted world!"))
            .statusUsername(1, function(user) {return eq(user.username);})
            .statusTimeStamp(1, assert)
            .setStatus("Second message")
            .statusUpdate(1, eq("Second message"))
            .statusUsername(1, function(user) {return eq(user.username);})
            .statusTimeStamp(1, assert)
        .end();
    },

    "- can comment on status updates": function (done) {
        this.timeout = 25000;
        createRobot(done)  
            .loginNewUser()
            .setStatus("Hello, #unhosted world!")
            .clickOkInConfirmWriteToEmptyStore()
            .statusUpdate(1, eq("Hello, #unhosted world!"))
            .addComment(1, "Hello to you!")
            .comment(1, 1, eq("Hello to you!"))
        .end();
    },

    "- can collapse and expand conversations": function (done) {
        this.timeout = 25000;
        createRobot(done)  
            .loginNewUser()
            .setStatus("Status update 1")
            .clickOkInConfirmWriteToEmptyStore()
            .addComment(1, "Comment 1.1")
            .addComment(1, "Comment 1.2")
            .addComment(1, "Comment 1.3")
            .commentVisible(1, 1, eq(false))
            .commentVisible(1, 2, eq(true))
            .commentVisible(1, 3, eq(true))
            .expandStatus(1)
            .pause(1000)
            .commentVisible(1, 1, eq(true))
            .commentVisible(1, 2, eq(true))
            .commentVisible(1, 3, eq(true))
            .collapseStatus(1)
            .pause(1000)
            .commentVisible(1, 1, eq(false))
            .commentVisible(1, 2, eq(true))
            .commentVisible(1, 3, eq(true))
        .end();
    },

    "- emails and links are clickables": function (done) {
        this.timeout = 25000;

        createRobot(done)  
            .loginNewUser()
            .setStatus("daniel@agical.com http://dn.se https://github.com ftp://sunet.se ssh://server.dom sftp://server.dom")
            .clickOkInConfirmWriteToEmptyStore()
            .pause(500)
            .pageSource(match(/<a(| target="_blank") href="mailto:daniel@agical.com"(| target="_blank")>daniel@agical.com<\/a>/))
            .pageSource(match(/<a(| target="_blank") href="http:\/\/dn.se"(| target="_blank")>http:\/\/dn.se<\/a>/))
            .pageSource(match(/<a(| target="_blank") href="https:\/\/github.com"(| target="_blank")>https:\/\/github.com<\/a>/))
            .pageSource(match(/<a(| target="_blank") href="ftp:\/\/sunet.se"(| target="_blank")>ftp:\/\/sunet.se<\/a>/))
            .pageSource(match(/<a(| target="_blank") href="ssh:\/\/server.dom"(| target="_blank")>ssh:\/\/server.dom<\/a>/))
            .pageSource(match(/<a(| target="_blank") href="sftp:\/\/server.dom"(| target="_blank")>sftp:\/\/server.dom<\/a>/))

            .setStatus("<dangerous_script/>")
            .pause(500)
            .pageSource(match('&lt;dangerous_script/&gt;'))
            
            .addComment(1, "<dangerous/>")
            .pause(500)
            .pageSource(match('&lt;dangerous/&gt;'))
            
            .setStatus("\nHandles newlines\n\nin a\n\n\ngood way")
            .pause(500)
            .pageSource(match(/<br(| )\/?>Handles newlines<br(| )\/?><br(| )\/?>in a<br(| )\/?><br(| )\/?><br(| )\/?>good way/gm))
    
        .end();
    },
    
    "- can let user add, list and remove friends": function (done) {
        this.timeout = 25000;
        var NO_FRIENDS_MESSAGE = "How do I add friends";
        
        createTestUser().then(function(userToBeAdded) {
            var username = userToBeAdded.username;
            createRobot(done)
               .loginNewUser()
               .selectFriendsInMenu()
                .pause(500)
               .noFriendsMessage(match(NO_FRIENDS_MESSAGE))
               .addFriend(username)
               .clickOkInConfirmWriteToEmptyStore()
               .friend(1, eq(username))
               .addFriend(username)
               .errorMessage(eq(username + " is already your friend!"))
               .clickErrorOk()
               .removeFriend(1)
               .noFriendsMessage(match(NO_FRIENDS_MESSAGE))
               .refresh()
               .noFriendsMessage(match(NO_FRIENDS_MESSAGE))
           .end();
        });
        
    },

    "- can add a profile image": function (done) {
        this.timeout = 25000;
        
        createTestUser().then(function(userToBeAdded) {
            var username = userToBeAdded.username;
            createRobot(done)
               .loginNewUser()
               .selectProfileInMenu()
               .pause(500)
               .setProfileImage('http://localhost:8001/question-bunny.png')
               .clickOkInConfirmWriteToEmptyStore()
               .pause(1000)
               .refresh()
               .pause(2000)
               .profileImage(eq('http://localhost:8001/question-bunny.png'))
//               .selectStatusesInMenu()
//               .setStatus("Hey, is that me?")
//               .clickOkInConfirmWriteToEmptyStore()
//               .statusImage(eq('http://localhost:8001/question-bunny.png'))
           .end();
        });
        
    },

    
    "- add user from referring link when not logged in": function (done) {
        this.timeout = 25000;
        
        createRobot(done) 
            .open('http://localhost')
            .open('http://localhost:8000/#welcome?referredby=fetisov@localhost')
            .referralMessage(match('You have been invited by fetisov@localhost to join Friends#Unhosted'))
            .referralMessage(match('After you have logged in (in this browser), fetisov@localhost will be automagically added to your friends.'))
            .closeReferralMessage()
            .loginNewUser()
            .clickOkInConfirmWriteToEmptyStore()
            .selectFriendsInMenu()
            .friend(1, eq('fetisov@localhost'))
       .end();
        
    },

    "- add user from referring link when logged in": function (done) {
        this.timeout = 25000;
        
        createRobot(done)
            .loginNewUser()
            .open('http://localhost')
            .open('http://localhost:8000/#welcome?referredby=fetisov@localhost')
            .clickOkInConfirmWriteToEmptyStore()
            .friend(1, eq('fetisov@localhost'))
       .end();
        
    },

    
    "- user can see friends of friends and add them": function (done) {
        this.timeout = 25000;

        function createFriendWithFriend() {
            var friend = when.defer();
            var friendsFriend = when.defer();
            var allDone = when.defer();
            createTestUser().then(function(friendObject) {
                friendsFriend.resolve(friendObject.username);
                createRobot(allDone.resolve)
                    .loginNewUser()
                    .loggedInUser(function(userWithFriendUsername) {
                        friend.resolve(userWithFriendUsername.username);
                        return match(/.*/);
                    })
                   .selectFriendsInMenu()
                   .addFriend(friendObject.username)
                   .clickOkInConfirmWriteToEmptyStore()
                .end();
            },function(err){friend.reject(err);friendsFriend.reject(err);});
            
            return [friend.promise, friendsFriend.promise, allDone.promise];
        }
        
        when.all(createFriendWithFriend(),
            function(users) {
                var friend = users[0];
                var friendsFriend = users[1];
                createRobot(done)
                   .loginNewUser()
                   .selectFriendsInMenu()
                   .pause(2000)
                   .addFriend(friend)
                   .clickOkInConfirmWriteToEmptyStore()
                   .friend(1, eq(friend))
                   .friendsFriend(1, 1, eq(friendsFriend))
                   .refresh()
                   .friend(1, eq(friend))
                   .friendsFriend(1, 1, eq(friendsFriend))
                   .addFriendsFriendDirectly(1,1)
                   .friend(2, eq(friendsFriend))
               .end();
            },eq(""));
        
    },

    "- can let user see friends messages": function (done) {
        this.timeout = 35000;

        var waitForUserAddingStatus = when.defer();
        
        var b1 = createRobot(waitForUserAddingStatus.resolve)
            .loginNewUser()
            .setStatus("The message of the added")
            .clickOkInConfirmWriteToEmptyStore()
            .statusUpdate(1, eq("The message of the added"))
            .logout()
        .end();
        
        waitForUserAddingStatus.promise.then(function() {
            b1.user.promise.then(function(user) {
                createRobot(done).loginNewUser()
                    .selectFriendsInMenu()
                    .pause(500)
                    .addFriend(user.username)
                    .clickOkInConfirmWriteToEmptyStore()
                    .selectStatusesInMenu()
                    .statusUpdate(1, eq("The message of the added"))
                    .statusGetUsername(1, eq(user.username))
                    .setStatus("The message of the adder")
                    .clickOkInConfirmWriteToEmptyStore()
                    .statusUpdate(1, eq("The message of the adder"))
                    .statusUpdate(2, eq("The message of the added"))
                .end();
            });
        });
    },

    "- shows latest activity on top": function (done) {
        this.timeout = 25000;
         
        createRobot(done).loginNewUser()
            .setStatus("First status")
            .clickOkInConfirmWriteToEmptyStore()
            .setStatus("Second status")
            .statusUpdate(1, eq("Second status"))
            .statusUpdate(2, eq("First status"))
            .addComment(2, "Comment that puts status on top!")
            .refreshStatuses()
            .statusUpdate(1, eq("First status"))
        .end();               
    },

    "- can write to directly to store": function (done) {
        this.timeout = 25000;

        var _username = 'mongo@localhost';
        var _category = 'public';
        var _key = 'friendsunhosted_status';
        var firstTimestamp = new Date().getTime()-100000;

        var _value = [{"status":"Hej\nhopp 11","timestamp":firstTimestamp,"username":"mongo@localhost"}, 
                      {"status":"Nr 2","timestamp":firstTimestamp+50000,"username":"mongo@localhost"}];
        siterobot.store()
            .setValue(_username, _category, _key, _value)
            .then(function() {
                createRobot(done)
                    .loginNewUser()
                    .selectFriendsInMenu()
                    .pause(500)
                    .addFriend(_username)
                    .clickOkInConfirmWriteToEmptyStore()
                    .selectStatusesInMenu()
                    .statusUpdate(1, eq("Nr 2"))
                .end();
            });
    },

    "- can see other participants in threads": function (done) {
        this.timeout = 25000;

        var _category = 'public';
        var _key = 'friendsunhosted_status';
        var firstTimestamp = new Date().getTime()-100000;
        
        var _username = 'mongo@localhost';
        var _value = [{"status":"Hej\nhopp 11","timestamp":firstTimestamp,"username":"mongo@localhost"}, 
                      {"status":"Nr 2","timestamp":firstTimestamp+30000,"username":"mongo@localhost",'inReplyTo':firstTimestamp+':mongo@localhost'},
                      {'seen':'arne@anka.se', 'thread':firstTimestamp+':mongo@localhost'},
                      {'seen':'peppe@bodega.es', 'thread':firstTimestamp+':mongo@localhost'},
                      ];
        var _username2 = 'bongo@localhost';
        var _value2 = [{"status":"Från bongo","timestamp":firstTimestamp+60000,"username":"bongo@localhost",'inReplyTo':firstTimestamp+':mongo@localhost'},
                      {'seen':'arne@anka.se', 'thread':firstTimestamp+':mongo@localhost'},
                      {'seen':'arnold@isback.es', 'thread':firstTimestamp+':mongo@localhost'},
                      ];
        var store = siterobot.store();
        store
            .setValue(_username, _category, _key, _value).then(function(dataAndStore) {
                return store.setValue(_username2, _category, _key, _value2);
            })
            .then(function() {
                createRobot(done)
                    .loginNewUser()
                    .selectFriendsInMenu()
                    .pause(500)
                    .addFriend(_username)
                    .clickOkInConfirmWriteToEmptyStore()
                    .addFriend(_username2)
                    .selectStatusesInMenu()
                    .comment(1, 1, eq("Nr 2"))
                    .threadParticipants(1, eq(['arne@anka.se','peppe@bodega.es', 'arnold@isback.es']))
                .end();
            });
    },

    
    "- display 3 days at a time with a fetch more button": function (done) {
        this.timeout = 25000;

        var _username = 'mongo@localhost';
        var _category = 'public';
        var _key = 'friendsunhosted_status';
        var ONE_DAY_MS = 1000*60*60*24;
        var now = new Date().getTime();

        var _value = [{"status":"Now","timestamp":now,"username":"mongo@localhost"}, 
                      {"status":"2 days ago","timestamp":now-ONE_DAY_MS*2,"username":"mongo@localhost"},
                      {"status":"4 days ago","timestamp":now-ONE_DAY_MS*4,"username":"mongo@localhost"},
                      {"status":"5 days ago","timestamp":now-ONE_DAY_MS*5,"username":"mongo@localhost"},
                      {"status":"7 days ago","timestamp":now-ONE_DAY_MS*7,"username":"mongo@localhost"},
                      ];
        siterobot.store()
            .setValue(_username, _category, _key, _value)
            .then(function() {
                createRobot(done)
                    .loginNewUser()
                    .selectFriendsInMenu()
                    .pause(500)
                    .addFriend(_username)
                    .clickOkInConfirmWriteToEmptyStore()
                    .selectStatusesInMenu()
                    .statusUpdate(1, eq(_value[0].status))
                    .statusUpdate(2, eq(_value[1].status))
                    .isStatusVisible(3, eq(false))
                    .getMoreUpdates()
                    .statusUpdate(3, eq(_value[2].status))
                    .statusUpdate(4, eq(_value[3].status))
                    .isStatusVisible(5, eq(false))
                    .getMoreUpdates()
                    .statusUpdate(5, eq(_value[4].status))
                .end();
            });
    },

});

