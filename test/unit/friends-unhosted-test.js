define(['friendsUnhostedApi', 'remoteAdapter', 'when', 'testHelper'], 
function(fu, ra, when, help) {
    var eq = help.eq;
    var resolved = help.resolved;
    var rejected = help.rejected;
    
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

        "//- can read version 0 status updates": function(done) {
            testOldStore(this, null, done);
        },

        "//- can read version 1 status updates": function(done) {
            testOldStore(this, 1, done);
        },

        "//- can read version 2 status updates": function(done) {
            testOldStore(this, 2, done);
        },

        "//- can read version 3 status updates": function(done) {
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

        "- reads only old updates": function(done) {
            ra.getPublicData = this.stub();
            var oldData = {'user': 'old data'};
            ra.getPublicData
                .withArgs('some@user.com', 'friendsunhosted_statusupdate_testing')
                .returns(resolved(oldData));
            ra.getPublicData
                .withArgs('some@user.com', 'friendsunhosted_status')
                .returns(rejected(404));
            
            fu.fetchStatusForUser('some@user.com').then(eq(oldData),eq(oldData)).then(done, done);
        },

        "- reads old and new updates": function(done) {
            ra.getPublicData = this.stub();
            var oldData = {'status1': 'old data'};
            var newData = {'status2': 'new data'};
            var allData = {'status1': 'old data', 'status2': 'new data'};

            ra.getPublicData
                .withArgs('some@user.com', 'friendsunhosted_statusupdate_testing')
                .returns(resolved(oldData));
            ra.getPublicData
                .withArgs('some@user.com', 'friendsunhosted_status')
                .returns(resolved(newData));
            
            fu.fetchStatusForUser('some@user.com').then(eq(oldData),eq(oldData)).then(done, done);
        },
    });
    


    buster.testCase("F#U API upgrade store", {

         "//- can upgrade to version 3 store": function(done) {

            ra.fetchUserData = this.stub();
            ra.putUserData = this.stub();
            ra.restoreLogin = this.stub();
            
            var data = {'user': 'data'};
            var username = 'some@user.com';
            
            ra.restoreLogin
                .withArgs()
                .returns(resolved(username));

            ra.fetchUserData
                .withArgs('VERSION')
                .returns(resolved(2));

            ra.fetchUserData
                .withArgs('friendsunhosted_statusupdate_testing')
                .returns(resolved(data));
            
            ra.putUserData
                .withArgs('friendsunhosted_status')
                .returns(resolved(data));
            
            ra.putUserData
                .withArgs('VERSION', 3)
                .returns(resolved(3));
            /*
            var beforeBackgroundTask = when.defer();
            var afterBackgroundTask = when.defer();

            fu.addBackgroundTaskListeners(
                    beforeBackgroundTask.resolve, 
                    afterBackgroundTask.resolve
            );
            
            fu.addBackgroundTaskListeners(
                    console.log, 
                    console.log
            );
*/
            var initPromise = fu.init();//.then(eq(username), eq(username)).then(done,done);
            
            when.all([/*beforeBackgroundTask.promise, afterBackgroundTask.promise, */initPromise], eq([username]), eq([username])).always(done);
        },

    });

});