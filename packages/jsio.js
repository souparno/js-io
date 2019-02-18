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
        buildPath: function (){
            var i, pieces = [];

            for (i = 0; i < arguments.length; i++) {
                pieces.push(arguments[i]);
            }

            return util.resolveRelativePath(pieces.join('/')); 
        },
        isRelativePath: function(path) {
            return path.charAt(0) == '.' ? true : false;
        },
        getExtension: function(modulePath) {
            var moduleSegments = modulePath.split('.');
            var ext = moduleSegments[moduleSegments.length - 1];

            if (ext == "js" || ext == "json") {
                return ext;
            }

            return false;
        },
        getPossiblePaths: function(modulePath) {
            if (util.getExtension(modulePath)) {
                return [util.buildPath(modulePath)];
            }

            return [
                util.concat(util.resolveRelativePath(modulePath), '.js'),
                util.buildPath(modulePath, 'index.js'),
            ];
        },
        resolveRelativePath: function(path) {
            var tempPath = path.replace(/\/+/g, '/').replace(/\/\.\//g, '/');

            do {
                path = tempPath;
                tempPath = tempPath.replace(/(^|\/)(?!\.?\.\/)([^\/]+)\/\.\.\/*/g, '$1');
            } while (path != tempPath);

            return path.replace(/\.\//g, '').replace(/\/$/g, '');
        },
        splitPath: function(path, result) {
            var i = path.lastIndexOf('/') + 1;

            result.directory = path.substring(0, i);
            result.filename = path.substring(i);
        }
    };

    var jsioSrcCache = {};

    var jsioModuleCache = {};

    var jsioPathCache = {};

    function resolveModulePath(fromDir, modulePath) {
        var pathSegments = modulePath.split('/');
        var subpath = pathSegments.slice(0, 1).join('/');
        var pathString = pathSegments.slice(1).join('/');
        var value = jsio.__pathCache[subpath];

        if (value) {
            modulePath = util.buildPath(value, pathString);
        }

        if (util.isRelativePath(modulePath)) {
            modulePath = util.buildPath(fromDir, modulePath);
        }

        if (jsio.__pathCache[modulePath]) {
            modulePath = jsio.__pathCache[modulePath];
        }

        return util.getPossiblePaths(modulePath);
    }

    function loader(fromDir, fromFile, item, opts) {
        if (process.binding('natives')[item]) {
            return require(item);
        }

        return jsio.__require(fromDir, fromFile, item, opts);
    }

    function _require(fromDir, fromFile, item) {
        var moduleDef = jsio.__loadModule(fromDir, item);

        if (!moduleDef) {
            return console.log(util.concat("Error: couldnot find module '", item, "' from '", fromDir, fromFile, "'"));
        }

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
        var possibilities = resolveModulePath(fromDir, item);

        return jsio.__findModule(possibilities);
    }

    function execModule(jsio, moduleDef) {
        var fn = moduleDef.src,
            exports = moduleDef.exports,
            filename = moduleDef.filename,
            directory = moduleDef.directory;

        fn.call(exports, exports, jsio, moduleDef, filename, directory);
    }

    function makeContext(fromDir, fromFile) {
        var jsio = util.bind(loader, null, fromDir, fromFile);

        jsio.setCachePath = setCachePath;
        jsio.setCache = setCache;
        jsio.__require = _require;
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
        return jsio('fs').readFileSync(p, 'utf8');
    } catch (e) {
        return false;
    }
};

var Eval = function(moduleDef) {
    moduleDef.src = jsio('vm').runInThisContext(moduleDef.src, {
        filename: moduleDef.path
    });

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
    if (!jsio.__pathCache[baseMod]) {
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

        if (jsio.__srcCache[modulePath]) {
            return this.supr([modulePath]);
        }

        src = fetch(modulePath);

        if (src) {
            if (jsio.__util.getExtension(modulePath) == "json") {
                src = jsio.__util.concat("module.exports =", src);
            }

            src = jsio.__util.concat("(function (exports, require, module, __filename, __dirname) {\n", src, "\n})");
            setCachedSrc(modulePath, src);

            return this.supr([modulePath]);
        }
    }
});

jsio.__loadModule = jsio.__loadModule.Extends(function(fromDir, item) {
    var moduleDef = this.supr(fromDir, item),
        baseMod = item.split('/')[0],
        jsioPaths = jsio.path.get(),
        util = jsio.__util,
        modulePath, entryFile, packageDotJson, possibilities, i;

    if (moduleDef) {
        return moduleDef;
    }

    for (i = 0; i < jsioPaths.length; i++) {
        modulePath = util.buildPath(jsioPaths[i], baseMod); 
        possibilities = util.getPossiblePaths(util.buildPath(jsioPaths[i], item));
        moduleDef = jsio.__findModule(possibilities);

        if (moduleDef) {
            setPathCache(baseMod, modulePath);

            return jsio.__loadModule(fromDir, item);
        }

        packageDotJson = fetch(util.buildPath(jsioPaths[i], item, "package.json"));

        if (packageDotJson) {
            entryFile = JSON.parse(packageDotJson).main;
        }

        if (entryFile) {
            entryFile = util.getPossiblePaths(util.buildPath(jsioPaths[i], item, entryFile));
            moduleDef = jsio.__findModule(entryFile);
        }

        if (moduleDef) {
            setPathCache(baseMod, modulePath);
            setPathCache(modulePath, moduleDef.path);

            return jsio.__loadModule(fromDir, item);
        }
    }
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
