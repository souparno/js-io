var fs = require('fs');
var path = require('path');
var jsio = require('./jsio');


function ENV_node() {
    var _cwd = process.cwd();

    this.getPwd = function () {
        return _cwd;
    };

    this.fetch = function (p) {
        try {
            return fs.readFileSync(p, 'utf8');
        } catch (e) {
            return false;
        }
    };
}

var ENV = new ENV_node();

var findModule = function (possibilities) {
    var src, modulePath, dirname, filename;

    for (var i = 0; i < possibilities.length; i++) {
        modulePath = possibilities[i];
        src = ENV.fetch(modulePath);

        if (src) {
            dirname = path.dirname(modulePath);
            filename = path.basename(modulePath);
            modulePath = dirname + "/" + filename;

            return {
                dirname: dirname,
                filename: filename,
                modulePath: modulePath,
                src: src
            };
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

jsio.__loadModule = jsio.__loadModule.Extends(function (possibilities) {
    var moduleDef = findModule(possibilities);
    var modulePath = moduleDef.modulePath;

    jsio.__setModule(modulePath, moduleDef);
    return this.supr(possibilities);
});

jsio.__require = jsio.__require.Extends(function (ctx, fromDir, fromFile, item, preprocessors) {
    jsio.__preprocess = jsio.__util.bind(preprocess, null, preprocessors);

    return this.supr(ctx, fromDir, fromFile, item);
});

module.exports = jsio;