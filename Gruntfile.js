require('colors');
var browserify = require('browserify');
var tagify = require('tagify');
var path = require('path');
var UIGenerator = require('./UI/generator');

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    mochaTest: {
      test: {
        src: ['test/**/*.js']
      }
    },

    kadohBuild: {
      options: {
        debug: grunt.option('debug')
      },
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
    },

    generateUI: {
      mainline: {
        files: {
          'apps/mainline/index.html': ['apps/mainline/conf.json']
        }
      },
      udp: {
        files: {
          'apps/udp/index.html': ['apps/udp/conf.json']
        }
      },
      xmpp: {
        files: {
          'apps/xmpp/index.html': ['apps/xmpp/conf.json']
        }
      }
    }
  });

  // ascii task
  grunt.registerTask('ascii', 'Print kadoh ascii', function() {
    var logo = grunt.file.read('kadoh.ascii.txt');
    grunt.log.writeln(logo.yellow);
  });

  // build kadoh task
  // TODO: replace me with proper browserify task ASA
  // we switch to browserify v2
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

  // gnerate UI task
  grunt.registerMultiTask('generateUI', 'Generate UI', function() {
    this.files.forEach(function(file) {
      if(file.src.length !== 1)
        return grunt.fail.warn('You should specify one conf file');
      
      var conf = file.src[0];
      grunt.file.write(file.dest, UIGenerator.generate(conf));
    });
  });

  // defautl task
  grunt.registerTask('default', ['ascii']);

  // tests tasks aliases
  grunt.registerTask('test:node', ['ascii', 'mochaTest:test']);

  // build tasks aliases
  grunt.registerTask('build:xmpp', ['ascii', 'kadohBuild:xmpp']);
  grunt.registerTask('build:simudp', ['ascii', 'kadohBuild:simudp']);

  // generate tasks aliases
  grunt.registerTask('generate:xmpp', ['ascii', 'generateUI:xmpp']);
  grunt.registerTask('generate:simudp', ['ascii', 'generateUI:simudp']);
  grunt.registerTask('generate:mainline', ['ascii', 'generateUI:mainline']);

  // load npm tasks
  grunt.loadNpmTasks('grunt-mocha-test');
};
