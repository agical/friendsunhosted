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
    
    function stubPromise(o, ret) {
        var m = o.stub();
        return m.withArgs.apply(m, _.tail(arguments,2)).returns(resolved(ret));
    }

    function also(m, ret) {
        return m.withArgs.apply(m, _.tail(arguments,2)).returns(resolved(ret));
    }

    function eq(expected) {
        return function(actual) {return assert.equals(expected, actual);};
    }
    
    function verifyPromise(promise, ass, done) {
        console.log(promise, ass, done);
        promise.then(function(val) {
            ass(val);
        }, function(mess){assert(false, mess);done(); })
        .then(done,done);
    }
    
    buster.testCase("storage conversion", {
        "- say hi" : function() {
            assert(storageConversion);
            assert(remoteAdapter);
        },
        
        "- test infrastructure": function(done) {
            remoteAdapter.fetchUserData = stubPromise(this, null, 'VERSION');
            verifyPromise(remoteAdapter.fetchUserData('VERSION'), eq(null), done);
        },

        "- upgrades from 0 to 1": function(done) {
            remoteAdapter.putUserData = stubPromise(this, 1, 'VERSION', 1);
            
            verifyPromise(storageConversion.upgrade0to1(null), eq(1), done);
        },

        "- upgrades from 1 to 2": function(done) {
            remoteAdapter.putUserData = stubPromise(this, 2, 'VERSION', 2);
            
            verifyPromise(storageConversion.upgrade1to2(1), eq(2), done);
        },

        "- upgrades from 2 to 3": function(done) {
            remoteAdapter.fetchUserData = stubPromise(this, {some: 'object'}, 'friendsunhosted_statusupdate_testing');
            remoteAdapter.putUserData = stubPromise(this, {some: 'object'}, 'friendsunhosted_status', {some: 'object'});
            also(remoteAdapter.putUserData, 3, 'VERSION', 3);
            
            verifyPromise(storageConversion.upgrade2to3(2), eq(3), done);
        },

        "- convert calls upgrades 0 to 3": function(done) {
            remoteAdapter.fetchUserData = stubPromise(this, null, 'VERSION');
            remoteAdapter.putUserData = stubPromise(this, 1, 'VERSION', 1);
            also(remoteAdapter.putUserData, 2, 'VERSION', 2);            
            also(remoteAdapter.fetchUserData, {some: 'object'}, 'friendsunhosted_statusupdate_testing');
            also(remoteAdapter.putUserData, {some: 'object'}, 'friendsunhosted_status', {some: 'object'});
            also(remoteAdapter.putUserData, 3, 'VERSION', 3);
            storageConversion.convertStorage().then(eq(3), eq(3)).then(done,done);
        },


    });
});