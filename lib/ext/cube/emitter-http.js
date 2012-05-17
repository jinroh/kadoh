var util = require("util"),
    http = require("http");

module.exports = function(host, port) {
  var emitter = {},
      queue = [],
      options = {
        host : host,
        port : port,
        path : "/1.0/event/put",
        method : "POST"
      },
      interval,
      sending;

  function flush() {
    if (!queue.length || sending) return;
    sending = true;
    var req = http.request(options, function(res) {
      res.on('end', function() {
        sending = false;
      });
    });
    req.write(JSON.stringify(queue));
    req.end();
    queue = [];
  }

  emitter.send = function(event) {
    queue.push(event);
    return emitter;
  };

  emitter.close = function() {
    clearInterval(interval);
    return emitter;
  };

  interval = setInterval(flush, 2000);

  return emitter;
};