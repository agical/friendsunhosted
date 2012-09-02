FRIENDS#UNHOSTED repository
=======

# Own your network! 

FRIENDS#UNHOSTED is a new type of social network site where you own your network and uploads, not the site. 

It is based on unhosted http://unhosted.org/ technology.

The code is licensed under the AGPLv3 license (http://opensource.org/licenses/AGPL-3.0).

# Install

## FRIENDS#UNHOSTED

Clone or fork from git (this repo).

# To run the tests

## Node

Install node: http://nodejs.org/#download

## Javascript dependencies

Install the javascript dependencies via `npm install`

Maybe you still need to `sudo npm install --global buster`

## Install redis database
sudo apt-get install redis-server

## Get a local storage (express-storage):

This storage uses redis.

Clone or fork https://github.com/agical/express-storage:

`git clone https://github.com/agical/express-storage.git`

Copy config file to parent dir:

`cp copy_to_parent_dir_as_config.js ../config.js`

Then run express-storage with (in express-storage root): 

`sudo node server.js`

This should start a remote storage on port 80.

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

## Tests

In `browser` resides the functional test that are run in a browser using selenium and webdriverjs from busterjs

In `unit` resides the unit tests that are run in all registered browsers in busterjs.

If this sounds corny, read up on BusterJS (http://busterjs.org/). :-)

## Code formatting

In the root, run 

`node format.js <file1> <file2> ... <fileN>`

Works for js, html and css. 

NOTE: We have not started using this in the files. Test it and git reset --hard. 
Soon, very soon, it will be mandatory.


