// Copyright (c) 2017
// Souparno Majumder (souparno.majumder@gmail.com)
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
var fs = require('fs');
var jsio = (function init() {
    var util = {
        slice: Array.prototype.slice,
        bind: function bind(method, context) {
            var args = util.slice.call(arguments, 2);

            return function () {
                return method.apply(context, args.concat(util.slice.call(arguments, 0)));
            };
        },
        resolveRelativePath: function (path) {
            var tempPath = path.replace(/\/+/g, '/').replace(/\/\.\//g, '/').replace(/\.\//g, '');

            do {
                path = tempPath;
                tempPath = tempPath.replace(/(^|\/)(?!\.?\.\/)([^\/]+)\/\.\.\//g, '$1');
            } while (path != tempPath);

            return path;
        },
        resolveModulePath: function (fromDir, request) {
            if (request.charAt(0) == '.') {
                request = util.resolveRelativePath([fromDir, request].join(''));
            }

            return [request + '.js', request + '/index.js'];

        },
        splitPath: function (path, result) {
            var i = path.lastIndexOf('/') + 1;

            result.directory = path.substring(0, i);
            result.flename = path.substring(i);
        }
    };

    function _require(fromDir, fromFile, item, opts) {
        return jsio.__require(fromDir, fromFile, item, opts);
    }

    function require(fromDir, fromFile, item) {
        var possibilities = util.resolveModulePath(fromDir, item);
        var moduleDef = jsio.__loadModule(possibilities);
        var newContext = {};

        // stops re-execution, if module allready executed
        if (!moduleDef.exports) {
            fromDir = moduleDef.directory;
            fromFile = moduleDef.filename;
            newContext = makeContext(newContext, fromDir, fromFile);
            //stops recursive dependencies from creating an infinite callbacks
            moduleDef.exports = newContext.exports;
            moduleDef.exports = jsio.__execModule(newContext, moduleDef);
        }
        return moduleDef.exports;
    }

    function setCache(cache) {
        jsio.__srcCache = cache;
    }

    function moduleDef(modulePath, src, exports) {
        util.splitPath(modulePath, this);
        this.modulePath = modulePath;
        this.src = src;
        this.exports = exports;
    }

    function loadModule(possibilities) {
        var srcCache = jsio.__srcCache,
                modules = jsio.__modules,
                modulePath, src, i;

        for (i = 0; i < possibilities.length; i++) {
            modulePath = possibilities[i];
            src = srcCache[modulePath];

            if (src) {
                if (!modules[modulePath]) {
                    modules[modulePath] = new moduleDef(modulePath, src);
                }

                return modules[modulePath];
            }
        }
    }

    function execModule(ctx, moduleDef) {
        moduleDef.src(ctx.jsio, moduleDef);

        return moduleDef.exports;
    }

    function makeContext(ctx, fromDir, fromFile) {
        ctx.exports = {};
        ctx.jsio = util.bind(_require, null, fromDir, fromFile);
        ctx.jsio.setCache = setCache;
        ctx.jsio.__require = require;
        ctx.jsio.__loadModule = loadModule;
        ctx.jsio.__execModule = execModule;
        ctx.jsio.__init = init;
        ctx.jsio.__util = util;
        ctx.jsio.__srcCache = {};
        ctx.jsio.__modules = {};

        return ctx;
    }

    return makeContext({}).jsio;
}());

// override jsio and make its properties extendable
jsio = (function (jsio, props) {
    for (var i = 0; i < props.length; i++) {
        jsio[props[i]].Extends = (function () {

            return function (fn) {
                var context = {supr: this};

                return jsio.__util.bind(fn, context);
            };
        }());
    }

    return jsio;
}(jsio, ['__require', '__loadModule', '__execModule']));

var fetch = function (p) {
    try {
        return fs.readFileSync(p, 'utf8');
    } catch (e) {
        return false;
    }
};

var preprocess = function (preprocessors, jsio, moduleDef) {
    var key, preprocessor;

    for (key in preprocessors) {
        preprocessor = preprocessors[key];
        preprocessor = jsio('packages/preprocessors/' + preprocessor);
        moduleDef.src = preprocessor(moduleDef, preprocessors, jsio);
    }
    moduleDef.src = eval(moduleDef.src);
};

var setCachedSrc = function (modulePath, src) {
    if (!jsio.__srcCache[modulePath]) {
        jsio.__srcCache[modulePath] = src;
    }
};

jsio.__execModule = jsio.__execModule.Extends(function (ctx, moduleDef) {
    jsio.__preprocess(ctx.jsio, moduleDef);

    return this.supr(ctx, moduleDef);
});

jsio.__loadModule = jsio.__loadModule.Extends(function (possibilities) {
    var src, modulePath, i;

    for (i = 0; i < possibilities.length; i++) {
        modulePath = possibilities[i];
        src = fetch(modulePath);

        if (src) {
            setCachedSrc(modulePath, "(function (require, module) {" + src + "})");

            return this.supr([modulePath]);
        }
    }
});

jsio.__require = jsio.__require.Extends(function (fromDir, fromFile, item, preprocessors) {
    jsio.__preprocess = jsio.__util.bind(preprocess, null, preprocessors);

    return this.supr(fromDir, fromFile, item);
});

module.exports = jsio;
