require('colors');

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    mochaTest: {
      test: {
        src: ['test/**/*.js']
      }
    }
  });

  // ascii task
  grunt.registerTask('ascii', 'Print kadoh ascii', function() {
    var logo = grunt.file.read('kadoh.ascii.txt');
    grunt.log.writeln(logo.yellow);
  });

  // defautl task
  grunt.registerTask('default', ['ascii']);

  // tests tasks aliases
  grunt.registerTask('test:node', ['ascii', 'mochaTest:test']);

  // load npm tasks
  grunt.loadNpmTasks('grunt-mocha-test');
};
