var util = require("util"),
    emitter, port;

if (process.title === "node") {
  //@browserify-ignore
  emitter = require("./emitter-udp");
  port = 1180;
} else {
  emitter = require("./emitter-http");
  port = 80;
}

module.exports = function(hostname) {
  return emitter(hostname, port);
};