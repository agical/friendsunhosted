define(['friendsUnhostedCode', 'underscore', 'when', 'remoteAdapter', 'testHelper'], 
function(fuc, _, when, remoteAdapter, help) {
    var eq = help.eq;
    var resolved = help.resolved;
    var rejected = help.rejected;

    var fu = null;
    var ra = null;
    
    function setUpRemoteAdapterAndFuApi() {
        ra = this.mock(remoteAdapter);
        fu = fuc(_, when, ra.object);
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
    });

});