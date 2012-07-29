define(['friendsUnhostedApi', 'remoteAdapter', 'when'], 
function(fu, ra, when) {
    
    function resolved(val) {
        var deferred = when.defer();
        deferred.resolve(val);
        return deferred.promise;
    }
    
    function eq(expected) {
        return function(actual) {return assert.equals(expected, actual);};
    }

    buster.testCase("Friends unhosted", {

        "- can read version 0 status updates": function(done) {
            ra.getPublicData = this.stub();
            var data = {'user': 'data'};
            ra.getPublicData
                .withArgs('some@user.com', 'VERSION')
                .returns(resolved(null));
            ra.getPublicData
                .withArgs('some@user.com', 'friendsunhosted_statusupdate_testing')
                .returns(resolved(data));
            
            fu.fetchStatusForUser('some@user.com').then(eq(data),eq(data)).then(done, done);
        },


    });
});