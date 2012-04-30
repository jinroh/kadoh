mu = require('mustache');
fs = require('fs');

/**
 * Generate the html diven the path to the conf file.
 *
 * @param  {String} path path to the conf file
 * @return {String}      generated html
 */
exports.generate = function(path) {
 var dirpath = require('path').dirname(path);
 var def_conf = JSON.parse(fs.readFileSync(path, 'ascii'));
 var conf = mergeConf(def_conf, dirpath);
 return generateFromConf(conf);
};

/**
 * Merge the provided configuration with the default one.
 * Final configuration computed regarding the conf file relative path.
 *
 * @param  {Object} conf    conf to merge
 * @param  {String} dirpath realtiv drectory path
 * @return {Object}         Absolute configuration
 */
var mergeConf = function(conf, dirpath) {
  var defolt = JSON.parse(fs.readFileSync(__dirname+'/conf.default.json', 'ascii'));

  var fin = {};

  //template
  fin.template = conf.template ? dirpath+'/'+conf.template : __dirname+'/'+defolt.template;

  //kadoh-lib
  fin['KadOH-lib'] = conf['KadOH-lib'] ? conf['KadOH-lib'] : defolt['KadOH-lib'];
  

  //tabs
  fin.tabs = conf.tabs ? conf.tabs : defolt.tabs;

  //tabs ressources
  var i, res;
  fin['tabs-ressources'] = {};
  defolt['tabs-ressources'] = defolt['tabs-ressources'] || null;

  for(i in defolt['tabs-ressources']) {
    res = defolt['tabs-ressources'][i];
    res.html = __dirname+'/'+res.html;
    fin['tabs-ressources'][i] = res;
  }

  for(i in conf['tabs-ressources']) {
    res = conf['tabs-ressources'][i];
    res.html = dirpath+'/'+res.html;
    fin['tabs-ressources'][i] = res;
  }

  fin['connection-ressources'] = conf['connection-ressources'];
  fin['connection-ressources'].html = dirpath+'/'+fin['connection-ressources'].html;

  fin['init-script'] = dirpath+'/'+conf['init-script'];

  return fin;
};



/**
 * Generate the html given the absolute configuration.
 *
 * @param  {Object} conf should be an absolute conf
 * @return {String}      generated UI html
 */
var generateFromConf = function(conf) {
  var tmpl = fs.readFileSync(conf.template, 'ascii');

  var view = {};
  view.tabs = [];
  view['KadOH-lib'] = conf['KadOH-lib'];

  for(var i in conf.tabs) {
    var tab = conf['tabs-ressources'][conf.tabs[i]];
    tab.name = conf.tabs[i];

    view.tabs.push({
      script : tab.js,
      li :  '<li'+(i === '0' ? ' class="active"' : '')+'><a href="#'+tab.href+'" data-toggle="tab">'+tab.name+'</a></li>',
      content : tab.html ? fs.readFileSync(tab.html, 'ascii') : null
    });
  }

  view.connection = (conf['connection-ressources'] !== null) ?
                      fs.readFileSync(conf['connection-ressources'].html, 'ascii')
                    : null;

  view['init_script'] = (typeof conf['init-script'] == 'string') ?
                      fs.readFileSync(conf['init-script'], 'ascii')
                    : null;

  //console.error(conf, view);

  return mu.to_html(tmpl, view);
};

if(require.main === module) {
  var path = require('path').join(process.cwd(), process.argv[2]);
  console.log(exports.generate(path));
}