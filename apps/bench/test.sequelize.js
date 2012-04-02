var Sequelize = require("sequelize");

var sequelize = new Sequelize('database', 'root', null, {

  dialect: 'sqlite',

  storage: __dirname + '/db/test.db'
});

var Project = sequelize.define('Project', {
  title: Sequelize.STRING,
  description: Sequelize.TEXT
});

Project.sync().success(function() {
  console.log(arguments);
  var project = Project.build({
    title: 'my awesome project',
    description: 'woot woot. this will make me a rich man'
  });

  project.save().success(function() {
    console.log(arguments);
  }).error(function() {
    console.log(arguments);
  });

}).error(function() {
  console.log(arguments);
});