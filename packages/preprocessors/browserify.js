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

function run(jsio, request, preprocessors) {
    jsio(request, updatePreprocessors(preprocessors));
}

exports = function (moduleDef, preprocessors, ctx) {
    var regex = /^(.*)jsio\s*\(\s*['"](.+?)['"]\s*(,\s*\{[^}]+\})?\)/gm;
    var match = regex.exec(moduleDef.src);

    if (match && !testComment(match)) {
        run(ctx.jsio, match[2], preprocessors);
    }

    srcTable[moduleDef.modulePath] = {
        dirname: moduleDef.dirname,
        filename: moduleDef.filename,
        src: moduleDef.src
    };

    moduleDef.src = '(function (){})';
};

exports.run = function (request, preprocessors) {
    run(jsio, request, preprocessors);
};

exports.generateSrc = function (callback) {
    var jsioSrc = getJsioSrc();

    jsioSrc = jsioSrc + "jsio.__setModule(" + JSON.stringify(srcTable) + ");";
    callback(jsioSrc);
};
