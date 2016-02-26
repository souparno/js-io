var jsio = require('./jsio');
var fs = require('fs');

var applyPreprocessors = function(src) {
  var importExpr = /^(\s*)(import\s+[^=+*"'\r\n;\/]+|from\s+[^=+"'\r\n;\/ ]+\s+import\s+[^=+"'\r\n;\/]+)(;|\/|$)/gm;
  return src.replace(importExpr,
    function(raw, p1, p2, p3) {
      if (!/\/\//.test(p1)) {
        return p1 + 'jsio(\'' + p2 + '\')' + p3;
      }
      return raw;
    });
};

function loadModule(path) {
  var result = [],
    parts = path.split('.'),
    len = parts.length,
    i = -1;

  while (++i < len) {
    result.push(parts[i]);
  }

  var _path = result.join('/') + ".js";
  var src = applyPreprocessors(fs.readFileSync(_path, 'utf8'));
  jsio.__modules[path] = {
    path: path,
    src: src
  }

  return jsio.__modules[path];
};



function getJsioSrc(argument) {
  var src = 'jsio=(' + jsio.__clone.toString() + ')();' + "jsio.setModules(" + JSON.stringify(jsio.__modules) + ");jsio('import " + argument + "')";
  return src;
}


var argument = process.argv[2].split('/');
argument = argument.join('.');
jsio('import ' + argument, null, loadModule);
console.log(getJsioSrc(argument));
