var fs = require('fs');
var jsio = require('./jsio');

var getModule = function (p) {
    try {
        return fs.readFileSync(p, 'utf8');
    } catch (e) {
        return false;
    }
};

var findModule = function (possibilities) {
    var src, modulePath, moduleDef;

    for (var i = 0; i < possibilities.length; i++) {
        modulePath = possibilities[i];
        src = getModule(modulePath);

        if (src) {
            moduleDef = jsio.__util.splitPath(modulePath);
            moduleDef.src = "(function (__) { with (__) {" + src + "}});";
            moduleDef.modulePath = modulePath;

            return moduleDef;
        }
    }
};

var preprocess = function (preprocessors, ctx, moduleDef) {
    for (var key in preprocessors) {
        var preprocessor = preprocessors[key];
        var request = 'import packages.preprocessors.' + preprocessor;

        preprocessor = ctx.jsio(request);
        preprocessor(moduleDef, preprocessors, ctx);
    }
};

var setModule = function (modulePath, moduleDef) {
    if (!jsio.__modules[modulePath]) {
        jsio.__modules[modulePath] = moduleDef;
    }
};

jsio.__loadModule = jsio.__loadModule.Extends(function (possibilities) {
    var moduleDef = findModule(possibilities);
    var modulePath = moduleDef.modulePath;

    setModule(modulePath, moduleDef);
    return this.supr(possibilities);
});

jsio.__execModule = jsio.__execModule.Extends(function (ctx, moduleDef) {
    jsio.__preprocess(ctx, moduleDef);

    return this.supr(ctx, moduleDef);
});

jsio.__require = jsio.__require.Extends(function (ctx, fromDir, fromFile, item, preprocessors) {
    jsio.__preprocess = jsio.__util.bind(preprocess, null, preprocessors);

    return this.supr(ctx, fromDir, fromFile, item);
});

module.exports = jsio;