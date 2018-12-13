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

;
var jsio = (function init() {
    util = {
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
                request = util.resolveRelativePath(util.buildPath(fromDir, util.resolveRelativeRequest(request)));
                return [
                    request + '.js',
                    request + '/index.js'
                ];
            }
            //else consider the request on the absolute path
        }
    };

    return makeContext({
        fromDir: null,
        fromFile: null
    }).jsio;

    function makeContext(moduleDef) {
        var context = {},
                fromDir = moduleDef.fromDir,
                fromFile = moduleDef.fromFile, 
                cmds = [];

        context.exports = {};
        context.module = {};
        context.module.exports = context.exports;
        context.jsio = util.bind(_require, null, context, fromDir, fromFile);
        context.jsio.__cmds = cmds;
        context.jsio.__util = util;
        context.jsio.addCommand = util.bind(cmds, 'push');
        context.jsio.__require = _require;
        context.jsio.__setCache = setCache;
        context.jsio.__setModule = setModule;
        context.jsio.__loadModule = loadModule;
        context.jsio.__makeContext = makeContext;
        context.jsio.__preprocess = null;
        context.jsio.__init = init;
        context.jsio.__modules = {};
        context.jsio.__cache = {};

        return context;
    }

    function _require(ctx, fromDir, fromFile, item) {
        var request = resolveImportRequest(item);
        var possibilities = util.resolveModulePath(fromDir, request);
        var moduleDef = jsio.__loadModule(possibilities);

        // stops re-execution, if module allready executed
        if (!moduleDef.exports) {
            var newContext = jsio.__makeContext(moduleDef);

            //stops recursive dependencies from creating an infinite callbacks
            moduleDef.exports = newContext.exports;
            if (jsio.__preprocess) {
                jsio.__preprocess(moduleDef);
            }
            moduleDef.exports = execModule(newContext, moduleDef);
        }
        ctx[request.as] = moduleDef.exports;
        return ctx[request.as];
    }

    function resolveImportRequest(request) {
        var cmds = jsio.__cmds, imports = {};

        for (var i = 0; i < cmds.length; i++) {
            if (cmds[i](request, imports)) {
                break;
            }
        }

        return imports;
    }

    function setCache(modules) {
        jsio.__modules = modules;
    }

    function setModule(modulePath, moduleDef) {
        if (!jsio.__modules[modulePath]) {
            jsio.__modules[modulePath] = moduleDef;
        }
    }

    function loadModule(possibilities) {
        var modulePath;

        for (var i = 0; i < possibilities.length; i++) {
            modulePath = possibilities[i];

            if (jsio.__modules[modulePath]) {
                if (!jsio.__cache[modulePath]) {
                    jsio.__cache[modulePath] = jsio.__modules[modulePath];
                }

                return jsio.__cache[modulePath];
            }
        }
    }

    function execModule(ctx, moduleDef) {
        var code = "(function (__) { with (__) {" + moduleDef.src + "};});";
        var fn = eval(code);

        fn(ctx);
        if (moduleDef.exports != ctx.module.exports) {
            return ctx.moduleDef.exports;
        }

        return ctx.exports;
    }

    // import myPackage;
    // import myPackage as myPack;
    jsio.addCommand(function (request, imports) {
        var match = request.match(/^\s*import\s+(.*)$/);

        if (match) {
            match[1].replace(/\s*([\w.\-$]+)(?:\s+as\s+([\w.\-$]+))?,?/g, function (_, fullPath, as) {
                imports.from = fullPath;
                imports.as = as ? as : fullPath;
            });
        }

        return match;
    });
}());

for (var key in jsio) {
    var prop = jsio[key];

    if (typeof prop === "function") {
        prop.Extends = (function () {
            return function (fn) {
                var context = {
                    supr: this
                };
                return jsio.__util.bind(fn, context);
            };
        }());
    }
}

module.exports = jsio;
