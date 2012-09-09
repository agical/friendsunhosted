define(['bootbox', 'when'], function(bb, when) {
    var d = {};
    d.info = function(message) {
        var result = when.defer();

        bootbox.alert(message, result.resolve);

        return result.promise;
    };

    d.confirm = function(message) {
        var result = when.defer();

        bootbox.confirm(message, function(confirmed) {
            if (confirmed) {
                result.resolve("User choose OK on '" + message + "'");
            } else {
                result.reject("User cancelled on '" + message + "'");
            }
        });

        return result.promise;
    };

    return d;
});