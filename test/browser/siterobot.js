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
        var driver = webdriverjs.remote({
            host:"localhost",
            port: 4444,
            desiredCapabilities:{browserName:"firefox", version:"14"},
        });
        return driver;
    }
    
    function createTestBrowser(done) {
      var client = createFirefoxDriver();
    
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
      return createNewUser("genUser" + new Date().getTime() + '@localhost', "1234568");
    }
    
    
    function createNewUser(username, password, cb) {
        var userSplit = username.split('@');
      var options = {
        host: 'localhost',
        port: 80,
        path: '/create_user/' + userSplit[1] + '/' +  userSplit[0] + '/' + password
      };
      var deferred = when.defer();
      
      http.get(options, function(res) {
        deferred.resolve(
          {username: username,
           password: password });
      })
      .on('error', deferred.reject);
        
      return deferred.promise;
    }
    
    var store = function() {
        var ret = {};
        var redisClient=require('redis').createClient(6379, 'localhost');
        redisClient.on("error", console.log);
        redisClient.auth('');
        
        ret.setRaw = function(key, value) {
            var result = when.defer();
            redisClient.set(key,
                    JSON.stringify(value),
                    function(err, data) {
                        if(err) {result.reject(err);}
                        else {result.resolve({'data':data,'store':ret});}
                    });
            return result.promise;
        };

        ret.setValue = function(username, category, key, value) {
            return ret.setRaw('value:' + username + ':' + category + ':' + key, value);
        };

        ret.getRaw = function(key) {
            var result = when.defer();
            redisClient.get(key,
                    function(err, data) {
                        if(err) {result.reject(err);}
                        else {result.resolve({'data':data,'store':ret});}
                    });
            return result.promise;
        };

        ret.getValue = function(username, category, key) {
            return ret.getRaw('value:' + username + ':' + category + ':' + key);
        };

        return ret;
    };

    
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
                    .pause(500)
                    .waitFor(css, 2000) 
                    .isVisible(css)
                    .getText(css, function(v) {
                        if(v.value) {
                            cb(v.value);
                            d.resolve();
                        } else {
                            console.log("Value is undefined for ", css, "Was", v);
                            d.reject("Value is undefined for " + css);
                        }
                    });
            }, onError);
    
            return fu;
        };

        var source = function(cb) {
            var last = defPeek();
            var d = defPush();
            last.promise.then(function() {
                fu.b.getSource(function(v) {
                            cb(v);
                            d.resolve();
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
                        .pause(200)
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
                    .pause(200)
                   .waitFor(setCss, 2000) 
                    .setValue(setCss, " ")
                    .clearElement(setCss)
                    .setValue(setCss, val)
                    .waitFor(clickCss, 2000) 
                    .click(clickCss, d.resolve);
            });   
            return fu;
        };
        
        var click = function(clickCss) {
            var last = defPeek();
            var d = defPush();
            last.promise.then(function() {
                fu.b
                    .pause(200)
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
                    .pause(200)
                    .waitFor(css, 2000) 
                    .isVisible(css, function(visible) {
                        element_cb(!visible.value && visible);
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
                .url("http://localhost:8000/");

            fu.b.waitFor('#footer', 5000, function() {
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
                    .pause(200)
                    .waitFor("#username", 2000)
                    .setValue("#username", " ")
                    .clearElement("#username")
                    .setValue("#username", user.username)
                    .waitFor("#username", 2000)
                    .click("#do-login")
//                    .pause(200)
//                    .waitFor('input[name="password"]', 500) 
//                    .setValue('input[name="password"]', user.password)
                    .pause(200)
                    .waitFor('input[value="Allow"]', 500) 
                    .click('input[value="Allow"]', function() {
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
                fu.b
                    .getTitle(function(t) { 
                    title_cb(t);
                    d.resolve();
                });
            });
            return fu;
        };
            
        fu.welcomeHeadline = function(text_cb) {
            return text('#info-what-is h3', text_cb);
        };
    
        fu.welcomeMessage = function(userFn_message_cb) {
            return userAndText('#welcome-message', userFn_message_cb);
        };
        
        fu.loggedInUser = function(user_cb) {
            return userAndText('#username', user_cb);
        };
        
        fu.setStatus = function(status) {
            return setAndClick("#status-update", status, "#do-update-status");
        };
        
        fu.statusUpdate = function(nr, text_cb) {
            return text('#status-nr-' + nr + ' .status-update', text_cb);
        };

        fu.isStatusVisible = function(nr, visible_cb) {
            return isVisible('#status-nr-' + nr + ' .status-update', visible_cb);
        };
        
        fu.getMoreUpdates = function() {
            return click('#do-get-more-updates');
        }

        fu.pageSource = function(text_cb) {
            return source(text_cb);
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

        fu.threadParticipants = function(nr, array_cb) {
            return text('#status-nr-' + nr + ' .participants', function(text){array_cb(text.split(' '));});
        };

        fu.collapseStatus = function(nr) {
            return click('#status-nr-' + nr + ' .do-collapse-status');
        };
    
        fu.expandStatus = function(nr) {
            return click('#status-nr-' + nr + ' .do-expand-status');
        };
    
        fu.addComment = function(statusNr, comment) {
            return setAndClick('#status-nr-' + statusNr + ' textarea', comment, '#status-nr-' + statusNr + ' .do-comment');
        };
    
        fu.comment = function(statusNr, commentNr, text_cb) {
            return text('#comment-nr-' + commentNr + '-on-status-' + statusNr + ' .comment-update', text_cb);
        };
    
        fu.collapseComment = function(statusNr, commentNr) {
            return click('#comment-nr-' + commentNr + '-on-status-' + statusNr + ' .do-collapse-comment');
        };

        fu.expandComment = function(statusNr, commentNr) {
            return click('#comment-nr-' + commentNr + '-on-status-' + statusNr + ' .do-expand-comment');
        };
        
        fu.commentVisible = function(statusNr, commentNr, visible_cb) {
            return isVisible('#comment-nr-' + commentNr + '-on-status-' + statusNr + ' .comment-update', visible_cb);
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
            return text("#friend-" + nr + " .friend", text_cb);
        };
        
        fu.friendsFriend = function(friendNr, friendsFriendNr, text_cb) {
            return text("#friend-of-" + friendNr + "-nr-" + friendsFriendNr + " .storage-id", text_cb);            
        };
        
        fu.addFriendsFriendDirectly = function(friendNr, friendsFriendNr) {
            return click("#friend-of-" + friendNr + "-nr-" + friendsFriendNr + " .add-friends-friend");
        };
        
        fu.removeFriend = function(nr) {
            return click("#friend-" + nr + " .remove-friend");
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
            var last = defPeek();
            var d = defPush();
            last.promise.then(function() {
                fu.b.click("#refresh-link").pause(200).waitFor(2000, "#footer", d.resolve);
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
                fu.b.end(function(){done(fu);});
            });
            return fu;
        };
        
        return fu;
    };
    
    exports.createRobot = createRobot;
    exports.createTestUser = createTestUser;
    exports.store = store;

})();