var config = module.exports;

/*
config["functional-selenium"] = {
    environment: "node",
    rootPath: "../",
    tests: ["test/browser/**" + "/*-test.js"],
    //resources: ["**" + "/*.js"],
};
*/
config["unit"] = {
       // id:null,
        environment: "browser",
        rootPath: "..",
        sources: [
            "site/js/**/*.js"
        ],
        tests: [
            "test/unit/**/*-test.js"
        ],
        libs: [
            "test/require-config.js",
            "test/require-jquery.js"
        ],
        extensions: [
            require("buster-amd")
        ],
    };







