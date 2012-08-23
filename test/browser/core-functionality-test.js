var buster = require("buster");
var when = require("when");

var siterobot = require("./siterobot");
var createRobot = siterobot.createRobot;
var createTestUser = siterobot.createTestUser;

var assert = buster.assertions.assert;

var NO_FRIENDS_MESSAGE = "How do I add friends";

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

var isTrue = function(fn) {
    return function(actual) {
        assert.isTrue(fn(actual));
    };
};

var assertVisible = function() {
    return function(b) {
                assert(b.isVisible(css));
            };
};


buster.testCase("Friends#Unhosted", {
    "//- has a title and info on load": function (done) {
        this.timeout = 5000;
        
        createRobot(done)   
            .openStartPage()
            .title(eq('FRIENDS#UNHOSTED - Own your network!'))
            .welcomeHeadline(eq('What is FRIENDS#UNHOSTED?'))
        .end();
    },
    
    "//- can login a user": function (done) {
        this.timeout = 25000;
            
        createRobot(done)  
            .loginNewUser()
            .welcomeMessage(function(user) {
                return eq("Welcome, " + user.username + "!");
            })
        .end();
    },
    
    "//- can let user add status updates": function (done) {
        this.timeout = 25000;

        createRobot(done)  
            .loginNewUser()
            .setStatus("Hello, #unhosted world!")
            .statusUpdate(1, eq("Hello, #unhosted world!"))
            .statusUsername(1, function(user) {return eq(user.username);})
            .statusTimeStamp(1, assert)
            .setStatus("Second message")
            .statusUpdate(1, eq("Second message"))
            .statusUsername(1, function(user) {return eq(user.username);})
            .statusTimeStamp(1, assert)
        .end();
    },

    "//- can comment on status updates": function (done) {
        this.timeout = 25000;
        createRobot(done)  
            .loginNewUser()
            .setStatus("Hello, #unhosted world!")
            .statusUpdate(1, eq("Hello, #unhosted world!"))
            .addComment(1, "Hello to you!")
            .comment(1, 1, eq("Hello to you!"))
        .end();
    },

    "//- can collapse and expand conversations": function (done) {
        this.timeout = 25000;
        createRobot(done)  
            .loginNewUser()
            .setStatus("Status update 1")
            .addComment(1, "Comment 1.1")
            .addComment(1, "Comment 1.2")
            .addComment(1, "Comment 1.3")
            .commentVisible(1, 1, eq(true))
            .commentVisible(1, 2, eq(true))
            .commentVisible(1, 3, eq(true))
            .collapseStatus(1)
            .pause(1000)
            .commentVisible(1, 1, eq(false))
            .commentVisible(1, 2, eq(true))
            .commentVisible(1, 3, eq(true))
            .expandStatus(1)
            .pause(1000)
            .commentVisible(1, 1, eq(true))
            .commentVisible(1, 2, eq(true))
            .commentVisible(1, 3, eq(true))
        .end();
    },

    "//- emails and links are clickables": function (done) {
        this.timeout = 25000;

        createRobot(done)  
            .loginNewUser()
            .setStatus("daniel@agical.com http://dn.se https://github.com ftp://sunet.se ssh://server.dom sftp://server.dom")
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
    
    "//- can let user add, list and remove friends": function (done) {
        this.timeout = 25000;
        
        createTestUser().then(function(userToBeAdded) {
            var username = userToBeAdded.username;
            createRobot(done)
               .loginNewUser()
               .selectFriendsInMenu()
                .pause(500)
               .noFriendsMessage(match(NO_FRIENDS_MESSAGE))
               .addFriend(username)
               .friend(1, eq(username))
               .addFriend(username)
               .errorMessage(eq("Cannot add the same user twice"))
               .removeFriend(1)
               .noFriendsMessage(match(NO_FRIENDS_MESSAGE))
               .refresh()
               .noFriendsMessage(match(NO_FRIENDS_MESSAGE))
           .end();
        });
        
    },

    "//- user can see friends of friends and add them": function (done) {
        this.timeout = 25000;

        function createFriendWithFriend() {
            var friend = when.defer();
            var friendsFriend = when.defer();
            var allDone = when.defer();
            createTestUser().then(function(friendObject) {
                console.log(friendObject);

                friendsFriend.resolve(friendObject.username);
                createRobot(allDone.resolve)
                    .loginNewUser()
                    .loggedInUser(function(userWithFriendUsername) {
                        console.log(userWithFriendUsername);
                        friend.resolve(userWithFriendUsername.username);
                        return match(/.*/);
                    })
                   .selectFriendsInMenu()
                   .addFriend(friendObject.username)
                .end();
            },function(err){friend.reject(err);friendsFriend.reject(err);});
            
            return [friend.promise, friendsFriend.promise, allDone.promise];
        }
        
        when.all(createFriendWithFriend(),
            function(users) {
                console.log(users);
                var friend = users[0];
                var friendsFriend = users[1];
                createRobot(done)
                   .loginNewUser()
                   .selectFriendsInMenu()
                   .addFriend(friend)
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

    "//- can let user see friends messages": function (done) {
        this.timeout = 25000;

        var waitForUserAddingStatus = when.defer();
        
        var b1 = createRobot(waitForUserAddingStatus.resolve)
            .loginNewUser()
            .setStatus("The message of the added")
            .statusUpdate(1, eq("The message of the added"))
            .logout()
        .end();
        
        waitForUserAddingStatus.promise.then(function() {
            b1.user.promise.then(function(user) {
                createRobot(done).loginNewUser()
                    .selectFriendsInMenu()
                    .pause(500)
                    .addFriend(user.username)
                    .selectStatusesInMenu()
                    .statusUpdate(1, eq("The message of the added"))
                    .statusGetUsername(1, eq(user.username))
                    .setStatus("The message of the adder")
                    .statusUpdate(1, eq("The message of the adder"))
                    .statusUpdate(2, eq("The message of the added"))
                .end();
            });
        });
    },

    "//- keeps login status on refresh": function (done) {
        this.timeout = 25000;
        
        createRobot(done).loginNewUser()
            .setStatus("Hello, #unhosted world!")
            .refresh()
            .statusUpdate(1, eq("Hello, #unhosted world!"))
        .end();
    },

    "//- can logout user": function (done) {
        this.timeout = 25000;
        
        createRobot(done).loginNewUser()
            .logout()
            .visibleLoginBox(assert)
            .refresh()
            .visibleLoginBox(assert)
        .end();
    },

    "//- shows latest activity on top": function (done) {
        this.timeout = 25000;
         
        createRobot(done).loginNewUser()
            .setStatus("First status")
            .setStatus("Second status")
            .statusUpdate(1, eq("Second status"))
            .statusUpdate(2, eq("First status"))
            .addComment(2, "Comment that puts status on top!")
            .refreshStatuses()
            .statusUpdate(1, eq("First status"))
        .end();               
    },

    "//- can write to directly to store": function (done) {
        this.timeout = 25000;

        var _username = 'mongo@localhost';
        var _category = 'public';
        var _key = 'friendsunhosted_status';
        var _value = [{"status":"Hej\nhopp 11","timestamp":1345183170572,"username":"mongo@localhost"}, 
                      {"status":"Nr 2","timestamp":1345183170573,"username":"mongo@localhost"}];
        siterobot.store()
            .setValue(_username, _category, _key, _value)
            .then(function() {
                createRobot(done)
                    .loginNewUser()
                    .selectFriendsInMenu()
                    .pause(500)
                    .addFriend(_username)
                    .selectStatusesInMenu()
                    .statusUpdate(1, eq("Nr 2"))
                .end();
            });
    },

    "- can see other participants in threads": function (done) {
        this.timeout = 25000;

        var _category = 'public';
        var _key = 'friendsunhosted_status';

        var _username = 'mongo@localhost';
        var _value = [{"status":"Hej\nhopp 11","timestamp":1345183170572,"username":"mongo@localhost"}, 
                      {"status":"Nr 2","timestamp":1345183170573,"username":"mongo@localhost",'inReplyTo':'1345183170572:mongo@localhost'},
                      {'seen':'arne@anka.se', 'thread':'1345183170572:mongo@localhost'},
                      {'seen':'peppe@bodega.es', 'thread':'1345183170572:mongo@localhost'},
                      ];
        var _username2 = 'bongo@localhost';
        var _value2 = [{"status":"Från bongo","timestamp":1345183170666,"username":"bongo@localhost",'inReplyTo':'1345183170572:mongo@localhost'},
                      {'seen':'arne@anka.se', 'thread':'1345183170572:mongo@localhost'},
                      {'seen':'arnold@isback.es', 'thread':'1345183170572:mongo@localhost'},
                      ];
        siterobot.store()
            .setValue(_username, _category, _key, _value).then(function(dataAndStore) {
                return dataAndStore.store.setValue(_username2, _category, _key, _value2);
            })
            .then(function() {
                createRobot(done)
                    .loginNewUser()
                    .selectFriendsInMenu()
                    .pause(5000)
                    .addFriend(_username)
                    .addFriend(_username2)
                    .selectStatusesInMenu()
                    .comment(1, 1, eq("Nr 2"))
                    .threadParticipants(1, eq(['arne@anka.se','peppe@bodega.es', 'arnold@isback.es']))
                .end();
            });
    },

});

