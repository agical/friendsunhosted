var buster = require("buster");
var webdriverjs = require("webdriverjs");

var assert = buster.assertions.assert;

function createTestBrowser(done) {
  var client = webdriverjs.remote({desiredCapabilities:{
    browserName:"chrome", 
    seleniumProtocol: 'WebDriver',
    'chrome.switches': ['--start-maximized',]}});

  var endAndDone =  function(error) {
                      client.end();
                      done();
                    };
  buster.testRunner.on('test:failure', endAndDone );
  buster.testRunner.on('test:error', endAndDone );
  buster.testRunner.on('uncaughtException', endAndDone );
  
  return client;
}

function createNewUser(basename, password) {
  return {username: basename + new Date().getTime().toString(),
          password: password };
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
        this.timeout = 5000;
        var user = createNewUser("genUser", "1234568");
        createTestBrowser(done)
          .init()
          .url("http://localhost:8000/")
          .setValue("#username", user.username)
          .setValue("#password", user.password)
          .click("#do-login")
          .tests.cssPropertyEquals("#welcome", "", "Welcome, " + user.username + "!", "Logged in message correct")
          .end(done); 
        assert(true);
    },
    /*
    */
})

