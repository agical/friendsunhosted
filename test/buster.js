var config = module.exports;

config["web-module"] = {
    environment: "browser",
    rootPath: "../site/js",
    tests: ["test/module/**/*test.js"],
    resources: ["**/*.js"],
    libs: ["require-jquery.js"],
    extensions: [require("buster-amd")]
}

config["unit"] = {
    environment: "node",
    rootPath: "../web/resources/public/js",
    tests: ["test/unit/**/*.js"],
    resources: ["**/*.js"],
}









