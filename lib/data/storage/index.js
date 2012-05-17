if(process.title === 'browser') {
  module.exports = require('./lawnchair.js');
} else {
  module.exports = require('./basic');
}