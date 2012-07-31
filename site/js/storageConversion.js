define(['underscore', 'remoteAdapter', 'when'], 
    function(_, remoteAdapter, when) {

    var CURRENT_VERSION = 2;

    var val = {};
    
    var getVersion = function() {
        var whenStorageVersionIsRetrieved = when.defer();
        remoteAdapter
            .fetchUserData('VERSION')
            .then(
                function(data) {
                    whenStorageVersionIsRetrieved.resolve(data);
                },
                function(err) {
                    whenStorageVersionIsRetrieved.resolve(null);
                }
            );
        
        return whenStorageVersionIsRetrieved.promise;
    };

    val.upgrade0to1 = function(actualVersion) {
        var upgraded = when.defer();
        if(!actualVersion) {
            // 0 -> 1
            remoteAdapter
                .putUserData('VERSION', 1)
                .then(
                    function() { 
                        console.log("Upgraded store version from 0 to 1.");
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
            remoteAdapter.putUserData('VERSION', 2).then(
                function() {
                    console.log("Upgraded store version from 1 to 2.");
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
            remoteAdapter
                .fetchUserData('friendsunhosted_statusupdate_testing')
                .then(function(data) { 
                    return remoteAdapter.putUserData('friendsunhosted_status', data); 
                }, upgraded.reject)
                .then(function() { 
                    return remoteAdapter.putUserData('VERSION', 3); 
                }, upgraded.reject)
                .then(function() { 
                    console.log("Upgraded store version from 2 to 3.");
                    upgraded.resolve(3); 
                }, upgraded.reject);
        } else {
            upgraded.resolve(actualVersion);
        }
        
        return upgraded.promise;
    };

    var convert = function(actualVersion) {
        return val.upgrade0to1(actualVersion)
            .then(val.upgrade1to2)
            .then(val.upgrade2to3);
    };
            
    val.convertStorage = function() {
        var whenStorageConverted = when.defer();
        getVersion()
            .then(
                convert,                
                whenStorageConverted.reject
            )
            .then(
                whenStorageConverted.resolve, 
                whenStorageConverted.reject
            );
        
        return whenStorageConverted.promise;
    };
    
    return val;
});