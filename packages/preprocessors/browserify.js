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

exports = function (moduleDef, preprocessors, ctx) {
    var regex = /^(.*)jsio\s*\(\s*['"](.+?)['"]\s*(,\s*\{[^}]+\})?\)/gm;
    var match = regex.exec(moduleDef.src);

    if (match && !testComment(match)) {
        ctx.jsio(match[2], updatePreprocessors(preprocessors));
    }

    srcTable[moduleDef.modulePath] = JSON.parse(JSON.stringify({
        dirname: moduleDef.dirname,
        filename: moduleDef.filename,
        src: moduleDef.src
    }));

    moduleDef.src = '';
};

exports.compile = function (request, preprocessors) {
    jsio(request, updatePreprocessors(preprocessors));
};

exports.generateSrc = function (callback) {
    var jsioSrc = getJsioSrc();

    jsioSrc = jsioSrc + "jsio.__setModule(" + JSON.stringify(srcTable) + ");";
    callback(jsioSrc);
};