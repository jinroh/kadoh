spawn = require('child_process').spawn

var cmd = [ 'while [ true ]'
          , 'do'
          , 'sleep 3600'
          , 'done'].join(' ');

exports.wait = function(time) {
  
  deamon = spawn('sh', ['./waitd'], {cwd : __dirname});
  
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