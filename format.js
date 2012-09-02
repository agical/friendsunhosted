var jsb = require('node-js-beautify');
var _ = require('underscore');
var when = require('when');

var arguments = process.argv.splice(2);

var files = arguments;

function formatFile(file) {
    var def = when.defer();
    
    console.log("Formatting", file);
    fs.readFile(file, 'UTF-8', function (err, data) { 
        if (err) def.reject(err);
        var r = new jsb().beautify_js(data, {
            'indent_size': 1,
            'indent_char': '\t'
          }); 
        def.resolve(r);
      });
    return def.promise;
}

when.all(_.map(files, formatFile)).then(function(all) {
    _.each(all, console.log);
});

