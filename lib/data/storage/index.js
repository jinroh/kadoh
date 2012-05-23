if(process.title === 'browser') {
  module.exports = require('./lawnchair.js');
} else {
  //@browserify-ignore
  module.exports = require('./basic');
}