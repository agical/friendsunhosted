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

function createNewUser(username, password, cb) {
  var options = {
    host: 'localhost',
    port: 80,
    path: '/create_user/' + username + "/" + password
  };

  http.get(options, function(res) {
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
        var deferred = when.defer();
        
        
        
        createNewUser("genUser" + new Date().getTime().toString(), "1234568", function(err,user) {
          if(err) {assert.fail(err); return;}
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
              deferred.resolve(this.window(popupWindow)
                .waitFor('input[name="password"]', 500, function(){}) 
                .setValue('input[name="password"]', user.password)
                .submitForm("form")
                .windowHandles(function(data){
                    var originalWindow = data.value[0];
                    this.window(originalWindow)
                      .cssEq("#welcome", "Welcome, " + user.username + "!")
                }));
            });
        });
        
        deferred.promise.when(function(b) {b.end(done);});
    },
    
    
    /*
    */
})

