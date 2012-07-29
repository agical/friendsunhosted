define(['storageConversion', 'remoteAdapter'], function(storageConversion, remoteAdapter) {
    buster.testCase("storage conversion", {
        "- say hi" : function() {
            console.log(storageConversion);
            assert(storageConversion);
            assert(remoteAdapter);
        }
    });
});