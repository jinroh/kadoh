(function(global) {
  // Maximum number of contacts in a k-bucket
  global.k = 6;

  // Degree of parallelism for network calls
  global.alpha = 3;

  // sha1 function
  globals._sha1 = Crypto.SHA1;
})(this);