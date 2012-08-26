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

    buster.testCase("F#U API friends management", {
        setUp: setUpRemoteAdapterAndFuApi,
        
        "- fetch friends of friend": function(done) {
            var friends = [{'username': 'test@agical.com', 'timestamp':9876543210},
                          {'username': 'fersuch@agical.com', 'timestamp':9876543211}];

            ra.expects('getPublicData')
                .withArgs('some@user.com', 'friendsunhosted_friends')
                .returns(resolved(friends));

            fu.fetchFriendsOfFriend('some@user.com').always(eq(friends)).always(done);
        },

        "//- put friend in emty storage alerts user": function(done) {
            var friends = [{'username': 'test@agical.com', 'timestamp':9876543210},
                          {'username': 'fersuch@agical.com', 'timestamp':9876543211}];

            ra.expects('getPublicData')
                .withArgs('some@user.com', 'friendsunhosted_friends')
                .returns(resolved(friends));
            
            fakeDialog.confirm = function(message) {
                assert.defined(message);
                var ret = when.defer();
                ret.resolve();
                return ret.promise;
            };

            fu.fetchFriendsOfFriend('some@user.com').always(eq(friends)).always(done);
        },
        
        "- Puts new friend for no friends in repo when confirm is ok": function(done) {
            this.originalGetTimestamp = fu.getTimestamp;
            fu.getTimestamp = function() {return 123456789;};

            var friends = [{'username': 'test@agical.com', 'timestamp':123456789}];

            ra.expects('fetchUserData')
                .withExactArgs('friendsunhosted_friends')
                .returns(resolved());
            
            fakeDialog.confirm = function(message) {
                assert.defined(message);
                var ret = when.defer();
                ret.resolve();
                return ret.promise;
            };
            
            ra.expects('putUserData')
                .withArgs('friendsunhosted_friends', friends)
                .returns(resolved(friends));
            
            fu.addFriend(friends[0].username).then(eq(friends[0]), eq('fail')).always(done);
            
        },

        "- Rejects new friend for no friends in repo when confirm is NOT ok": function(done) {
            this.originalGetTimestamp = fu.getTimestamp;
            fu.getTimestamp = function() {return 123456789;};

            var friends = [{'username': 'test@agical.com', 'timestamp':123456789}];

            ra.expects('fetchUserData')
                .withExactArgs('friendsunhosted_friends')
                .returns(resolved());
            
            fakeDialog.confirm = function(message) {
                assert.defined(message);
                var ret = when.defer();
                ret.reject("User rejected '" + message + "'");
                return ret.promise;
            };
            
            fu.addFriend(friends[0].username).then(eq("Should fail"), match("User rejected ")).always(done);
            
        },

        "- Rejects new friend for 404 in repo when confirm is NOT ok": function(done) {
            this.originalGetTimestamp = fu.getTimestamp;
            fu.getTimestamp = function() {return 123456789;};

            var friends = [{'username': 'test@agical.com', 'timestamp':123456789}];

            ra.expects('fetchUserData')
                .withExactArgs('friendsunhosted_friends')
                .returns(rejected(404));
            
            fakeDialog.confirm = function(message) {
                assert.defined(message);
                var ret = when.defer();
                ret.reject("User rejected '" + message + "'");
                return ret.promise;
            };
            
            fu.addFriend(friends[0].username).then(eq("Should fail"), match("User rejected ")).always(done);
            
        },

});

});