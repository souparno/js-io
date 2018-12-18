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
        // `buildPath` accepts an arbitrary number of string arguments to concatenate into a path.
        //     util.buildPath('a', 'b', 'c/', 'd/') -> 'a/b/c/d/'
        buildPath: function () {
            var pieces = [], piece, i;

            for (i = 0; i < arguments.length; i++) {
                piece = arguments[i];
                if (piece != '.' && piece != './' && piece) {
                    pieces.push(piece);
                }
            }
            return pieces.join('/');
        },
        // `resolveRelativeRequest` changes the request format into file path format.  For example:
        //     util.resolveRelativeRequest('..foo.bar') -> ../foo/bar
        resolveRelativeRequest: function (request) {
            var result = [],
                    parts = request.split('.'),
                    len = parts.length,
                    relative = (len > 1 && !parts[0]),
                    i = relative ? 0 : -1;

            while (++i < len) {
                result.push(parts[i] ? parts[i] : '..');
            }
            return result.join('/');
        },
        // `resolveRelativePath` removes relative path indicators.  For example:
        //     util.resolveRelativePath('a/../b') -> b
        resolveRelativePath: function (path) {
            /* Remove multiple slashes and trivial dots (`/./ -> /`). */
            var tempPath = path.replace(/\/+/g, '/').replace(/\/\.\//g, '/');

            /* Loop to collapse instances of `../` in the path by matching a previous
             path segment.  Essentially, we find substrings of the form `/abc/../`
             where abc is not `.` or `..` and replace the substrings with `/`.
             We loop until the string no longer changes since after collapsing
             possible instances once, we may have created more instances that can
             be collapsed.
             */
            while ((path = tempPath) != (tempPath = tempPath.replace(/(^|\/)(?!\.?\.\/)([^\/]+)\/\.\.\//g, '$1'))) {
            }
            return path;
        },
        resolveModulePath: function (fromDir, request) {
            if (request.charAt(0) == '.') {
                request = util.resolveRelativeRequest(request);
                request = util.buildPath(fromDir, request);
                request = util.resolveRelativePath(request);

            } else {
                request = request.split('.').join('/');
            }

            return [request + '.js', request + '/index.js'];

        }, splitPath: function (path) {
            var i = path.lastIndexOf('/') + 1;

            return {
                dirname: path.substring(0, i),
                filename: path.substring(i)
            };
        }
    }, commands = [];

    // import myPackage;
    // import myPackage as myPack;
    commands.push(function (request, imports) {
        var match = request.match(/^\s*import\s+(.*)$/);

        if (match) {
            match[1].replace(/\s*([\w.\-$]+)(?:\s+as\s+([\w.\-$]+))?,?/g, function (_, fullPath, as) {
                imports.from = fullPath;
                imports.as = as ? as : fullPath;
            });
        }

        return match;
    });

    function _require(ctx, fromDir, fromFile, item, opts) {
        return jsio.__require(ctx, fromDir, fromFile, item, opts);
    }

    function require(ctx, fromDir, fromFile, item) {
        var request = resolveImportRequest(item);
        var possibilities = util.resolveModulePath(fromDir, request.from);
        var moduleDef = jsio.__loadModule(possibilities);
        var newContext = {};

        // stops re-execution, if module allready executed
        if (!moduleDef.exports) {
            fromDir = moduleDef.dirname;
            fromFile = moduleDef.filename;
            newContext = makeContext(newContext, fromDir, fromFile);
            //stops recursive dependencies from creating an infinite callbacks
            moduleDef.exports = newContext.exports;
            moduleDef.exports = jsio.__execModule(newContext, moduleDef);
        }
        ctx[request.as] = moduleDef.exports;
        return ctx[request.as];
    }

    function resolveImportRequest(request) {
        var imports = {};

        for (var i = 0; i < commands.length; i++) {
            if (commands[i](request, imports)) {
                break;
            }
        }

        return imports;
    }

    function setModule(modules) {
        jsio.__modules = modules;
    }

    function moduleDef(modulePath, src) {
        var path = util.splitPath(modulePath);

        this.modulePath = modulePath;
        this.dirname = path.dirname;
        this.filename = path.filename;
        this.src = src;
        this.exports = null;
    }

    function loadModule(possibilities) {
        var modules = jsio.__modules, cache = jsio.__cache, modulePath;

        for (var i = 0; i < possibilities.length; i++) {
            modulePath = possibilities[i];

            if (modules[modulePath]) {
                if (!cache[modulePath]) {
                    cache[modulePath] = new moduleDef(modulePath, modules[modulePath]);
                }

                return cache[modulePath];
            }
        }
    }

    function execModule(ctx, moduleDef) {
        var fn = eval(moduleDef.src);

        fn(ctx);
        if (moduleDef.exports != ctx.module.exports) {
            return ctx.module.exports;
        }

        return ctx.exports;
    }

    function makeContext(ctx, fromDir, fromFile) {
        ctx.exports = {};
        ctx.module = {};
        ctx.module.exports = ctx.exports;
        ctx.jsio = util.bind(_require, null, ctx, fromDir, fromFile);
        ctx.jsio.__require = require;
        ctx.jsio.__setModule = setModule;
        ctx.jsio.__loadModule = loadModule;
        ctx.jsio.__execModule = execModule;
        ctx.jsio.__init = init;
        ctx.jsio.__util = util;
        ctx.jsio.__modules = {};
        ctx.jsio.__cache = {};

        return ctx;
    }

    return makeContext({}).jsio;
}());

// adds an extend property to the jsio functions passed in the array
jsio = (function (method, props) {
    for (var i = 0; i < props.length; i++) {
        method[props[i]].Extends = (function () {

            return function (fn) {
                var context = {supr: this};

                return jsio.__util.bind(fn, context);
            };
        }());
    }

    return method;
})(jsio, ['__require', '__loadModule', '__execModule']);

var fetch = function (p) {
    try {
        return fs.readFileSync(p, 'utf8');
    } catch (e) {
        return false;
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

var setModule = function (modulePath, src) {
    if (!jsio.__modules[modulePath]) {
        jsio.__modules[modulePath] = src;
    }
};

jsio.__execModule = jsio.__execModule.Extends(function (ctx, moduleDef) {
    jsio.__preprocess(ctx, moduleDef);

    return this.supr(ctx, moduleDef);
});

jsio.__loadModule = jsio.__loadModule.Extends(function (possibilities) {
    var src, modulePath, i;

    for (i = 0; i < possibilities.length; i++) {
        modulePath = possibilities[i];
        src = fetch(modulePath);

        if (src) {
            setModule(modulePath, "(function (__) { with (__) {" + src + "}});");
            break;
        }
    }

    return this.supr(possibilities);
});

jsio.__require = jsio.__require.Extends(function (ctx, fromDir, fromFile, item, preprocessors) {
    jsio.__preprocess = jsio.__util.bind(preprocess, null, preprocessors);

    return this.supr(ctx, fromDir, fromFile, item);
});

module.exports = jsio;