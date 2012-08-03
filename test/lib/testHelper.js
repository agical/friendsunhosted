define(['when'], 
function(when) {
    
    function resolved(val) {
        var deferred = when.defer();
        deferred.resolve(val);
        return deferred.promise;
    }
    
    function rejected(val) {
        var deferred = when.defer();
        deferred.reject(val);
        return deferred.promise;
    }

    function eq(expected) {
        return function(actual) {return assert.equals(expected, actual);};
    }
    
    return {'resolved': resolved, 'rejected': rejected, 'eq': eq};
});