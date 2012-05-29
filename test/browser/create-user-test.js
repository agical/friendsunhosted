var buster = require("buster");
var soda = require("soda");

var browser = soda.createClient({
    host: 'localhost'
  , port: 4444
  , url: 'http://localhost:8000'
  , browser: 'firefox'
});


// Log commands as they are fired
browser.on('command', function(cmd, args){
  console.log(' \x1b[33m%s\x1b[0m: %s', cmd, args.join(', '));
});

buster.testCase("Upload receipts", {
    "will work": function (done) {
        browser
            .chain
            .session()
            .open('/')
            .type('id=banan', 'Kalle Anka')
            .click('link=logga in')
            .waitForElementPresent('id=landing')
            .testComplete()
            .end(function(err){
                    done();
                    if(err) throw err;
            });
        assert(true);
    },
    "will work too": function () {
        refute(false);
    }
})

