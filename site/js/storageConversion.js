define(['underscore', 'remoteAdapter', 'when'], 
    function(_, remoteAdapter, when) {
    var val = {};
    
    val.convertStorage = function() {
        var whenDone = when.defer();
        alert("Click when done");
        whenDone.resolve();
        return whenDone.promise;
    };
    
    return val;
})();