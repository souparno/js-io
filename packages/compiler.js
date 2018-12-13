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
    var src, modulePath;

    for (var i = 0; i < possibilities.length; i++) {
        modulePath = possibilities[i];
        src = ENV.fetch(modulePath);

        if (src) {
            return {
                directory: path.dirname(modulePath),
                filename: path.basename(modulePath),
                src: src
            };
        }
    }
};

var preprocess = function (ctx, preprocessors, moduleDef) {
    for (var key in preprocessors) {
        var preprocessor = preprocessors[key];
        var request = 'import .packages.preprocessors.' + preprocessor;

        preprocessor = ctx.jsio(request);
        preprocessor(moduleDef, preprocessors, ctx);
    }
};

jsio.__loadModule = jsio.__loadModule.Extends(function (possibilities) {
    var moduleDef = findModule(possibilities);
    var modulePath = moduleDef.directory + "/" + moduleDef.filename;
    
    jsio.__setModule(modulePath);
    return this.supr(possibilities);
});

jsio.__require = jsio.__require.Extends(function (ctx, fromDir, fromFile, item, preprocessors) {
    jsio.__preprocess = jsio.__util.bind(preprocess, null, ctx, preprocessors);

    return this.supr(ctx, fromDir, fromFile, item);
});

jsio.__makeContext = jsio.__makeContext.Extends(function (moduleDef) {
    var context = this.supr(moduleDef);
    var fromDir = moduleDef.fromDir;
    var fromFile = moduleDef.fromFile;

    context.jsio = jsio.__util.bind(jsio.__require, null, context, fromDir, fromFile);
    return context;
});

module.exports = jsio.__makeContext({
    fromDir: ENV.getPwd(),
    fromFile: 'jsio'
}).jsio;
