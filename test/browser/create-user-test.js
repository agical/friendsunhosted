var buster = require("buster");
var when = require("when");

var siterobot = require("./siterobot");
var createRobot = siterobot.createRobot;
var createTestUser = siterobot.createTestUser;

var assert = buster.assertions.assert;

var NO_FRIENDS_MESSAGE = "No friends here. Add a friend in the box above!";

var assEq = function(expected) {
    return (function(e) { 
                return function(actual) {
                    assert.equals(e, actual);
                };
    })(expected);
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
            .title(assEq('FRIENDS#UNHOSTED - the #unhosted friends network'))
            .welcomeHeadline(assEq('What is FRIENDS#UNHOSTED?'))
        .end();
    },
    
    "//- can login a user": function (done) {
        this.timeout = 25000;
            
        createRobot(done)  
            .loginNewUser()
            .welcomeMessage(function(user) {
                return assEq("Welcome, " + user.username + "!");
            })
        .end();
    },
    
    "//- can let user add status updates": function (done) {
        this.timeout = 25000;

        createRobot(done)  
            .loginNewUser()
            .setStatus("Hello, #unhosted world!")
            .statusUpdate(1, assEq("Hello, #unhosted world!"))
            .statusUsername(1, function(user) {return assEq(user.username);})
            .statusTimeStamp(1, assert)
            .setStatus("Second message")
            .statusUpdate(1, assEq("Second message"))
            .statusUsername(1, function(user) {return assEq(user.username);})
            .statusTimeStamp(1, assert)
        .end();
    },

    "//- can comment on status updates": function (done) {
        this.timeout = 25000;
        createRobot(done)  
            .loginNewUser()
            .setStatus("Hello, #unhosted world!")
            .statusUpdate(1, assEq("Hello, #unhosted world!"))
            .addComment(1, "Hello to you!")
            .comment(1, 1, assEq("Hello to you!"))
        .end();
    },

    
    "//- can let user add, list and remove friends": function (done) {
        this.timeout = 25000;
        
        createTestUser().then(function(userToBeAdded) {
            var username = userToBeAdded.username;
            createRobot(done)
               .loginNewUser()
               .selectFriendsInMenu()
               .noFriendsMessage(assEq(NO_FRIENDS_MESSAGE))
               .addFriend(username)
               .friend(1, assEq(username))
               .addFriend(username)
               .pause(500)
               .errorMessage(assEq("Cannot add the same user twice"))
               .removeFriend(1)
               .noFriendsMessage(assEq(NO_FRIENDS_MESSAGE))
               .refresh()
               .noFriendsMessage(assEq(NO_FRIENDS_MESSAGE))
           .end();
        });
        
    },

    "- can let user see friends messages": function (done) {
        this.timeout = 25000;

        var waitForUserAddingStatus = when.defer();
        
        var b1 = createRobot(waitForUserAddingStatus.resolve)
            .loginNewUser()
            .setStatus("The message of the added")
            .statusUpdate(1, assEq("The message of the added"))
            .pause(5000)
            .logout()
        .end();
        
        waitForUserAddingStatus.promise.then(function() {
            b1.user.promise.then(function(user) {
                createRobot(done).loginNewUser()
                    .selectFriendsInMenu()
                    .addFriend(user.username)
                    .pause(5000)
                    .selectStatusesInMenu()
                    .statusUpdate(1, assEq("The message of the added"))
                    .statusGetUsername(1, assEq(user.username))
                    .setStatus("The message of the adder")
                    .statusUpdate(1, assEq("The message of the adder"))
                    .statusUpdate(2, assEq("The message of the added"))
                .end();
            });
        });
    },

    "//- keeps login status on refresh": function (done) {
        this.timeout = 25000;
        
        createRobot(done).loginNewUser()
            .setStatus("Hello, #unhosted world!")
            .refresh()
            .statusUpdate(1, assEq("Hello, #unhosted world!"))
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
            .statusUpdate(1, assEq("Second status"))
            .statusUpdate(2, assEq("First status"))
            .addComment(2, "Comment that puts status on top!")
            .refreshStatuses()
            .statusUpdate(1, assEq("First status"))
        .end();               
    },

})

