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
        return (function(e) { 
                    return function(actual) {
                        assert.equals(actual, e);
                    };
        })(expected);
    };

    function match(expected) {
        return (function(e) { 
                    return function(actual) {
                        assert.match(actual, e);
                    };
        })(expected);
    };

    
    return {'resolved': resolved, 'rejected': rejected, 'eq': eq, 'match': match};
});