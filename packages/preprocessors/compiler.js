var srcTable = {};

function getJsioSrc() {
  var src = jsio.__quine.toString(-1);
  if (src.substring(0, 8) == 'function') {
    src = 'var jsio=(' + src + '());';
  }

  return src;
};

function updatePreprocessors(preprocessors) {
  if (preprocessors.length == 1) {
    preprocessors.push('compiler');
  }

  return preprocessors;
};

exports = function(moduleDef, preprocessors) {
  var jsioNormal = /^(.*)jsio\s*\(\s*(['"].+?['"])\s*(,\s*\{[^}]+\})?\)/gm;
  var match = jsioNormal.exec(moduleDef.src);

  if (match) {
    jsio(eval(match[2]), updatePreprocessors(preprocessors));
  }

  srcTable[moduleDef.path] = JSON.parse(JSON.stringify(moduleDef));
  moduleDef.src = '';
};

exports.compile = function(request) {
  jsio(request, updatePreprocessors(jsio.__preprocessors));
};

exports.generateSrc = function(callback) {
  var jsioSrc = getJsioSrc();

  jsioSrc = jsioSrc + "jsio.__setModules(" + JSON.stringify(srcTable) + ");";
  callback(jsioSrc);
};
