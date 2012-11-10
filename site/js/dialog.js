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

    d.showError = function(html) {
        var valueHtml =
            '<div class="alert alert-error">'
            + '<button type="button" class="close" data-dismiss="alert">×</button>'
            + '<div id="error-message-body">' + html + '</div>'
            + '</div>';
        $("#error-message")
            .html(valueHtml)
            .show()
            .alert();
    }



    return d;
});