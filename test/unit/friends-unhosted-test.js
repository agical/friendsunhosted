define(['friendsUnhostedApi', 'remoteAdapter', 'when', 'testHelper'], 
function(fu, ra, when, help) {
    var eq = help.eq;
    var resolved = help.resolved;
    var rejected = help.rejected;
        
    buster.testCase("F#U API read public data", {

        "//- reads only old updates": function(done) {
            ra.getPublicData = this.stub();
            var oldData = {'user': 'old data'};
            ra.getPublicData
                .withArgs('some@user.com', 'friendsunhosted_statusupdate_testing')
                .returns(resolved(oldData));
            ra.getPublicData
                .withArgs('some@user.com', 'friendsunhosted_status')
                .returns(rejected(404));
            
            fu.fetchStatusForUser('some@user.com').always(eq(oldData)).always(done);
        },

        "//- reads old and new updates": function(done) {
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
            
            fu.fetchStatusForUser('some@user.com').always(eq(allData)).always(done);
        },

        "//- reads only new updates": function(done) {
            ra.getPublicData = this.stub();
            var newData = {'status2': 'new data'};

            ra.getPublicData
                .withArgs('some@user.com', 'friendsunhosted_statusupdate_testing')
                .returns(rejected(404));
            ra.getPublicData
                .withArgs('some@user.com', 'friendsunhosted_status')
                .returns(resolved(newData));
            
            fu.fetchStatusForUser('some@user.com').always(eq(newData)).always(done);
        },
        
        "//- rejects no updates": function(done) {
            ra.getPublicData = this.stub();

            ra.getPublicData
                .withArgs('some@user.com', 'friendsunhosted_statusupdate_testing')
                .returns(rejected(404));
            ra.getPublicData
                .withArgs('some@user.com', 'friendsunhosted_status')
                .returns(rejected(404));
            
            fu.fetchStatusForUser('some@user.com').then(buster.fail, eq(404)).always(done);
        },
    });
    


    buster.testCase("F#U API puts data", {
         setUp: function() {
             ra.fetchUserData = this.mock();
             ra.putUserData = this.mock();
             fu.getTimestamp = function() {return 123456789;};             
         },
         
         tearDown: function() {
             ra.fetchUserData.reset();
             ra.putUserData.reset();             
         },
         
         "//- Puts new data for no data in repo": function(done) {
            var status = 'status';
            var username = 'some@user.com';
            var data = {
                    "status": status,
                    "timestamp": fu.getTimestamp(),
                    "username": username,
                };
            
            ra.fetchUserData
                .withExactArgs('friendsunhosted_status')
                .once()
                .returns(rejected(404));
            
            ra.putUserData
                .withArgs('friendsunhosted_status', [data])
                .once()
                .returns(resolved([data]));
            
            fu.addStatus(status, 'some@user.com').then(eq([data]), eq('fail')).always(done);
            
        },

        "//- Appends data to existing data": function(done) {
            var status = 'status';
            var username = 'some@user.com';
            var data = {
                    "status": status,
                    "timestamp": fu.getTimestamp(),
                    "username": username,
                };
            
            ra.fetchUserData
                .withExactArgs('friendsunhosted_status')
                .once()
                .returns(resolved([data]));
            
            ra.putUserData
                .withArgs('friendsunhosted_status', [data, data])
                .once()
                .returns(resolved([data, data]));
            
            fu.addStatus(status, 'some@user.com').then(eq([data, data]), eq('fail')).always(done);
            
        },

        "- Rejects update for other than 404s": function(done) {
            var status = 'status';
            var username = 'some@user.com';
            var data = {
                    "status": status,
                    "timestamp": fu.getTimestamp(),
                    "username": username,
                };
            
            ra.fetchUserData
                .withExactArgs('friendsunhosted_status')
                .once()
                .returns(rejected(666));
            
            fu.addStatus(status, 'some@user.com').then(eq('failure expected'), eq("Could not access status data: 666")).always(done);
            
        },

    });

});