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

function updatePreprocessors(preprocessors) {
    if (preprocessors.length == 1) {
        preprocessors.push('browserify');
    }

    return preprocessors;
}

function replace(raw, p1, p2, p3, p4) {
    return p1 + '' + p4;
}

exports = function (moduleDef, preprocessors, ctx) {
    var regexFuncBody = /^(\(\s*function\s*\([_]+\)\s*\{\s*with\s*\([_]+\)\s*\{)((\n*.*)*)(\n*\s*\}\n*\s*\}\n*\s*\))/gm;
    var regex = /^(.*)jsio\s*\(\s*['"](.+?)['"]\s*(,\s*\{[^}]+\})?\)/gm;
    var match = regex.exec(moduleDef.src);

    if (match && !testComment(match)) {
        exports.run(ctx.jsio, match[2], preprocessors);
    }

    srcTable[moduleDef.modulePath] = moduleDef.src;
    // replaces the function body with ''
    moduleDef.src = moduleDef.src.replace(regexFuncBody, replace);
};

exports.run = function (jsio, request, preprocessors) {
    jsio(request, updatePreprocessors(preprocessors));
};

exports.generateSrc = function (callback) {
    var str = getJsioSrc() + "jsio.__setModule({";

    for (var prop in srcTable) {
        str = str + JSON.stringify(prop) + ":" + srcTable[prop] + ",";
    }
    str = str + "});";

    callback(str);
};
