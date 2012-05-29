var util = require("util"),
    emitter, port;

if (process.title === "node") {
  //@browserify-ignore
  emitter = require("./emitter-udp");
  protocol = "udp:";
  port = 1180;
} else {
  emitter = require("./emitter-http");
  protocol = "http:"
  port = 80;
}

module.exports = function(hostname) {
  return emitter(protocol, hostname, port);
};