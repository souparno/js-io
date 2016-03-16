JSIO = jsio.__jsio;
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

function updateOpts(opts) {
  opts = opts || {
    preprocessors: ['import', 'compiler']
  };

  if (!opts.preprocessors.indexOf('compiler')) {
    opts.preprocessors.push('compiler');
  }
  return opts;
}

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

exports.generateSrc = function(callback) {
  var jsioSrc = getJsioSrc(),
    table = {};

  for (var entry in gSrcTable) {
    table[entry] = gSrcTable[entry];
    table[entry].path = entry;
    table[entry].directory = gSrcTable[entry].directory;
  }
  callback(jsioSrc + "jsio.setCache(" + JSON.stringify(table) + ");");
};

exports.compile = function(statement) {
  JSIO(statement, updateOpts());
};
