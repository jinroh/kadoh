var util = require("util"),
    url  = require("url");
    emitter;

if (process.title === "node") {
  //@browserify-ignore
  emitter = require("./emitter-udp");
} else {
  emitter = require("./emitter-http");
}

module.exports = function(u) {
  return emitter(u.hostname, u.port);
};