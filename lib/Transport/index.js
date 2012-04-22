if (process.title === 'node') {
  switch (process.env.KADOH_TRANSPORT) {

  default:
  case 'xmpp':
    module.exports = require('./Transport-node-xmpp');
    break;

  case 'udp':
    module.exports = require('./Transport-udp') ;
    break;

  }
}else if (process.title === 'browser') {
  switch (process.env.KADOH_TRANSPORT) {

  default:
  case 'xmpp':
    module.exports = require('./Transport-strophe');
    break;

  case 'simudp':
    module.exports = require('./Transport-simudp');
    break;
  }
}