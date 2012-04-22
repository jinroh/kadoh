switch(process.env.KADOH_ITERFIND) {
  default :
  case '1':
    module.exports = require('./IterativeFind-1.js');
    break;

  case '2':
    module.exports = require('./IterativeFind-2.js');
    break;

  case '3':
    module.exports = require('./IterativeFind-3.js');
    break;
}