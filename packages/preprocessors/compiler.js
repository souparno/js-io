JSIO = jsio.__jsio;
gSrcTable = {};

function testComment(match) {
    return !/\/\//.test(match[1]);
};

function updateOpts(opts){
  opts = opts || {preprocessors: ['import', 'compiler']};
  
  if(!opts.preprocessors.indexOf('compiler')){
    opts.preprocessors.push('compiler'); 
  } 
  return opts;
}

exports = function(moduleDef, opts) {
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
            JSIO(cmd, updateOpts(opts));
        } catch (e) {}
    }

    gSrcTable[moduleDef.path] = moduleDef;
    
    return '';
};

exports.generateSrc = function(callback) {
    function getJsioSrc() {
        var src = JSIO.__init.toString(-1);
        if (src.substring(0, 8) == 'function') {
            src = 'jsio=(' + src + ')();';
        }
        return src;
    }

    var src;
    var jsioSrc = getJsioSrc();

    var table = {};
    for (var entry in gSrcTable) {
        var relPath = entry;
        table[relPath] = gSrcTable[entry];
        table[relPath].path = relPath;
        table[relPath].directory = gSrcTable[entry].directory;
    }

    src = jsioSrc + "jsio.setCache(" + JSON.stringify(table) + ");";
    callback(src);
};

exports.compile = function(statement) {
    JSIO(statement, updateOpts());
};
