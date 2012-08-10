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
        
        "//- reads updates": function(done) {
            
        },
    });

});