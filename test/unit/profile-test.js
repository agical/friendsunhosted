define(['friendsUnhostedCode', 'underscore', 'when', 'remoteAdapter', 'testHelper'],
    function (fuc, _, when, remoteAdapter, help) {
        var eq = help.eq;
        var match = help.match;

        var resolved = help.resolved;
        var rejected = help.rejected;

        var fu = null;
        var ra = null;
        var fakeDialog;

        function setUpRemoteAdapterAndFuApi() {
            ra = this.mock(remoteAdapter);
            fu = fuc(_, when, ra.object, fakeDialog);
        }

        buster.testCase("F#U API profile", {
            setUp:setUpRemoteAdapterAndFuApi,
            tearDown:function () {
                fu.getTimestamp = this.originalGetTimestamp || fu.getTimestamp;
            },


            "- Get profile": function (done) {
                var profile = {profile: "My dummy profile"};
                var username = 'username@agical.com';


                ra.expects('getPublicData')
                    .withExactArgs(username, 'friendsunhosted/profile')
                    .returns(resolved(profile));

                fu.on('profile', function (actualUsername, actualProfile) {
                    assert.equals(actualUsername, username);
                    assert.equals(actualProfile, profile);
                    done();
                });

                fu.getProfile(username).then(eq(profile), eq('fail'));

            },

            "- Puts profile for empty store": function (done) {
                var profile = {profile: "My dummy profile"};

                var username = 'username@agical.com';
                ra.expects('username')
                    .returns(username);

                ra.expects('fetchUserData')
                    .withExactArgs('friendsunhosted/profile')
                    .returns(resolved(null));

                ra.expects('putUserData')
                    .withArgs('friendsunhosted/profile', profile)
                    .returns(resolved(profile));

                fu.on('profile', function (actualUsername, actualProfile) {
                    assert.equals(actualProfile, profile);
                    assert.equals(actualUsername, username);
                    done();
                });

                fu.saveProfile(profile).then(eq(profile), eq('fail'));

            },

            "- Handle error when reading profile": function (done) {
                var profile = {profile: "My dummy profile"};

                ra.expects('fetchUserData')
                    .withExactArgs('friendsunhosted/profile')
                    .returns(rejected(666));

                fu.on('error', function (err) {
                    assert.equals(err, "Could not write profile.");
                    done();
                });

                fu.saveProfile(profile).then(eq("Should fail"), eq("Could not write profile."));
            },

            "- Handle error when writing profile": function (done) {
                var profile = {profile: "My dummy profile"};

                ra.expects('fetchUserData')
                    .withExactArgs('friendsunhosted/profile')
                    .returns(resolved(null));

                ra.expects('putUserData')
                    .withArgs('friendsunhosted/profile', profile)
                    .returns(rejected(666));

                fu.on('error', function (err) {
                    assert.equals(err, "Could not write profile.");
                    done();
                });

                fu.saveProfile(profile).then(eq("Should fail"), eq("Could not write profile."));
            }

        });
    }
);