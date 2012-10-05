define(['friendsUnhostedCode', 'underscore', 'when', 'remoteAdapter', 'testHelper'], 
function(fuc, _, when, remoteAdapter, help) {
    var eq = help.eq;
    var match = help.match;
    
    var resolved = help.resolved;
    var rejected = help.rejected;

    var fu = null;
    var ra = null;
    var fakeDialog;
    
    function setUpRemoteAdapterAndFuApi() {
        ra = this.mock(remoteAdapter);
        fakeDialog = {};
        fu = fuc(_, when, ra.object, fakeDialog);
    }
    
    buster.testCase("F#U API read public data", {
        setUp: setUpRemoteAdapterAndFuApi,
        
        "- reads updates and calls listener": function(done) {
            var newData = [{'status2': 'new data'}];
            
            ra.expects('getPublicData')
                .withArgs('some@user.com', 'friendsunhosted_status')
                .returns(resolved(newData));
            fu.on('status', function(data) {
                assert.equals(data, newData);
                done();
            });
            fu.fetchStatusForUser('some@user.com').always(eq(newData));
        },

        "- reads updates and calls several listeners": function(done) {
            var newData = [{'status2': 'new data'}];
            var listenersCalled = 0;
            var listener = function(data) {
                assert.equals(data, newData);
                listenersCalled++;
                if(listenersCalled == 2) done();
            };
            
            ra.expects('getPublicData')
                .withArgs('some@user.com', 'friendsunhosted_status')
                .returns(resolved(newData));
            fu.on('status', listener);
            fu.on('status', listener);
            fu.fetchStatusForUser('some@user.com').always(eq(newData));
        },


        "- rejects no updates and calls error listener": function(done) {
            
            ra.expects('getPublicData')
                .withArgs('some@user.com', 'friendsunhosted_status')
                .returns(rejected(404));
            
            fu.on('error', function(err) {
                assert.equals(err, 404);
                done();
            });
            fu.fetchStatusForUser('some@user.com').then(buster.fail, eq(404));
        },
    });

    buster.testCase("F#U API puts data", {
        setUp: setUpRemoteAdapterAndFuApi,
        tearDown: function() {fu.getTimestamp = this.originalGetTimestamp||fu.getTimestamp;},
        
        "- Puts new data for no data in repo when confirm is ok": function(done) {
            var status = 'status';
            var username = 'some@user.com';
            this.originalGetTimestamp = fu.getTimestamp;
            fu.getTimestamp = function() {return 123456789;};
            var data = [{
                    "status": status,
                    "timestamp": fu.getTimestamp(),
                    "username": username,
                }];
            
            fakeDialog.confirm = function(message) {
                assert.defined(message);
                var ret = when.defer();
                ret.resolve();
                return ret.promise;
            };
            
            ra.expects('fetchUserData')
                .withExactArgs('friendsunhosted_status')
                .returns(rejected(404));
            
            ra.expects('putUserData')
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

            ra.expects('fetchUserData')
                .withExactArgs('friendsunhosted_status')
                .returns(resolved([data1]));
            
            ra.expects('putUserData')
                .withArgs('friendsunhosted_status', [data1, data2])
                .returns(resolved([data1, data2]));
            
            fu.addStatus(status, 'some@user.com').then(eq([data1, data2]), eq('fail')).always(done);
            
        },

        "- Rejects update for other than 404s": function(done) {
            
            var status = 'status';
            var username = 'some@user.com';
            var data = {
                    "status": status,
                    "timestamp": fu.getTimestamp(),
                    "username": username,
                };
            
            ra.expects('fetchUserData')
                .withExactArgs('friendsunhosted_status')
                .returns(rejected(666));
                       
            fu.addStatus(status, 'some@user.com').then(eq('failure expected'), eq("Could not access status data: 666")).always(done);
        },
        
        "- rejects new data for 404 when confirm is NOT ok": function(done) {
            var status = 'status';
            var username = 'some@user.com';
            this.originalGetTimestamp = fu.getTimestamp;
            fu.getTimestamp = function() {return 123456789;};
            var data = [{
                    "status": status,
                    "timestamp": fu.getTimestamp(),
                    "username": username,
                }];
            
            fakeDialog.confirm = function(message) {
                assert.defined(message);
                var ret = when.defer();
                ret.reject("User cancelled on '" + message + "'");
                return ret.promise;
            };
            
            ra.expects('fetchUserData')
                .withExactArgs('friendsunhosted_status')
                .returns(rejected(404));
                        
            fu
                .addStatus(status, 'some@user.com')
                .then(eq('failure expected'), match("User cancelled on "))
                .always(done);
            
        },

        "- rejects new data for no data when confirm is NOT ok": function(done) {
            var status = 'status';
            var username = 'some@user.com';
            this.originalGetTimestamp = fu.getTimestamp;
            fu.getTimestamp = function() {return 123456789;};
            var data = [{
                    "status": status,
                    "timestamp": fu.getTimestamp(),
                    "username": username,
                }];
            
            fakeDialog.confirm = function(message) {
                assert.defined(message);
                var ret = when.defer();
                ret.reject("User cancelled on '" + message + "'");
                return ret.promise;
            };
            
            ra.expects('fetchUserData')
                .withExactArgs('friendsunhosted_status')
                .returns(resolved());

            fu
                .addStatus(status, 'some@user.com')
                .then(eq('failure expected'), match("User cancelled on "))
                .always(done);
            
        },

    });
});