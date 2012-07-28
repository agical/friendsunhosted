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
        return client[func](cssSelector, function(val) {condition(val);});
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
    
    var createRobot = function(done) {
        var fu = {};

        var onError = function(err) {
            console.log("============ Error:\n", err);
            fu.end();
        };
        

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
                    .waitFor(css, 2000, function() {
                        console.log("About to get ", css);
                    }) 
                    .getText(css, function(v) {
                        if(v.value) {
                            cb(v.value);
                            d.resolve();
                        } else {
                            console.log("Value is undefined for " + css);
                            d.reject("Value is undefined for " + css);
                        }
                    });
            }, onError);
    
            return fu;
        };
        
        var userAndText = function(css, user_text_cb) {
            var last = defPeek();
            var d = defPush();
            last.promise.then(function() {
                fu.user.promise.then(function(user) {
                    fu.b
                        .waitFor(css, 2000) 
                        .getText(css, function(t) {
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
                    .waitFor(setCss, 2000) 
                    .setValue(setCss, val)
                    .click(clickCss, d.resolve);
            });   
            return fu;
        };
        
        var click = function(clickCss) {
            var last = defPeek();
            var d = defPush();
            last.promise.then(function() {
                fu.b
                    .waitFor(clickCss, 2000) 
                    .click(clickCss, d.resolve);
            });   
            return fu;
        };
        
        var isVisible = function(css, element_cb) {
            var last = defPeek();
            var d = defPush();
            last.promise.then(function() {
                fu.b
                    .waitFor(css, 2000) 
                    .isVisible(css, function(visible) {
                        element_cb(visible);
                        d.resolve();
                    });
            });   
            return fu;
        };
    
        fu.debug = function(cb) {
            cb("On setup", fu);
            var last = defPeek();
            var d = defPush();
            last.promise.then(function() {
                cb("In execution", fu);
                d.resolve();
            });
            cb("After setup", fu);
    
            return fu;
        };
        
        fu.pause = function(millis) {
            var last = defPeek();
            var d = defPush();
            last.promise.then(function() {
                fu.b.pause(millis, d.resolve);
            });
    
            return fu;
            
        };
    
        fu.openStartPage = function() {
            var d = defPush();
            fu.b
                .url("http://localhost:8000/")
                .waitFor('body', 5000, function() {
                    d.resolve();
                });
            return fu;
        };
        
        fu.loginNewUser = function() {
            var d = defPush();
            
            fu.user = when.defer();
            
            
            createTestUser().then(function(user) {
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
            return text('#status-nr-' + nr + ' .status-update', text_cb);
        };
    
        fu.statusUsername = function(nr, userFn_text_cb) {
            return userAndText('#status-nr-' + nr + ' .status-update-username', userFn_text_cb);
        };

        fu.statusGetUsername = function(nr, text_cb) {
            return text('#status-nr-' + nr + ' .status-update-username', text_cb);
        };

        fu.statusTimeStamp = function(nr, text_cb) {
            return text('#status-nr-' + nr + ' .status-update-timestamp', text_cb);
        };
    
        fu.addComment = function(statusNr, comment) {
            return setAndClick('#status-nr-' + statusNr + ' .comment', comment, '#status-nr-' + statusNr + ' .do-comment');
        };
    
        fu.comment = function(statusNr, commentNr, text_cb) {
            return text('#comment-nr-' + commentNr + '-on-status-' + statusNr + ' .comment-update', text_cb);
        };
    
        fu.selectFriendsInMenu = function() {
            var r = click("#menu-myfriends");
            return r;
        };

        fu.selectStatusesInMenu = function() {
            return click("#menu-status");
        };
        
        fu.noFriendsMessage = function(text_cb) {
            return text("#no-friends-message", text_cb);
        };
        
        fu.addFriend = function(username) {
            var r = setAndClick("#add-friends-username", username, "#do-add-friend"); 
            return r;
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
        
        fu.refreshStatuses = function() {
            return click("#refresh-link");
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