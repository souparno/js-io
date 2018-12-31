import packages.util.underscore as _

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

exports = function (moduleDef, preprocessors, ctx) {
    var removeFuncBody = /^(\(\s*function\s*\([_]+\)\s*\{\s*with\s*\([_]+\)\s*\{)((\s*.*)*)(\s*\}\s*\}\s*\))/gm;
    var jsioNormal = /^(.*)jsio\s*\(\s*['"](.+?)['"]\s*(,\s*\{[^}]+\})?\)/gm;
    var match;

    do {
        match = jsioNormal.exec(moduleDef.src);
        if (match && !testComment(match)) {
            exports.run(ctx.jsio, match[2], preprocessors);
        }
    } while (match)

    srcTable[moduleDef.modulePath] = moduleDef.src;
    // stops eval module src by removing body
    return moduleDef.src.replace(removeFuncBody, replace);
};

exports.run = function (jsio, request, preprocessors) {
    jsio(request, preprocessors);
};

exports.generateSrc = function (callback) {
    var str = getJsioSrc() + "jsio.setCache(" + getSrcCache() + ");";

    callback(str);
};
