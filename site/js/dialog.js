define(['bootbox', 'when'], 
        function(bb, when) {
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
                        result.resolve();
                    } else {
                        result.reject();
                    }
                });
                
                return result.promise;
            };

            return d;
});