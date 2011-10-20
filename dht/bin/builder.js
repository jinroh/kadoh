var fs = require('fs')
  , ugly = require('uglify-js')
  
  lib = [
  // LIST here the files to embed
    'globals'
  , 'node'  
  
  ];
  
  code = [];
  code_min = [];
  
  for(i in lib) {
    
    var file = lib[i];
    
    try{
      var content = fs.readFileSync(__dirname+'/../lib/'+file+'.js', 'utf-8');

      code.push(content);

      var ast = ugly.parser.parse(content);
      ast = ugly.uglify.ast_mangle(ast)
      ast = ugly.uglify.ast_squeeze(ast)
      var min = ugly.uglify.gen_code(ast);

      code_min.push(min);
      
      console.log("Build : success in adding "+ file);
      
    }catch(err){
     console.log("Build : unable to read "+ file); 
    }
  };
  
  fs.writeFileSync('./dist/KadOH.js', code.join('\n'), 'utf-8');
  console.log("Build : KadOH.js completed");
  
  fs.writeFileSync('./dist/KadOH.min.js', code_min.join('\n'), 'utf-8');
  console.log("Build : KadOH.min.js completed");
  
  
  