"use strict";
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
}

function getSrcCache() {
    var str = "{";

    for (var prop in srcTable) {
        str = str + JSON.stringify(prop) + ":" + srcTable[prop] + ",";
    }

    return str.substring(0, str.length - 1) + "}";
}

function replace(raw, p1, p2, p3, p4) {
    return p1 + '' + p4;
}

module.exports = function (moduleDef, preprocessors, jsio) {
    var removeFuncBody = /^(\(\s*function\s*\([^=+*"'\r\n.;]+\)\s*\{)((\s*.*)*)(\s*\}\s*\))/gm;
    var requireRegex = /^(.*)require\s*\(\s*['"](.+?)['"]\s*(,\s*\{[^}]+\})?\)/gm;
    var match;

    do {
        match = requireRegex.exec(moduleDef.src);
        if (match && !testComment(match)) {
            jsio(match[2], preprocessors);
        }
    } while (match)

    srcTable[moduleDef.path] = moduleDef.src;
    // stops eval module src by removing body
    moduleDef.src = moduleDef.src.replace(removeFuncBody, replace);
};

module.exports.generateSrc = function (callback) {
    var str = getJsioSrc() + "jsio.setCache(" + getSrcCache() + ");";

    callback(str);
};
