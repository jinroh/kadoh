fs = require("fs");

var results = JSON.parse(fs.readFileSync(__dirname + "/results.json").toString());
var devices = ["chrome", "firefox", "iphone-wifi", "iphone-3g"];
 // "join", "iterFind_reached", "iterFind"];

var scales = [""];
for (var size in results) {
  scales.push(size);
}
scales = scales.join(";");

print = function(type, value) {
  var print = {};
  for (var size in results) {
    devices.forEach(function(device) {
      if (!print[device]) {
        print[device] = [device];
      }
      d_results = results[size][device][type];
      var mean = 0;
      var i = 0;
      for (var n in d_results) {
        if (typeof d_results[n][value] == "number" &&  d_results[n][value] > 0) {
          mean += d_results[n][value];
          i++;
        }
      }
      print[device].push(mean / i);
    });
  }
  console.log(type + ";");
  console.log(value + ";");
  console.log(scales);
  for (device in print) {
    console.log(print[device].join(";"));
  }
  console.log();
}

print("join", "time");
print("join", "reached");
print("join", "queries");
print("join", "closest");

print("iterFind", "time");
print("iterFind", "reached");
print("iterFind", "queries");
print("iterFind", "closest");

print("iterFind_reached", "time");
print("iterFind_reached", "reached");
print("iterFind_reached", "queries");
print("iterFind_reached", "closest");
