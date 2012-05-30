var buster = require("buster");
var webdriverjs = require("webdriverjs");

var assert = buster.assertions.assert;

function createClient(done) {
  var client = webdriverjs.remote();
  var endAndDone =  function(error) {
                      client.end();
                      done();
                    };
  buster.testRunner.on('test:failure', endAndDone );
  buster.testRunner.on('test:error', endAndDone );
  buster.testRunner.on('uncaughtException', endAndDone );
  
  return client;
}

buster.testCase("Site", {
    "has a header": function (done) {
        this.timeout = 5000;
        createClient()
          .init()
          .url("http://localhost:8000/")
          .getTitle(function(title) { 
              assert.equals('Teh Frens', title); 
          })
          .end(done); 
    },    
})

