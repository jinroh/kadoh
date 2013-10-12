require('colors');

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
  });

  // ascii task
  grunt.registerTask('ascii', 'Print kadoh ascii', function() {
    var logo = grunt.file.read('kadoh.ascii.txt');
    grunt.log.writeln(logo.yellow);
  });

  grunt.registerTask('default', ['ascii']);
};
