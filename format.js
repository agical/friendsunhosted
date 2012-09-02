var jsb = require('node-js-beautify');
var _ = require('./site/js/underscore');
var when = require('when');
var fs = require('fs');

var arguments = process.argv.splice(2);

var files = arguments;
console.log(files);

var formatter = new jsb();

var formattings = {
        'js':  formatter.beautify_js,
        'html':formatter.beautify_html,
        'css':formatter.beautify_css
};

var options = {
        'indent_size': 4,
        'indent_char': ' '
    };

function fileType(file) {
    return file.substr(file.lastIndexOf('.') + 1);
}

function formatFile(file) {
    var def = when.defer();
    
    console.log("Formatting", file);

    fs.readFile(file, 'UTF-8', function(err, data) {
        if (err) def.reject(err);
        
        var r = formattings[fileType(file)](data, options);
        
        fs.writeFile(file, r, function(err) {
            if (err) def.reject(err);
            def.resolve("File '" + file + "' reformatted");
        });
    });
    return def.promise;
}

when.all(_.map(files, formatFile)).then(function(res) {
    _.each(res, function(item) {
        console.log(item);
    });
});