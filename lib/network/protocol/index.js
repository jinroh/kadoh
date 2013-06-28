exports.jsonrpc2 = require('./jsonrpc2');
exports.xmlrpc   = require('./xmlrpc');
exports.mainline = require('./mainline');

if(process.title !== 'browser') {
  //@browserify-ignore
  exports.node_xmlrpc = require('./node-xmlrpc');
}
