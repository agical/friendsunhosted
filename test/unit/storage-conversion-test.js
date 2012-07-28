define(["storageConversion"], function(storageConversion) {
    buster.testCase("storage conversion", {
        "- say hi" : function() {
            console.log("Hi!");
            refute(false);
        }
    });
});