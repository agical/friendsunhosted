(function siterobot() {   
    var val = {};

    var http = require("http");
    var webdriverjs = require("webdriverjs");
    var when = require("when");

    
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
    
    function createTestUser() {
      return createNewUser("genUser" + new Date().getTime(), "1234568");
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
    
    var createRobot = function(done) {
        var fu = {};
        fu.b = createTestBrowser(done).init();
        fu.user = null;
        fu.lastFn = null;
        
        var defPush = function() {
            fu.lastFn = when.defer();
            return fu.lastFn;
        };
    
        var defPeek = function() {
            return fu.lastFn;
        };
        
        var text = function(css, cb) {
            var last = defPeek();
            var d = defPush();
            last.promise.then(function() {
                fu.b
                    .waitFor(css, 1000) 
                    .getText(css, function(v) {
                        cb(v.value);
                        d.resolve();
                    });
            });
    
            return fu;
        };
        
        var userAndText = function(css, user_text_cb) {
            var last = defPeek();
            var d = defPush();
            last.promise.then(function() {
                fu.user.then(function(user) {
                    fu.b.getText(css, function(t) {
                        user_text_cb(user)(t.value);
                        d.resolve();
                    });
                });
            });
            return fu;
        };
    
        var setAndClick = function(setCss, val, clickCss) {
            var last = defPeek();
            var d = defPush();
            last.promise.then(function() {
                fu.b
                    .setValue(setCss, val)
                    .click(clickCss, d.resolve);
            });   
            return fu;
        };
        
        var click = function(clickCss) {
            var last = defPeek();
            var d = defPush();
            last.promise.then(function() {
                fu.b.click(clickCss, d.resolve);
            });   
            return fu;
        };
        
        var isVisible = function(css, element_cb) {
            var last = defPeek();
            var d = defPush();
            last.promise.then(function() {
                console.log(fu.b);
                fu.b
                    .waitFor(css, 1000) 
                    .isVisible(css, function(visible) {
                        element_cb(visible);
                        d.resolve();
                    });
            });   
            return fu;
        };
        
    
        fu.openStartPage = function() {
            var d = defPush();
            fu.b.url("http://localhost:8000/", function() {
                d.resolve();
            });
            return fu;
        };
        
        fu.loginNewUser = function() {
            var d = defPush();
            
            fu.user = when.defer();
            createTestUser()
                .then(function(user) {
                    fu.user.resolve(user);                
                });
            fu.user.promise.then(function(user)  {
                fu.b
                    .url("http://localhost:8000/")
                    .setValue("#username", user.username)
                    .click("#do-login")
                    .waitFor('input[name="password"]', 500) 
                    .setValue('input[name="password"]', user.password)
                    .submitForm("form", function() {
                        d.resolve(
                                {browser: fu.b,
                                loggedInUser: user});
                    });
            });
            return fu;
        };
        fu.title = function(title_cb) {
            var last = defPeek();
            var d = defPush();
            last.promise.then(function() {
                fu.b.getTitle(function(t) { 
                    title_cb(t);
                    d.resolve();
                });
            });
            return fu;
        };
        
            
        fu.welcomeHeadline = function(text_cb) {
            return text('#page-welcome h3', text_cb);
        };
    
        fu.welcomeMessage = function(userFn_message_cb) {
            return userAndText('#welcome-message', userFn_message_cb);
        };
        
        fu.setStatus = function(status) {
            return setAndClick("#status-update", status, "#do-update-status");
        };
        
        fu.statusUpdate = function(nr, text_cb) {
            return text("#status-stream :first-child .status-update", text_cb);
        };
    
        fu.statusUsername = function(nr, userFn_text_cb) {
            return userAndText('#status-stream :first-child .status-update-username', userFn_text_cb);
        };
    
        fu.statusTimeStamp = function(nr, text_cb) {
            return text("#status-stream :first-child .status-update-timestamp", text_cb);
        };
    
        fu.addComment = function(statusNr, comment) {
            return setAndClick("#status-stream :first-child .comment", comment, "#status-stream :first-child .do-comment");
        };
    
        fu.comment = function(statusNr, commentNr, text_cb) {
            return text("#status-stream :first-child .comments .comment-update", text_cb);
        };
    
        fu.selectFriendsInMenu = function() {
            return click("#menu-myfriends");
        };
        
        fu.noFriendsMessage = function(text_cb) {
            return text("#no-friends-message", text_cb);
        };
        
        fu.addFriend = function(user) {
            return setAndClick("#add-friends-username", user.username, "#do-add-friend");
        };
        
        fu.friend = function(nr, text_cb) {
            return text("#friends :first-child .friend", text_cb);
        }
        
        fu.removeFriend = function(nr) {
            return click("#friends :first-child .remove-friend");
        };
        
        fu.errorMessage = function(text_cb) {
            return text("#error-message", text_cb);
        };
        
        fu.refresh = function() {
            var last = defPeek();
            var d = defPush();
            last.promise.then(function() {
                fu.b.refresh(d.resolve);
            });
            return fu;
        };
        
        fu.logout = function() {
            return click("#do-logout");
        };
        
        fu.visibleLoginBox = function(element_cb) {
            return isVisible("#username", element_cb); 
        }; 
        
        fu.end = function() {
            defPeek().then(function() {
                fu.b.end(done);
            });
            return fu;
        };
        
        return fu;
    };
    
    exports.createRobot = createRobot;
    exports.createTestUser = createTestUser;

})();