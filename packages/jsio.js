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
"use strict";
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

            return (request.indexOf('.') == -1) ? [request + '.js', request + '/index.js'] : [request];
        },
        splitPath: function (path, result) {
            var i = path.lastIndexOf('/') + 1;

            result.directory = path.substring(0, i);
            result.filename = path.substring(i);
        }
    };

    function _require(fromDir, fromFile, item, opts) {
        return jsio.__require(fromDir, fromFile, item, opts);
    }

    function require(fromDir, fromFile, item) {
        var possibilities = util.resolveModulePath(fromDir, item);
        var moduleDef = jsio.__findModule(possibilities);

        if (!moduleDef.exports) {
            moduleDef.exports = {};
            fromDir = moduleDef.directory;
            fromFile = moduleDef.filename;
            jsio.__execModule(makeContext(fromDir, fromFile), moduleDef);
        }
        return moduleDef.exports;
    }

    function setCache(cache) {
        jsio.__srcCache = cache;
    }

    function ModuleDef(path, src, exports) {
        util.splitPath(path, this);
        this.path = path;
        this.src = src;
        this.exports = exports;
    }

    function findModule(possibilities) {
        var srcCache = jsio.__srcCache,
                modules = jsio.__modules,
                path, cachedVersion, i;

        for (i = 0; i < possibilities.length; i++) {
            path = possibilities[i];
            cachedVersion = srcCache[path];

            if (cachedVersion) {
                if (!modules[path]) {
                    modules[path] = new ModuleDef(path, cachedVersion);
                }

                return modules[path];
            }
        }
    }

    function execModule(jsio, moduleDef) {
        var fn = moduleDef.src, exports = moduleDef.exports;

        fn.call(exports, jsio, moduleDef);
    }

    function makeContext(fromDir, fromFile) {
        var jsio = util.bind(_require, null, fromDir, fromFile);

        jsio.setCache = setCache;
        jsio.__require = require;
        jsio.__findModule = findModule;
        jsio.__execModule = execModule;
        jsio.__init = init;
        jsio.__util = util;
        jsio.__srcCache = {};
        jsio.__modules = {};

        return jsio;
    }

    return makeContext();
}());

// override jsio and make its properties extendable
jsio = (function (jsio, props) {
    for (var i = 0; i < props.length; i++) {
        jsio[props[i]].Extends = function (fn) {
            var context = {supr: this};

            return jsio.__util.bind(fn, context);
        };
    }

    return jsio;
}(jsio, ['__require', '__findModule', '__execModule']));

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

var setCachedSrc = function (path, src) {
    if (!jsio.__srcCache[path]) {
        jsio.__srcCache[path] = src;
    }
};

jsio.__execModule = jsio.__execModule.Extends(function (JSIO, moduleDef) {
    jsio.__preprocess(JSIO, moduleDef);

    this.supr(JSIO, moduleDef);
});

jsio.__findModule = jsio.__findModule.Extends(function (possibilities) {
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
