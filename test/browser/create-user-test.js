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
                      client.end();
                      done();
                    };
  buster.testRunner.on('test:failure', endAndDone );
  buster.testRunner.on('test:error', endAndDone );
  buster.testRunner.on('uncaughtException', endAndDone );
  
  client.cssEq = function(cssSelector, expected) {
    return client.getText(cssSelector, function(val) {assert.equals(expected, val.value)});
  };
  return client;
}

function loginCreatedUser(done) {
  var whenBrowser = when.defer();
  
  createNewUser("genUser" + new Date().getTime().toString(), "1234568").then(function(user) {
    var browser = createTestBrowser(done);
    browser
      .init()
      .url("http://localhost:8000/")
      .setValue("#username", user.username)
      .click("#do-login")
      .pause(100)
      .windowHandles(function(data){
        var popupWindow = data.value[1];
        console.log("popupWindow is", popupWindow);
        this.window(popupWindow)
          .waitFor('input[name="password"]', 500, function(){}) 
          .setValue('input[name="password"]', user.password)
          .submitForm("form")
          .windowHandles(function(data){
              var originalWindow = data.value[0];
              whenBrowser.resolve(
                {browser: this.window(originalWindow),
                 loggedInUser: user});
          })});
      }, function(err){assert.fail(err);});
  return whenBrowser.promise;
}

function createNewUser(username, password, cb) {
  var options = {
    host: 'localhost',
    port: 80,
    path: '/create_user/' + username + "/" + password
  };
  var deferred = when.defer();
  
  http.get(options, function(res) {
    deferred.resolve(
      {username: username + "@" + options.host,
       password: password });
  }).on('error', function(e) {
      deferred.reject(e);
  });
    
  return deferred.promise;
}

  buster.testCase("Site", {
    "has a title": function (done) {
        this.timeout = 5000;
        
        createTestBrowser(done)
          .init()
          .url("http://localhost:8000/")
          .getTitle(function(title) { 
              assert.equals('Teh Frens', title); 
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
    
    "can add status updates": function (done) {
        this.timeout = 25000;
         
        loginCreatedUser(done).then(function(browserAndUser) {
          browserAndUser
            .browser
              .setValue("#status-update", "Hello, #unhosted world!")
              .click("#do-update-status")
              .cssEq("#status-stream :first-child", "Hello, #unhosted world!")
              .setValue("#status-update", "Second message")
              .click("#do-update-status")
              .cssEq("#status-stream :first-child", "Second message")
              .end(done);
        });
    },

    "can add friend": function (done) {
        this.timeout = 25000;
         
        loginCreatedUser(done).then(function(browserAndUser) {
          browserAndUser
            .browser
              .setValue("#status-update", "Hello, #unhosted world!")
              .click("#do-update-status")
              .cssEq("#status-stream :first-child", "Hello, #unhosted world!")
              .setValue("#status-update", "Second message")
              .click("#do-update-status")
              .cssEq("#status-stream :first-child", "Second message")
              .end(done);
        });
    },


    
    /*
    */
})

