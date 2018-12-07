var srcTable = {};

function testComment(match) {
  return /\/\//.test(match[1]);
}

function getJsioSrc() {
  var src = jsio.__init.toString(-1);
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

exports = function(moduleDef, preprocessors, ctx) {
  var regex = /^(.*)jsio\s*\(\s*['"](.+?)['"]\s*(,\s*\{[^}]+\})?\)/gm;
  var match = regex.exec(moduleDef.src);

  if (match && !testComment(match)) {
    ctx.jsio(match[2], updatePreprocessors(preprocessors));
  }

  srcTable[moduleDef.path] = JSON.parse(JSON.stringify({
    src: moduleDef.src,
    path: moduleDef.path
  }));

  moduleDef.src = '';
};

exports.compile = function(request, preprocessors) {
  jsio(request, updatePreprocessors(preprocessors));
};

exports.generateSrc = function(callback) {
  var jsioSrc = getJsioSrc();

  jsioSrc = jsioSrc + "jsio.__setCache(" + JSON.stringify(srcTable) + ");";
  callback(jsioSrc);
};
