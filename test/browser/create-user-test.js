var buster = require("buster");
var http = require("http");
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
  
  client.cssEq = function(cssSelector, expected) {
    return client.getText(cssSelector, function(val) {assert.equals(expected, val.value)});
  };
  return client;
}

function createNewUser(username, password, cb) {
  console.log(http.get);
  var options = {
    host: 'localhost',
    port: 80,
    path: '/create_user/' + username + "/" + password
  };

  http.get(options, function(res) {
    console.log("Got response: ", res);
    cb(null, {username: username + "@" + options.host,
          password: password });
  }).on('error', function(e) {
    console.log("Got error: ", e);
    cb(e);
  });  
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
        createNewUser("genUser" + new Date().getTime().toString(), "1234568", function(err,user) {
          if(err) {assert.fail(err); return;}
          createTestBrowser(done)
            .init()
            .pause(500, function(){})
            .url("http://localhost:8000/")
            .pause(500, function(){})
            .setValue("#username", user.username)
            .pause(500, function(){})
            .click("#do-login") 
            .pause(500, function(){})
            .waitFor('input[type=password]', 500, function(){}) 
            .pause(500, function(){})
            .setValue('input[type=password]', user.password)
            .pause(500, function(){})
            .submitForm("form") 
            .pause(500, function(){})
            .cssEq("#welcome", "Welcome, " + user.username + "!")
            .pause(500, function(){})
            .end(done); 
        });
    },
    
    
    /*
    */
})

