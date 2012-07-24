var buster = require("buster");
var http = require("http");
var webdriverjs = require("webdriverjs");
var when = require("when");

var siterobot = require("./siterobot");
var createRobot = siterobot.createRobot;
var createTestUser = siterobot.createTestUser;


var assert = buster.assertions.assert;

function createChromeDriver() {
  return webdriverjs.remote({desiredCapabilities:{
    browserName:"chrome", 
    seleniumProtocol: 'WebDriver',
    'chrome.switches': ['--start-maximized','--disable-popup-blocking']}});
}

function createFirefoxDriver() {
  return webdriverjs.remote({desiredCapabilities:{
    browserName:"firefox", 
    seleniumProtocol: 'WebDriver',
  }});
}

function createTestBrowser(done) {
  var client = createChromeDriver();

  var endAndDone =  function(error) {
                      console.log("Exiting browsers");
                      client.end();
                      done();
                    };
  buster.testRunner.on('test:failure', endAndDone );
  buster.testRunner.on('test:error', endAndDone );
  buster.testRunner.on('test:timeout', endAndDone );
  buster.testRunner.on('uncaughtException', endAndDone );
  
  client.cssEq = function(cssSelector, expected) {
    return client.getText(cssSelector, function(val) {assert.equals(val.value, expected);});
  };
  client.cssCondition = function(cssSelector, condition) {
    return client.getText(cssSelector, function(val) {condition(val.value);});
  };
  client.cssAssert = function(func, cssSelector, condition) {
    return client[func](cssSelector, function(val) {console.log(val);condition(val);});
  };
  return client;
}

function loginCreatedUser(done) {
  var whenBrowser = when.defer();
  
  createTestUser()
    .then(function(user) {
      var browser = createTestBrowser(done);
      browser
        .init()
        .url("http://localhost:8000/")
        .setValue("#username", user.username)
        .click("#do-login")
        .pause(100)
        .windowHandles(function(data) {
          var popupWindow = data.value[1];
          console.log("popupWindow is", popupWindow);
          this.window(popupWindow)
            .waitFor('input[name="password"]', 500) 
            .setValue('input[name="password"]', user.password)
            .submitForm("form")
            .windowHandles(function(data){
                var originalWindow = data.value[0];
                whenBrowser.resolve(
                  {browser: this.window(originalWindow),
                   loggedInUser: user});
            });
          });
    }, assert.fail);
  return whenBrowser.promise;
}



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
           createRobot(done)
               .loginNewUser()
               .selectFriendsInMenu()
               .noFriendsMessage(assEq(NO_FRIENDS_MESSAGE))
               .addFriend(userToBeAdded)
               .friend(1, assEq(userToBeAdded.username))
               .addFriend(userToBeAdded)
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
        
        var b1 = createRobot(function() {waitForUserAddingStatus.resolve();})
            .loginNewUser()
            .setStatus("The message of the added")
            .statusUpdate(1, assEq("The message of the added"))
            .logout()
        .end();
        
        waitForUserAddingStatus.promise.then(function() {
            b1.user.promise.then(function(user) {
                createRobot(done).loginNewUser()
                    .selectFriendsInMenu()
                    .addFriend(user.username)
                    .selectStatusesInMenu()
                    .statusUpdate(1, assEq("The message of the added"))
                    .statusGetUsername(1, assEq(user.username))
                    .setStatus("The message of the adder")
                    .statusUpdate(1, assEq("The message of the adder"))
                    .statusUpdate(2, assEq("The message of the added"))
                .end();
            });
        });
        /*
        loginCreatedUser(done)
          .then(function(browserAndUser) {
            userToBeAdded = browserAndUser.loggedInUser;
            browserAndUser
              .browser
                .setValue("#status-update", "The message of the added")
                .click("#do-update-status")
                .cssEq("#status-stream :first-child .status-update", "The message of the added")
                .end();
          })
          .then(function() {
            loginCreatedUser(done)
              .then(function(browserAndUser) {
                  browserAndUser
                    .browser
                      .waitFor("#menu-myfriends", 2000)
                      .click("#menu-myfriends")
                      .setValue("#add-friends-username", userToBeAdded.username)
                      .click("#do-add-friend")
                      .waitFor("#menu-status", 2000)
                      .click("#menu-status")
                      .cssEq("#status-stream :first-child .status-update", "The message of the added")
                      .setValue("#status-update", "The message of the adder")
                      .click("#do-update-status")
                      .cssEq("#status-stream :first-child .status-update", "The message of the adder")
                      .cssEq("#status-stream :nth-child(2) .status-update", "The message of the added")
                      .end(done);
              });
            });
            */
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

