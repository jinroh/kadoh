exports.jsonrpc2    = require('./jsonrpc2');
exports.xmlrpc      = require('./xmlrpc');

if(process.title !== 'browser') {
  //@browserify-ignore
  exports.node_xmlrpc = require('./node-xmlrpc');
  //@browserify-ignore
  exports.mainline    = require('./mainline');
}
