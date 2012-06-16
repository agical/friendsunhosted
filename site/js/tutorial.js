// Accepting remoteStorage accounts in your web app
// ------------------------------------------------

var tutorial = (function() {

  // `getStorageInfo` takes a user address ("user@host") and a callback as its
  // arguments. The callback will get an error code, and a `storageInfo`
  // object. If the error code is `null`, then the `storageInfo` object will
  // contain data required to access the remoteStorage.
  function connect(userAddress, callback) {
    remoteStorage.getStorageInfo(userAddress, function(error, storageInfo) {
      if(error) {
        alert('Could not load storage info');
        console.log(error);
      } else {
        console.log('Storage info received:');
        console.log(storageInfo);
      }

      callback(error, storageInfo);
    });
  }

  // Getting data from the "public" category doesn't require any credentials.
  // For writing to a user's public data, or reading/writing any of the other
  // categories, we need to do an OAuth request first to obtain a token.

  // This method opens a popup that sends the user to the OAuth dialog of the
  // remoteStorage provider.
  function authorize(categories) {
    var storageInfo = JSON.parse(localStorage.getItem('userStorageInfo'));
    var redirectUri = location.protocol + '//' + location.host + '/receive_token.html';

    // `createOAuthAddress` takes the `storageInfo`, the categories that we
    // intend to access and a redirect URI that the storage provider sends the
    // user back to after authorization.
    // That page extracts the token and sends it back to us, which is
    // [described here](token.html).
    var oauthPage = remoteStorage.createOAuthAddress(storageInfo, categories, redirectUri);
    var popup = window.open(oauthPage);
  }

  // To get the OAuth token we listen for the `message` event from the
  // receive_token.html that sends it back to us.
  window.addEventListener('message', function(event) {
    if(event.origin == location.protocol +'//'+ location.host) {
      console.log('Received an OAuth token: ' + event.data);
      localStorage.setItem('bearerToken', event.data);
      helper.setAuthorizedState(helper.isAuthorized());
    }
  }, false);

  // To get data from the remoteStorage, we need to create a client with
  // the `createClient` method. It takes the object that we got via the
  // `getStorageInfo` call and the category we want to access. If the
  // category is any other than "public", we also have to provide the OAuth
  // token.
  function getData(category, key, callback) {
    var storageInfo = JSON.parse(localStorage.getItem('userStorageInfo'));
    var client;

    if (category == 'public') {
      client = remoteStorage.createClient(storageInfo, 'public');
    } else {
      var token = localStorage.getItem('bearerToken');
      client = remoteStorage.createClient(storageInfo, category, token);
    }

    // The client's `get` method takes a key and a callback. The callback will
    // be invoked with an error code and the data.
    client.get(key, function(error, data) {
      if(error) {
        alert('Could not find "' + key + '" in category "' + category + '" on the remoteStorage');
        console.log(error);
      } else {
        if (data == undefined) {
          console.log('There wasn\'t anything for "' + key + '" in category "' + category + '"');
        } else {
          console.log('We received this for key "' + key + '" in category "' + category + '": ' + data);
        }
      }

      callback(error, data);
    });
  }

  // For saving data we use the client's `put` method. It takes a key, the
  // value and a callback. The callback will be called with an error code,
  // which is `null` on success.
  function putData(category, key, value, callback) {
    var storageInfo = JSON.parse(localStorage.getItem('userStorageInfo'));
    var token = localStorage.getItem('bearerToken');
    var client = remoteStorage.createClient(storageInfo, category, token);

    client.put(key, value, function(error) {
      if (error) {
        alert('Could not store "' + key + '" in "' + category + '" category');
        console.log(error);
      } else {
        console.log('Stored "' + value + '" for key "' + key + '" in "' + category + '" category');
      }

      callback(error);
    });
  }

  // Now all that's left is to bind the events from the UI elements to
  // these actions, as can be seen [here](app.html).

  return {
    connect:   connect,
    authorize: authorize,
    getData:   getData,
    putData:   putData,
  };

})();
