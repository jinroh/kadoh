spawn = require('child_process').spawn

exports.wait = function() {
  
  deamon = spawn('sh', ['./waitd'], {
    cwd : __dirname
    });
  
  deamon.stdout.on('data', function (data) {
    console.log('stdout: ' + data);
  });

  deamon.stderr.on('data', function (data) {
    console.log('stderr: ' + data);
  });

  deamon.on('exit', function (code) {
    console.log('child process exited with code ' + code);
  });
  
  
}