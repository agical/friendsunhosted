var buster = require("buster");
var webdriverjs = require("webdriverjs");


buster.testCase("Upload receipts", {
    "will work": function (done) {
        var client = webdriverjs.remote();
        //var client = webdriverjs.remote({host: "xx.xx.xx.xx"}); // to run it on a remote webdriver/selenium server
        //var client = webdriverjs.remote({desiredCapabilities:{browserName:"chrome"}}); // to run in chrome

        client
            .init()
            .url("https://github.com/")
            .getElementSize("id", "header", function(result){ console.log(result);  })
            .getTitle(function(title) { console.log(title) })
            .getElementCssProperty("id", "header", "color", function(result){ console.log(result); done(); })
            .end(); 
            
    },
    "will work too": function () {
        refute(false);
    }
})

