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
var vm = require('vm');
var jsio = (function init() {
    var util = {
        slice: Array.prototype.slice,
        bind: function bind(method, context) {
            var args = util.slice.call(arguments, 2);

            return function() {
                var argv = args.concat(util.slice.call(arguments, 0));

                return method.apply(context, argv);
            };
        },
        concat: function() {
            var i, pieces = [];

            for (i = 0; i < arguments.length; i++) {
                pieces.push(arguments[i]);
            }

            return pieces.join('');
        },
        isRelativePath: function(path) {
            return path.charAt(0) == '.' ? true : false;
        },
        getPossiblePaths: function(modulePath) {
            if (modulePath.indexOf('.') == -1) {
                return [
                    util.concat(modulePath, '.js'),
                    util.concat(modulePath, '/index.js')
                ];
            }

            return [modulePath];
        },
        splitPath: function(path, result) {
            var i = path.lastIndexOf('/') + 1;

            result.directory = path.substring(0, i);
            result.filename = path.substring(i);
        }
    };

    var jsioSrcCache = {};

    var jsioModuleCache = {};

    var jsioPathCache = [];

    function resolveRelativePath(path) {
        var tempPath = path.replace(/\/+/g, '/').replace(/\/\.\//g, '/').replace(/\.\//g, '');

        do {
            path = tempPath;
            tempPath = tempPath.replace(/(^|\/)(?!\.?\.\/)([^\/]+)\/\.\.\//g, '$1');
        } while (path != tempPath);

        return path;
    }

    function resolveModulePath(directory, modulePath) {
        if (util.isRelativePath(modulePath)) {
            modulePath = resolveRelativePath(util.concat(directory, modulePath));

            return util.getPossiblePaths(modulePath);
        }

        var pathSegments = modulePath.split('/');
        var subpath = pathSegments.slice(0, 1).join('/');
        var pathString = pathSegments.slice(1).join('/');
        var value = jsio.__pathCache[subpath];

        if (value) {
            pathString = pathString.length ? pathString : subpath;
            modulePath = util.concat(value, pathString);

            return util.getPossiblePaths(modulePath);
        }

        return util.getPossiblePaths(modulePath);
    }

    function _require(fromDir, fromFile, item, opts) {
        return jsio.__require(fromDir, fromFile, item, opts);
    }

    function require(fromDir, fromFile, item) {
        var moduleDef = jsio.__loadModule(fromDir, item);

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

    function setCachePath(pathCache) {
        jsio.__pathCache = pathCache;
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

    function loadModule(fromDir, item) {
        return jsio.__findModule(resolveModulePath(fromDir, item));
    }

    function execModule(jsio, moduleDef) {
        var fn = moduleDef.src,
            exports = moduleDef.exports;

        fn.call(exports, jsio, moduleDef);
    }

    function makeContext(fromDir, fromFile) {
        var jsio = util.bind(_require, null, fromDir, fromFile);

        jsio.setCachePath = setCachePath;
        jsio.setCache = setCache;
        jsio.__require = require;
        jsio.__loadModule = loadModule;
        jsio.__findModule = findModule;
        jsio.__execModule = execModule;
        jsio.__srcCache = jsioSrcCache;
        jsio.__modules = jsioModuleCache;
        jsio.__pathCache = jsioPathCache;
        jsio.__init = init;
        jsio.__util = util;

        return jsio;
    }

    return makeContext();
}());

// override jsio and makes its properties extendable
jsio = (function(jsio, props) {
    for (var i = 0; i < props.length; i++) {
        jsio[props[i]].Extends = function(fn) {

            return jsio.__util.bind(fn, {
                supr: this
            });
        };
    }

    return jsio;
}(jsio, ['__require', '__loadModule', '__findModule', '__execModule']));

var fetch = function(p) {
    try {
        return fs.readFileSync(p, 'utf8');
    } catch (e) {
        return false;
    }
};

var Eval = function(moduleDef) {
    moduleDef.src = vm.runInThisContext(moduleDef.src);

    return moduleDef;
};

var preprocess = function(preprocessors, JSIO, moduleDef) {
    var key, preprocessor;

    for (key in preprocessors) {
        preprocessor = jsio(preprocessors[key]);
        preprocessor(moduleDef, preprocessors, JSIO);
    }
};

var setCachedSrc = function(path, src) {
    if (!jsio.__srcCache[path]) {
        jsio.__srcCache[path] = src;
    }
};

var setPathCache = function(baseMod, modulePath) {
    if (!(baseMod in jsio.__pathCache)) {
        jsio.__pathCache[baseMod] = modulePath;
    }
};

jsio.__execModule = jsio.__execModule.Extends(function(JSIO, moduleDef) {
    jsio.__preprocess(JSIO, moduleDef);

    this.supr(JSIO, Eval(moduleDef));
});

jsio.__findModule = jsio.__findModule.Extends(function(possibilities) {
    var src, modulePath, i;

    for (i = 0; i < possibilities.length; i++) {
        modulePath = possibilities[i];
        src = fetch(modulePath);

        if (src) {
            //src = jsio.__util.concat("(function (exports, require, module, __filename, __dirname) {", src, "})");
            src = jsio.__util.concat("(function (require, module) {", src, "})");
            setCachedSrc(modulePath, src);

            return this.supr([modulePath]);
        }
    }
});

jsio.__loadModule = jsio.__loadModule.Extends(function(fromDir, item) {
    var moduleDef = this.supr(fromDir, item),
        baseMod = item.split('/')[0],
        jsioPaths, modulePath, i;

    if (!moduleDef) {
        jsioPaths = jsio.path.get();

        for (i = 0; i < jsioPaths.length; i++) {
            modulePath = jsio.__util.concat(jsioPaths[i], item);
            moduleDef = jsio.__findModule(jsio.__util.getPossiblePaths(modulePath));

            if (moduleDef) {
                setPathCache(baseMod, moduleDef.directory);

                return this.supr(fromDir, item);
            }
        }
    }

    return moduleDef;
});

jsio.__require = jsio.__require.Extends(function(fromDir, fromFile, item, preprocessors) {
    jsio.__preprocess = jsio.__util.bind(preprocess, null, preprocessors);

    return this.supr(fromDir, fromFile, item);
});

jsio.path = {
    get: function() {
        return jsio.path.value.slice(0);
    },
    add: function(path) {
        jsio.path.value.push(path);
    },
    value: []
};

module.exports = jsio;