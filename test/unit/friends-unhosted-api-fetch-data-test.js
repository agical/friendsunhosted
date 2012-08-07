define(['friendsUnhostedCode', 'underscore', 'when', 'remoteAdapter', 'testHelper'], 
function(fuc, _, when, remoteAdapter, help) {
    var eq = help.eq;
    var resolved = help.resolved;
    var rejected = help.rejected;
        
    
    function raExp_getPublicData(tis) {
        return ra.expects('getPublicData');
    }

    function raExp_fetchUserData(tis) {
        return ra.expects('fetchUserData');
    }

    function raExp_putUserData(tis) {
        return ra.expects('putUserData');
    }

    var fu = null;
    var ra = null;
    
    function setUpRemoteAdapterAndFuApi() {
        ra = this.mock(remoteAdapter);
        fu = fuc(_, when, ra.object);
    }
    

    buster.testCase("F#U API read public data", {
        setUp: setUpRemoteAdapterAndFuApi,
        
        "- reads updates": function(done) {
            var newData = [{'status2': 'new data'}];

            raExp_getPublicData(this)
                .withArgs('some@user.com', 'friendsunhosted_status')
                .returns(resolved(newData));

            fu.fetchStatusForUser('some@user.com').always(eq(newData)).always(done);
        },
        
        "- rejects no updates": function(done) {
            
            raExp_getPublicData(this)
                .withArgs('some@user.com', 'friendsunhosted_status')
                .returns(rejected(404));
            
            fu.fetchStatusForUser('some@user.com').then(buster.fail, eq(404)).always(done);
        },
    });
    


    buster.testCase("F#U API puts data", {
        setUp: setUpRemoteAdapterAndFuApi,
//        setUp: function() {
//            fu.getTimestamp = function() {return 123456789;};             
//        },
         
        "- Puts new data for no data in repo": function(done) {
            var status = 'status';
            var username = 'some@user.com';
            var data = [{
                    "status": status,
                    "timestamp": fu.getTimestamp(),
                    "username": username,
                }];
            
            raExp_fetchUserData(this)
                .withExactArgs('friendsunhosted_status')
                .returns(rejected(404));
            
            raExp_putUserData(this)
                .withArgs('friendsunhosted_status', data)
                .returns(resolved(data));
            
            fu.addStatus(status, 'some@user.com').then(eq(data), eq('fail')).always(done);
            
        },

        "- Appends data to existing data": function(done) {
            var status = 'status';
            var username = 'some@user.com';
            fu.getTimestamp = function() {
                return 987654321;
            };
            
            var data1 = {
                    "status": 's1',
                    "timestamp": 123456789,
                    "username": username,
                };

            var data2 = {
                    "status": status,
                    "timestamp": fu.getTimestamp(),
                    "username": username,
                };

            raExp_fetchUserData(this)
                .withExactArgs('friendsunhosted_status')
                .returns(resolved([data1]));
            
            raExp_putUserData(this)
                .withArgs('friendsunhosted_status', [data1, data2])
                .returns(resolved([data1, data2]));
            
            fu.addStatus(status, 'some@user.com').then(eq([data1, data2]), eq('fail')).always(done);
            
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