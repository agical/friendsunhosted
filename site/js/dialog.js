define(['when'], function(when) {
    var d = {};
    d.info = function(message) {
        var valueHtml =
            '<div class="alert alert-info">'
                + '<button type="button" class="close" data-dismiss="alert">×</button>'
                + '<div id="info-message-body">' + message + '</div>'
                + '</div>';
        $("#notification-area")
            .html(valueHtml)
            .show()
            .alert();
    };


    d.showError = function(html) {
        var valueHtml =
            '<div class="alert alert-error">'
                + '<button type="button" class="close" data-dismiss="alert">×</button>'
                + '<div id="error-message-body">' + html + '</div>'
                + '</div>';
        $("#notification-area")
            .html(valueHtml)
            .show()
            .alert();
    }


    return d;
});