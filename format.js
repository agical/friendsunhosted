var jsb = require('node-js-beautify');
var _ = require('./site/js/underscore');
var when = require('when');
var fs = require('fs');

var arguments = process.argv.splice(2);

var files = arguments;
console.log(files);

function formatFile(file) {
    var def = when.defer();
    
    console.log("Formatting", file);
    fs.readFile(file, 'UTF-8', function (err, data) { 
        if (err) def.reject(err);
        var r = new jsb().beautify_js(data, {
            'indent_size': 1,
            'indent_char': '\t'
          }); 
        fs.writeFile(file, r, function (err) {
            if (err) def.reject(err);
            def.resolve("File ", file, "reformatted");
        });        
      });
    return def.promise;
}

when.all(_.map(files, formatFile)).then(function(res) {
    _.each(res, function(item) {console.log(item);});
});

