switch(process.env.KADOH_ITERFIND) {
  default :
  case '1':
    module.exports = require('./iterativefind-1.js');
    break;

  case '2':
    module.exports = require('./iterativefind-2.js');
    break;

  case '3':
    module.exports = require('./iterativefind-3.js');
    break;
}