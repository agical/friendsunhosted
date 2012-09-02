var jsb = require('node-js-beautify');

var arguments = process.argv.splice(2);
var file = arguments[0];
console.log("Formatting", file);

var r = new jsb().beautify_js("var hej='hopp'; var oj='';", {
        'indent_size': 1,
        'indent_char': '\t'
      }); 
console.log(r);
       