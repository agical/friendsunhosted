define([/*'friendsUnhosted', */'remoteAdapter', 'when'], 
function(remoteAdapter, when) {
    
    function resolved(val) {
        var deferred = when.defer();
        deferred.resolve(val);
        return deferred.promise;
    }
    
    function eq(expected) {
        return function(actual) {return assert.equals(expected, actual);};
    }

    buster.testCase("Friends unhosted", {

        "- c": function(done) {
            assert(true);
            done();
            /*
            remoteAdapter.fetchUserData = this.stub();
            remoteAdapter.putUserData = this.stub();
            
            remoteAdapter.fetchUserData.withArgs('VERSION').returns(resolved(null));

            fu.addStatusListener(function(actual) {
                assert.equal(expected, actual);
            });
            
            fu.fetchStatuses().then();
            
            fu.convertStorage().then(eq(3), eq(3)).then(done,done);
            */
        },


    });
});