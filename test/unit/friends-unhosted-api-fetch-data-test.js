define(['friendsUnhostedCode', 'underscore', 'when', 'remoteAdapter', 'testHelper'], 
function(fuc, _, when, remoteAdapter, help) {
    var eq = help.eq;
    var resolved = help.resolved;
    var rejected = help.rejected;
        
    buster.testCase("F#U API read public data", {
        setUp: function() {
            this.ra = this.mock(remoteAdapter);
        },

        "- reads updates": function(done) {
            var newData = [{'status2': 'new data'}];

            this.ra
                .expects('getPublicData')
                .withArgs('some@user.com', 'friendsunhosted_status')
                .returns(resolved(newData));
            
            fuc(_, when, this.ra.object).fetchStatusForUser('some@user.com').always(eq(newData)).always(done);
        },
        
        "//- rejects no updates": function(done) {
            ra.getPublicData = this.stub();

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
             ra.fetchUserData.verify();
             ra.putUserData.verify();
         },

         
         "//- Puts new data for no data in repo": function(done) {
            var status = 'status';
            var username = 'some@user.com';
            var data = [{
                    "status": status,
                    "timestamp": fu.getTimestamp(),
                    "username": username,
                }];
            
            ra.fetchUserData
                .withExactArgs('friendsunhosted_status')
                .returns(rejected(404));
            
            ra.putUserData
                .withArgs('friendsunhosted_status', data)
                .returns(resolved(data));
            
            fu.addStatus(status, 'some@user.com').then(eq(data), eq('fail')).always(done);
            
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
                .returns(resolved([data]));
            
            ra.putUserData
                .withArgs('friendsunhosted_status', [data, data])
                .returns(resolved([data, data]));
            
            fu.addStatus(status, 'some@user.com').then(eq([data, data]), eq('fail')).always(done);
            
        },

        "//- Rejects update for other than 404s": function(done) {
            
            var status = 'status';
            var username = 'some@user.com';
            var data = {
                    "status": status,
                    "timestamp": fu.getTimestamp(),
                    "username": username,
                };
            
            ra.fetchUserData
                .withExactArgs('friendsunhosted_status')
                .returns(rejected(666));
            ra.putUserData.never();            
            fu.addStatus(status, 'some@user.com').then(eq('failure expected'), eq("Could not access status data: 666")).always(done);
            
        }
    });

    buster.testCase("F#U API fetch data", {
        setUp: function() {
            ra.fetchUserData = this.mock();
            ra.putUserData = this.mock();
            fu.getTimestamp = function() {return 123456789;};             
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
               .returns(rejected(404));
           
           ra.putUserData
               .withArgs('friendsunhosted_status', [data])
               .returns(resolved([data]));
           
           fu.addStatus(status, 'some@user.com').then(eq([data]), eq('fail')).always(done);
           
       },
    });

    
});