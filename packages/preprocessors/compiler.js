var srcTable = {};

function getJsioSrc() {
  var src = jsio.__init.toString(-1);
  if (src.substring(0, 8) == 'function') {
    src = 'var jsio=(' + src + '());';
  }
  return src;
};

function updatePreprocessors(preprocessors) {
  if (!preprocessors.indexOf('compiler')) {
    preprocessors.push('compiler');
  }
  return preprocessors;
};

exports = function(moduleDef, preprocessors) {
  var jsioNormal = /^(.*)jsio\s*\(\s*(['"].+?['"])\s*(,\s*\{[^}]+\})?\)/gm;
  var match = jsioNormal.exec(moduleDef.src);

  if (match) {
    var request = eval(match[2]);
    jsio(request, updatePreprocessors(preprocessors));
  }
  srcTable[moduleDef.path] = JSON.parse(JSON.stringify(moduleDef));
  moduleDef.src = '';
};

exports.compile = function(request) {
  jsio(request, ['import', 'compiler']);
};

exports.generateSrc = function(callback) {
  var jsioSrc = getJsioSrc();

  jsioSrc = jsioSrc + "jsio.__setModule(" + JSON.stringify(srcTable) + ");";
  callback(jsioSrc);
};
