var fs = require('fs')
  , ugly = require('uglify-js');
  
var LIB_DIR = __dirname + '/../lib/';
var DIST_DIR = __dirname + '/../dist/';
  
// LIST here the files to embed
var LIB = [
    'core/class'
  , 'globals'
  , 'crypto'
  , 'node'
  , 'routingtable'
  , 'kbucket'
  , 'peer'
];

code = [];
code_min = [];

for(i in LIB) {
  
  var file = LIB[i] + '.js';
  var path = LIB_DIR + file;
  
  try {
    var content = fs.readFileSync(path, 'utf-8');

    code.push(content);

    var ast = ugly.parser.parse(content);
    ast = ugly.uglify.ast_mangle(ast)
    ast = ugly.uglify.ast_squeeze(ast)
    var min = ugly.uglify.gen_code(ast);

    code_min.push(min);
    
    console.log('Build : success in adding ' + file);
  }
  catch(err) {
    console.log(err);
    console.log('Build : unable to read ' + file); 
  }
  
};

fs.writeFileSync(DIST_DIR + 'KadOH.js', code.join('\n'), 'utf-8');
console.log("Build : KadOH.js completed");

fs.writeFileSync(DIST_DIR + 'KadOH.min.js', code_min.join('\n'), 'utf-8');
console.log('Build : KadOH.min.js completed');
  