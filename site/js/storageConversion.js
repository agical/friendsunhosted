define(['underscore', 'remoteAdapter', 'when'], 
    function(_, remoteAdapter, when) {
    
    var CURRENT_VERSION = 2;

    var val = {};
    
    var getVersion = function() {
        console.log("Getting version...");
        var whenStorageVersionIsRetrieved = when.defer();
        remoteAdapter
            .fetchUserData('VERSION')
            .then(
                function(data) {
                    console.log(data);
                    whenStorageVersionIsRetrieved.resolve(data);
                },
                function(err) {
                    console.log(err);
                    whenStorageVersionIsRetrieved.resolve(null);
                }
            );
        
        return whenStorageVersionIsRetrieved.promise;
    };

    var upgrade0to1 = function(actualVersion) {
        var upgraded = when.defer();
        if(!actualVersion) {
            // 0 -> 1
            console.log("Upgrading 0 to 1");
            remoteAdapter
                .putUserData('VERSION', 1)
                .then(
                    function() { 
                        upgraded.resolve(1); 
                    },
                    upgraded.reject
            );
        } else {
            upgraded.resolve(actualVersion);
        }
        return upgraded.promise;
    };
    
    var upgradeTo2 = function(actualVersion) {
        var upgraded = when.defer();
        upgrade0to1().then(function() {
            if(actualVersion<2) {
                // 1 -> 2
                console.log("Upgrading 1 to 2");
                remoteAdapter.putUserData('VERSION', 2).then(
                    function() {
                        upgraded.resolve(2);
                    },
                    upgraded.reject
                );
            } else {
                upgraded.resolve(actualVersion);
            }
        });
        
        return upgraded.promise;
    };
    
    var convert = function(actualVersion) {
        return upgradeTo2(actualVersion);
    };
            
    val.convertStorage = function() {
        var whenStorageConverted = when.defer();
        getVersion()
            .then(convert)
            .then(
                whenStorageConverted.resolve, 
                whenStorageConverted.reject
            );
        
        return whenStorageConverted.promise;
    };
    
    return val;
});