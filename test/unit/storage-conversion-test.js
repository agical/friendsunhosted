define(['storageConversion', 'remoteAdapter', 'when'], 
function(storageConversion, remoteAdapter, when) {
    
    function returningStub(tc, returnValue, methodArgs) {
        var s = tc.stub();
        s.calledOnceWith(methodArgs);
        s.returns(returnValue);
        return s;
    }
    
    function resolved(val) {
        var deferred = when.defer();
        deferred.resolve(val);
        return deferred.promise;
    }
    
    function mockPromise(o, ret) {
        var m = o.mock();
        return m.withArgs.apply(m, _.tail(arguments,2)).returns(resolved(ret));
    }
    
    function eq(expected) {
        return function(actual) {return assert.equals(expected, actual);};
    }
    
    function verifyPromise(promise, ass, done) {
        promise.then(function(val) {
            ass(val);
        }).then(done,done);
    }
    
    buster.testCase("storage conversion", {
        "- say hi" : function() {
            assert(storageConversion);
            assert(remoteAdapter);
        },
        
        "- test infrastructure": function(done) {
            remoteAdapter.fetchUserData = mockPromise(this, null, 'VERSION');
            verifyPromise(remoteAdapter.fetchUserData('VERSION'), eq(null), done);
        },

        "- upgrades from 0 to 1": function(done) {
            remoteAdapter.fetchUserData = mockPromise(this, null, 'VERSION');
            remoteAdapter.putUserData = mockPromise(this, 1, 'VERSION', 1);
            
            verifyPromise(remoteAdapter.fetchUserData('VERSION'), eq(null), done);
            verifyPromise(remoteAdapter.putUserData('VERSION', 1), eq(1), done);
        },

    });
});