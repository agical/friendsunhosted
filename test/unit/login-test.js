define(['friendsUnhostedCode', 'underscore', 'when', 'remoteAdapter', 'testHelper'],
    function (fuc, _, when, remoteAdapter, help) {
        var eq = help.eq;
        var match = help.match;

        var resolved = help.resolved;
        var rejected = help.rejected;

        var fu = null;
        var ra = null;

        var username = 'username@agical.com';

        function setUpRemoteAdapterAndFuApi() {
            ra = this.mock(remoteAdapter);
            fu = fuc(_, when, ra.object, null);
        }

        buster.testCase("F#U API login", {
            setUp:setUpRemoteAdapterAndFuApi,

            "- Login": function (done) {

                ra.expects('login')
                    .withExactArgs(username)
                    .returns(resolved(username));

                fu.on('login', function (actualUsername) {
                    assert.equals(actualUsername, username);
                    done();
                });

                fu.login(username).then(eq(username), eq('fail'));
            },

            "- Login failed": function (done) {

                ra.expects('login')
                    .withExactArgs(username)
                    .returns(rejected("Failed to login..."));

                fu.on('error', function (err) {
                    done();
                });

                fu.login(username).then(eq("Shouldn't happen"), eq('Failed to login...'));
            },

            "- Logout": function (done) {

                ra.expects('username')
                    .returns(username);

                ra.expects('logout')
                    .returns(resolved());

                fu.on('logout', function (actualUsername) {
                    assert.equals(actualUsername, username);
                    done();
                });

                fu.logout();
            },

            "- Logout failed": function (done) {

                ra.expects('username')
                    .returns(username);

                ra.expects('logout')
                    .returns(rejected("Failed to logout..."));

                fu.on('error', function (err) {
                    assert.equals(err, "Failed to logout...");
                    done();
                });

                fu.logout().then(eq("Shouldn't happen"), eq('Failed to logout...'));
            },

            "- Init": function (done) {

                ra.expects('restoreLogin')
                    .returns(resolved(username));

                fu.on('login', function (actualUsername) {
                    assert.equals(actualUsername, username);
                    done();
                });

                fu.init().then(eq(username), eq('fail'));
            },

            "- Init failed": function (done) {

                ra.expects('restoreLogin')
                    .withExactArgs()
                    .returns(rejected("Failed to login..."));

                fu.on('error', function (err) {
                    assert.equals(err, "Failed to login...");
                    done();
                });

                fu.init().then(eq("Shouldn't happen"), eq('Failed to login...'));
            }


        });
    });
