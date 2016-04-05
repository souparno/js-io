import packages.util.path as path;

var JSIO = jsio.__jsio;
gSrcTable = {};

function testComment(match) {
  return !/\/\//.test(match[1]);
};

function getJsioSrc() {
  var src = JSIO.__init.toString(-1);
  if (src.substring(0, 8) == 'function') {
    src = 'jsio=(' + src + ')();';
  }
  return src;
};

function updateOpts() {
  return {
    preprocessors: ['import', 'compiler']
  };
};

exports = function(moduleDef) {
  var jsioNormal = /^(.*)jsio\s*\(\s*(['"].+?['"])\s*(,\s*\{[^}]+\})?\)/gm;

  while (true) {
    var match = jsioNormal.exec(moduleDef.src);
    if (!match) {
      break;
    }
    if (!testComment(match)) {
      continue;
    }
    var cmd = match[2];

    try {
      cmd = eval(cmd);
    } catch (e) {
      continue;
    }

    try {
      JSIO.__require({}, moduleDef.directory, cmd, updateOpts());
    } catch (e) {}
  }

  gSrcTable[moduleDef.friendlyPath] = JSON.parse(JSON.stringify(moduleDef));
  return '';
};

function replaceSlashes(str) {
  return str.replace(/\\+/g, '/').replace(/\/{2,}/g, '/');
}
exports.generateSrc = function(callback) {
  var jsioSrc = getJsioSrc(),
    cwd = JSIO.__env.getCwd(),
    table = {};

  for (var entry in gSrcTable) {
    var relPath = replaceSlashes(path.relative(cwd, entry));
    table[relPath] = gSrcTable[entry];
    table[relPath].path = relPath;
    table[relPath].directory = replaceSlashes(path.relative(cwd, gSrcTable[entry].directory));
  }
  callback(jsioSrc + "jsio.setCache(" + JSON.stringify(table) + ");");
};

exports.compile = function(statement) {
  JSIO(statement, updateOpts());
};
