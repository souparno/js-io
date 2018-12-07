var fs = require('fs');
var path = require('path');
var jsio = require('./jsio');


function ENV_node() {
    var _cwd = process.cwd();

    this.getPwd = function() {
        return _cwd;
    };

    this.fetch = function(p) {
        try {
            return fs.readFileSync(p, 'utf8');
        } catch (e) {
            return false;
        }
    };
}

var ENV = new ENV_node();

var findModule = function(possibilities) {
    // loop through the possibilities
    return {
        directory: path.dirname(modulePath),
        filename: path.basename(modulePath),
        pathname: this.directory + this.filename,
        src: ENV.fetch(modulePath)
    };
};

var preprocess = function(ctx, preprocessors, moduleDef) {
    for (var key in preprocessors) {
        var preprocessor = preprocessors[key];
        var request = 'import packages.preprocessors.' + preprocessor;

        preprocessor = ctx.jsio(request);
        preprocessor(moduleDef, preprocessors, ctx);
    }
};

jsio.__setModule = jsio.__setModule.Extends(function(modulePath, moduleDef) {
    if (!jsio.__modules[modulePath]) {
        jsio.__modules[modulePath] = moduleDef;
    }
});

jsio.__findModule = jsio.__findModule.Extends(function(possibilities) {
    var moduleDef = findModule(possibilities);

    jsio.__setModule(moduleDef.pathname, moduleDef);
    return this.supr(moduleDef.pathname);
});

jsio.__require = jsio.__require.Extends(function(ctx, fromDir, fromFile, item, preprocessors) {
    jsio.__preprocess = jsio.__util.bind(preprocess, null, ctx, preprocessors);

    return this.supr(ctx, fromDir, fromFile, item);
});

jsio.__makeContext = jsio.__makeContext.Extends(function(moduleDef) {
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
