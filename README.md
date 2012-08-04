FRIENDS#UNHOSTED repository
=======

# Own your network! 

FRIENDS#UNHOSTED is a new type of social network site where you own your network and uploads, not the site. 

It is based on unhosted http://unhosted.org/ technology.

The code is licenced under Creative Commons Attribution-ShareAlike 3.0 Unported License http://creativecommons.org/licenses/by-sa/3.0/

# Install

## FRIENDS#UNHOSTED

Clone or fork from git (this repo).

## Node

Install node: http://nodejs.org/#download

## Javascript dependencies

Install the javascript dependencies in install_ubuntu.sh. 
(or verify that they work in other operating systems and add a script for that)
(there is a trick about installing buster that I don't remember...)

# To run the tests

## Install redis database
sudo apt-get install redis-server

## Get a local storage (express-storage):

This storage uses redis.

Clone or fork https://github.com/michielbdejong/express-storage
I have changed two things (I know, I should fork it instead :-P):

```
diff --git a/config.js b/config.js
index ede5f8c..0df9e33 100644
--- a/config.js
+++ b/config.js
@@ -3,5 +3,5 @@ exports.config = {
   redisPort: (process.env.ES_REDIS_PORT === undefined ? 6379 : process.env.ES_REDIS_PORT),
   redisPwd:  (process.env.ES_REDIS_PWD  === undefined ? '' : process.env.ES_REDIS_PWD),
   host:      (process.env.ES_HOST       === undefined ? 'localhost' : process.env.ES_HOST),
-  port:      (process.env.ES_PORT       === undefined ? 4000 : process.env.ES_PORT)
+  port:      (process.env.ES_PORT       === undefined ? 80 : process.env.ES_PORT)
 };
diff --git a/server.js b/server.js
index 74f38bd..916a290 100644
--- a/server.js
+++ b/server.js
@@ -77,9 +77,10 @@ app.post(/^\/_oauth\/(?:(.+))/, function(req, res){
     });
 });
 
-app.get("/create_test_user", function(req, res){
-  storage.addUser('jimmy@'+config.host, '12345678', function(){});
-  res.send("User created");
+app.get("/create_user/:host/:user/:password", function(req, res){
+  storage.addUser(req.params.user + '@' + req.params.host, req.params.password, function(result){
+    res.send(result);  
+  });
 });
```

Then run express-storage with (in express-storage root): 

`sudo node server.js`

## Start selenium standalone server
(in start_servers.sh)

Download chromedriver if you want to test in chrome:
http://code.google.com/p/chromedriver/downloads/list

`java -jar node_modules/selenium/lib/runner/selenium-server-standalone-2.20.0.jar -log logs/seleniumserver.log -Dwebdriver.chrome.bin="/opt/google/chrome/google-chrome" -Dwebdriver.chrome.driver="/path/to/chromedriver" &`

You probably have to change the path to chrome and chromedriver. 

## Start buster unit test server
(also in start_servers.sh)

`buster server &`

Check the url shown in the logs, typically http://localhost:1111, and surf there with any and all the browsers 
you want to run the unit tests on, and register your browser.

## Start an http server for serving the F#U site
(also in start_servers.sh)

If you have python 2.x

```
cd site/
python -m SimpleHTTPServer > ../logs/httpserver.log &
cd -
```

Otherwise, serve the site folder, the actual F#U site form this repo, from IIS, apache or whatever makes your skirt blow. 

## Actually run the tests

`buster test`

If you only want to run the unit tests:

`buster test --browser`

If you only want to run the selenium tests:

`buster test --node`


# Develop

## Architecture-ish description

`index.html` contains all html and the knockoutjs templates.

`main.js` contains all presentation related javascript, including kncockout and jquery.

`friendsUnhostedApi.js` is the api that `main.js` uses to talk to the remote storage.

`remoteAdapter.js` is a wrapper for `remoteStorage.js` based on https://raw.github.com/cujojs/when

`remoteStorage.js` is the "official" unhosted library to use

`css`, `img` you can probably figure out. 

`development-bundle` is jquery-ui. Maybe we should try to get rid of it, we're not using it extensively, if at all.

## Tests

In `browser` resides the functional test that are run in a browser using selenium and webdriverjs from busterjs

In `unit` resides the unit tests that are run in all registered browsers in busterjs.

If this sounds corny, read up on BusterJS (http://busterjs.org/). :-)

