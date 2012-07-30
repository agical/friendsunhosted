define(['friendsUnhostedApi', 'remoteAdapter', 'when', 'testHelper'], 
function(fu, ra, when, help) {
    var eq = help.eq;
    var resolved = help.resolved;
    
    function testOldStore(o, version, done) {
        ra.getPublicData = o.stub();
        var data = {'user': 'data'};
        ra.getPublicData
            .withArgs('some@user.com', 'VERSION')
            .returns(resolved(version));
        ra.getPublicData
            .withArgs('some@user.com', 'friendsunhosted_statusupdate_testing')
            .returns(resolved(data));
        
        fu.fetchStatusForUser('some@user.com').then(eq(data),eq(data)).then(done, done);
    }
    
    buster.testCase("F#U API read public data", {

        "- can read version 0 status updates": function(done) {
            testOldStore(this, null, done);
        },

        "- can read version 1 status updates": function(done) {
            testOldStore(this, 1, done);
        },

        "- can read version 2 status updates": function(done) {
            testOldStore(this, 2, done);
        },

        "- can read version 3 status updates": function(done) {
            ra.getPublicData = this.stub();
            var data = {'user': 'data'};
            ra.getPublicData
                .withArgs('some@user.com', 'VERSION')
                .returns(resolved(3));
            ra.getPublicData
                .withArgs('some@user.com', 'friendsunhosted_status')
                .returns(resolved(data));
            
            fu.fetchStatusForUser('some@user.com').then(eq(data),eq(data)).then(done, done);
        },

    });


});