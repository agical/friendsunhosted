define(['underscore', 'remoteStorage', 'when'], 
    function(_, remoteStorage, when) {

        var val = {};

        var connect = function(userAddress, callback) {
            remoteStorage.getStorageInfo(userAddress, function(error, storageInfo) {
              if(error) {
                alert('Could not load storage info:' + error);
                console.log(error);
              } else {
                console.log('Storage info received:');
                console.log(storageInfo);
              }

              callback(error, storageInfo);
            });
        };

        var getUserStorageClient = function(category) {
            var token = localStorage.getItem('bearerToken');
            var storageInfo = JSON.parse(localStorage.getItem('userStorageInfo'));
            var client = remoteStorage.createClient(storageInfo, category, token);
            return client;      
        };

        val.login = function(username, categories) {
            var categories = categories || ['public'];
            
            var deferred = when.defer();

            connect(username, function(err, storageInfo) {
                if(err) {
                    deferred.reject(err);
                } else {
                    localStorage.setItem('username', JSON.stringify(username));
                    localStorage.setItem('userStorageInfo', JSON.stringify(storageInfo));
                    var redirectUri = location.protocol + '//' + location.host;
                    
                    var oauthPage = remoteStorage.createOAuthAddress(storageInfo, categories, redirectUri);
                    window.location.replace(oauthPage);
                }
            });
            return deferred.promise;
        };

        val.restoreLogin = function() {
            var deferred = when.defer();

            var token = remoteStorage.receiveToken();
            if(token) {
                localStorage.setItem('bearerToken', token);
            }

            var localUsername = localStorage.getItem('username');
            var token = localStorage.getItem('bearerToken');
            
            if(localUsername && token) {
                deferred.resolve(JSON.parse(localUsername));
            } else {
                deferred.reject("No logged in user");
            }
            return deferred.promise;
        };
      
        val.fetchUserData = function(key, category) {
            category = category || 'public';
            var deferred123 = when.defer();
          
            var client = getUserStorageClient(category);
            client.get(key, function(err, dataStr) {
                if(err) {
                    deferred123.reject(err);
                } else {
                    deferred123.resolve(dataStr?JSON.parse(dataStr):null);
                }
            });
            return deferred123.promise;
        };

        val.putUserData = function(key, value, category) {
          category = category || 'public';
          var deferred = when.defer();
          
          var client = getUserStorageClient(category);
          client.put(key, JSON.stringify(value), function(err) {
            if(err) {
              deferred.reject(err);
            } else {
              deferred.resolve({"key": key, "value": value, "category": category});
            }
          });
          return deferred.promise;
        };

        val.getPublicData = function(username, key) {
            var deferred666 = when.defer();
            
            connect(username, function(err, storageInfo) {
                if(err) { 
                    deferred666.reject(err); 
                } else {
                    var client = remoteStorage.createClient(storageInfo, 'public');
                    client.get(key, function(err2, dataStr) {
                        if(err2) {
                            deferred666.reject("Error when reading status update for key:" + key + " Error:" + err2);
                        } else {
                            deferred666.resolve(dataStr && dataStr!="null"? JSON.parse(dataStr):null);
                        }
                    });
                }                
            });
            
            return deferred666.promise;
        };

        val.logout = function() {
            var deferred = when.defer();
            localStorage.clear('username');
            localStorage.clear('userStorageInfo');
            localStorage.clear('bearerToken');
            deferred.resolve();
            return deferred.promise;
        };

        val.deleteUserData = function(key) {
            var deferred = when.defer();
            
            var client = getUserStorageClient('public');

            client['delete'](key, function(err) {
              if(err) {
                deferred.reject(err);
              } else {
                deferred.resolve(key);
              }
            });
          
            return deferred.promise;
        };

        return val;
    }

);