require('colors');
var browserify = require('browserify');
var tagify = require('tagify');
var path = require('path');

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    mochaTest: {
      test: {
        src: ['test/**/*.js']
      }
    },

    kadohBuild: {
      xmpp: {
        options: {
          flags: ['xmpp', 'lawchair'],
        },
        src: ['lib/index-browserify.js'],
        dest: 'dist/KadOH.xmpp.js'
      },

      simudp: {
        options: {
          flags: ['simudp', 'lawchair'],
        },
        src: ['lib/index-browserify.js'],
        dest: 'dist/KadOH.simudp.js'
      }
    }
  });

  // ascii task
  grunt.registerTask('ascii', 'Print kadoh ascii', function() {
    var logo = grunt.file.read('kadoh.ascii.txt');
    grunt.log.writeln(logo.yellow);
  });

  grunt.registerMultiTask('kadohBuild', 'Build kadoh file', function() {
    var task = this;
    this.files.forEach(function(file, next) {
      var options = task.options({
        flags: [],
        debug: false
      });

      var build = browserify({debug : options.debug});
      build.use(tagify.flags(options.flags));

      var entries = grunt.file.expand({filter: 'isFile'}, file.src)
                   .map(function (f) {
                      return path.resolve(f);
                    }).forEach(function(entry) {
                      build.addEntry(entry);
                    });

      grunt.file.write(file.dest, build.bundle());
    });
  });
  // defautl task
  grunt.registerTask('default', ['ascii']);

  // tests tasks aliases
  grunt.registerTask('test:node', ['ascii', 'mochaTest:test']);

  // build tasks aliases
  grunt.registerTask('build:xmpp', ['ascii', 'kadohBuild:xmpp']);
  grunt.registerTask('build:simudp', ['ascii', 'kadohBuild:simudp']);

  // load npm tasks
  grunt.loadNpmTasks('grunt-mocha-test');
};
