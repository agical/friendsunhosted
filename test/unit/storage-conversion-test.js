define(['storageConversion', 'remoteAdapter', 'when', 'testHelper'], 
function(storageConversion, remoteAdapter, when, testHelper) {

    var resolved = testHelper.resolved;
    var eq = testHelper.eq;

    buster.testCase("storage conversion", {

        "- upgrades from 0 to 1": function(done) {
            remoteAdapter.putUserData = this.stub();
            remoteAdapter.putUserData.withArgs('VERSION', 1).returns(resolved(1));
            
            storageConversion.upgrade0to1(null).then(eq(1),eq(1)).then(done, done);
        },

        "- upgrades from 1 to 2": function(done) {
            remoteAdapter.putUserData = this.stub();
            remoteAdapter.putUserData.withArgs('VERSION', 2).returns(resolved(2));
            
            storageConversion.upgrade1to2(1).then(eq(2),eq(2)).then(done, done);
        },

        "- upgrades from 2 to 3": function(done) {
            remoteAdapter.fetchUserData = this.stub();
            remoteAdapter.putUserData = this.stub();

            remoteAdapter.fetchUserData.withArgs('friendsunhosted_statusupdate_testing').returns(resolved({some: 'object'}));
            remoteAdapter.putUserData.withArgs('friendsunhosted_status', {some: 'object'}).returns(resolved({some: 'object'}));
            remoteAdapter.putUserData.withArgs('VERSION', 3).returns(resolved(3));
            
            storageConversion.upgrade2to3(2).then(eq(3),eq(3)).then(done, done);
        },

        "- convert calls upgrades 0 to 3": function(done) {
            remoteAdapter.fetchUserData = this.stub();
            remoteAdapter.putUserData = this.stub();
            
            remoteAdapter.fetchUserData.withArgs('VERSION').returns(resolved(null));
            remoteAdapter.putUserData.withArgs('VERSION', 1).returns(resolved(1));
            remoteAdapter.putUserData.withArgs('VERSION', 2).returns(resolved(2));
            
            remoteAdapter.fetchUserData.withArgs( 'friendsunhosted_statusupdate_testing').returns(resolved({some: 'object'}));
            remoteAdapter.putUserData.withArgs('friendsunhosted_status', {some: 'object'}).returns(resolved({some: 'object'}));
            remoteAdapter.putUserData.withArgs('VERSION', 3).returns(resolved(3));
            storageConversion.convertStorage().then(eq(3), eq(3)).then(done,done);
        },

        "- convert calls upgrades 0 to 3 with no previous data": function(done) {
            remoteAdapter.fetchUserData = this.stub();
            remoteAdapter.putUserData = this.stub();
            
            remoteAdapter.fetchUserData.withArgs('VERSION').returns(resolved(null));
            remoteAdapter.putUserData.withArgs('VERSION', 1).returns(resolved(1));
            remoteAdapter.putUserData.withArgs('VERSION', 2).returns(resolved(2));
            
            remoteAdapter.fetchUserData.withArgs( 'friendsunhosted_statusupdate_testing').returns(resolved(null));
            remoteAdapter.putUserData.withArgs('friendsunhosted_status', {some: 'object'}).returns(resolved({some: 'object'}));
            remoteAdapter.putUserData.withArgs('VERSION', 3).returns(resolved(3));
            storageConversion.convertStorage().then(eq(3), eq(3)).then(done,done);
        },

    });
});