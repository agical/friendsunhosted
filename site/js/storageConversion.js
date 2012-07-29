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

    val.upgrade0to1 = function(actualVersion) {
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
    
    val.upgrade1to2 = function(actualVersion) {
        var upgraded = when.defer();
        if(actualVersion == 1) {
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
        
        return upgraded.promise;
    };

    val.upgrade2to3 = function(actualVersion) {
        var upgraded = when.defer();
        if(actualVersion == 2) {
            // 2 -> 3
            console.log("Upgrading 2 to 3");
            remoteAdapter
                .fetchUserData('friendsunhosted_statusupdate_testing')
                .then(function(data) { return remoteAdapter.putUserData('friendsunhosted_status', data); }, upgraded.reject)
                .then(function() { return remoteAdapter.putUserData('VERSION', 3); }, upgraded.reject)
                .then(function() { upgraded.resolve(3); }, upgraded.reject);
        } else {
            upgraded.resolve(actualVersion);
        }
        
        return upgraded.promise;
    };

    var convert = function(actualVersion) {
        return upgrade0to1(actualVersion)
            .then(upgrade1to2);
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