var buster = require("buster");
var http = require("http");
var webdriverjs = require("webdriverjs");
var when = require("when");

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
    return client.getText(cssSelector, function(val) {assert.equals(expected, val.value)});
  };
  return client;
}

function createTestUser() {
  return createNewUser("genUser" + new Date().getTime(), "1234568");
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
            })});
    }, assert.fail);
  return whenBrowser.promise;
}

function createNewUser(username, password, cb) {
  var options = {
    host: 'localhost',
    port: 80,
    path: '/create_user/localhost/' +  username + "/" + password
  };
  var deferred = when.defer();
  
  http.get(options, function(res) {
    deferred.resolve(
      {username: username + "@" + options.host,
       password: password });
  })
  .on('error', deferred.reject);
    
  return deferred.promise;
}

  buster.testCase("Friends#Unhosted", {
    "has a title": function (done) {
        this.timeout = 5000;
        
        createTestBrowser(done)
          .init()
          .url("http://localhost:8000/")
          .getTitle(function(title) { 
              assert.equals('FRIENDS#UNHOSTED - the #unhosted friends network', title); 
          })
          .end(done); 
    },
    
    "can login a user": function (done) {
        this.timeout = 25000;
         
        loginCreatedUser(done).then(function(browserAndUser) {
          browserAndUser
            .browser
              .cssEq("#welcome", "Welcome, " + browserAndUser.loggedInUser.username + "!")
              .end(done);
        });
    },
    
    "can let user add status updates": function (done) {
        this.timeout = 25000;
         
        loginCreatedUser(done).then(function(browserAndUser) {
          browserAndUser
            .browser
              .setValue("#status-update", "Hello, #unhosted world!")
              .click("#do-update-status")
              .cssEq("#status-stream :first-child .status-update", "Hello, #unhosted world!")
              .cssEq("#status-stream :first-child .status-update-username", browserAndUser.loggedInUser.username)
              .setValue("#status-update", "Second message")
              .click("#do-update-status")
              .cssEq("#status-stream :first-child .status-update", "Second message")
              .cssEq("#status-stream :first-child .status-update-username", browserAndUser.loggedInUser.username)
              .end(done);
        });
    },
    
    "can let user add and list friends": function (done) {
        this.timeout = 25000;
        createTestUser()
          .then(function(userToBeAdded) {
            loginCreatedUser(done)
              .then(function(browserAndUser) {
                console.log("Adder:", browserAndUser.loggedInUser);
                console.log("Added:", userToBeAdded);
                browserAndUser
                  .browser
                    .setValue("#add-friends-username", userToBeAdded.username)
                    .click("#do-add-friend")
                    .cssEq("#friends :first-child", userToBeAdded.username)
                    .setValue("#add-friends-username", userToBeAdded.username)
                    .click("#do-add-friend")
                    .cssEq("#friends :first-child", userToBeAdded.username)
                    .cssEq("#friends :nth-child(2)", undefined)
                    .end(done);
              });
            });
    },

    "can let user see friends messages": function (done) {
        this.timeout = 25000;
        var userToBeAdded;
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
                      .setValue("#add-friends-username", userToBeAdded.username)
                      .click("#do-add-friend")
                      .cssEq("#status-stream :first-child .status-update", "The message of the added")
                      .setValue("#status-update", "The message of the adder")
                      .click("#do-update-status")
                      .cssEq("#status-stream :first-child .status-update", "The message of the adder")
                      .cssEq("#status-stream :nth-child(2) .status-update", "The message of the added")
                      .end(done);
              });
            });
    },

    "keeps login status on refresh": function (done) {
        this.timeout = 25000;
        loginCreatedUser(done).then(function(browserAndUser) {
          browserAndUser
            .browser
              .setValue("#status-update", "Hello, #unhosted world!")
              .click("#do-update-status")
              .cssEq("#status-stream :first-child .status-update", "Hello, #unhosted world!")
              .cssEq("#status-stream :first-child .status-update-username", browserAndUser.loggedInUser.username)
              .refresh()
              .waitFor("#status-stream :first-child .status-update", 2000)
              .cssEq("#status-stream :first-child .status-update", "Hello, #unhosted world!")
              .cssEq("#status-stream :first-child .status-update-username", browserAndUser.loggedInUser.username)
              .end(done);
        });
    },

})

