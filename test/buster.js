var config = module.exports;

config["functional-selenium"] = {
    environment: "node",
    rootPath: "../",
    tests: ["test/browser/**" + "/*-test.js"],
};

config["unit"] = {
    environment: "browser",
    rootPath: "..",
    sources: [
        "site/js/**/*.js",
        "test/fake/fakeRemoteAdapter.js",
    ],
    tests: [
        "test/unit/**/*-test.js"
    ],
    libs: [
        "test/require-config.js",
        "test/require-jquery.js",
    ],
    extensions: [
        require("buster-amd")
    ],
};







