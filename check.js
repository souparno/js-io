var jsio = (function init() {
    util = {
        slice: Array.prototype.slice,
        bind: function bind(method, context) {
            var args = util.slice.call(arguments, 2);

            return function() {
                return method.apply(context, args.concat(util.slice.call(arguments, 0)));
            };
        },
        // `buildPath` accepts an arbitrary number of string arguments to concatenate into a path.
        //     util.buildPath('a', 'b', 'c/', 'd/') -> 'a/b/c/d/'
        buildPath: function() {
            var pieces = [],
                piece, i;

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
        resolveRelativeRequest: function(request) {
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
        resolveRelativePath: function(path) {
            /* Remove multiple slashes and trivial dots (`/./ -> /`). */
            var tempPath = path.replace(/\/+/g, '/').replace(/\/\.\//g, '/');

            /* Loop to collapse instances of `../` in the path by matching a previous
             path segment.  Essentially, we find substrings of the form `/abc/../`
             where abc is not `.` or `..` and replace the substrings with `/`.
             We loop until the string no longer changes since after collapsing
             possible instances once, we may have created more instances that can
             be collapsed.
             */
            while ((path = tempPath) != (tempPath = tempPath.replace(/(^|\/)(?!\.?\.\/)([^\/]+)\/\.\.\//g, '$1'))) {}
            return path;
        },
        resolveModulePath: function(fromDir, request) {
            if (request.charAt(0) == '.') {
                request = util.resolveRelativeRequest(request);
                request = util.buildPath(fromDir, request);
                request = util.resolveRelativePath(request);

            } else {
                request = request.split('.').join('/');
            }

            return [request + '.js', request + '/index.js'];

        },
        cmds: []
    };

    function ___() {
        return jsio.__require.apply(this, arguments);
    }

    function _require(ctx, fromDir, fromFile, item) {
        var request = resolveImportRequest(item);
        var possibilities = util.resolveModulePath(fromDir, request.from);
        var moduleDef = jsio.__loadModule(possibilities);

        // stops re-execution, if module allready executed
        if (!moduleDef.exports) {
            var newContext = jsio.__makeContext(moduleDef);

            //stops recursive dependencies from creating an infinite callbacks
            moduleDef.exports = newContext.exports;
            if (jsio.__preprocess) {
                jsio.__preprocess(newContext, moduleDef);
            }
            moduleDef.exports = execModule(newContext, moduleDef);
        }
        ctx[request.as] = moduleDef.exports;
        return ctx[request.as];
    }

    // import myPackage;
    // import myPackage as myPack;
    util.cmds.push(function(request, imports) {
        var match = request.match(/^\s*import\s+(.*)$/);

        if (match) {
            match[1].replace(/\s*([\w.\-$]+)(?:\s+as\s+([\w.\-$]+))?,?/g, function(_, fullPath, as) {
                imports.from = fullPath;
                imports.as = as ? as : fullPath;
            });
        }

        return match;
    });

    function resolveImportRequest(request) {
        var cmds = util.cmds,
            imports = {};

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

    function makeContext(moduleDef) {
        var context = {},
            fromDir = moduleDef.dirname,
            fromFile = moduleDef.filename;

        context.exports = {};
        context.module = {};
        context.module.exports = context.exports;
        context.jsio = util.bind(___, null, context, fromDir, fromFile);
        context.jsio.__util = util;
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

    return makeContext({
        dirname: null,
        filename: null
    }).jsio;
}());
jsio.__setCache({
    "__tests__/test1/print.js": {
        "dirname": "__tests__/test1",
        "filename": "print.js",
        "src": "module.exports = function(res) {\n    console.log(res);\n}\n"
    },
    "__tests__/test1/calculator.js": {
        "dirname": "__tests__/test1",
        "filename": "calculator.js",
        "src": "jsio('import .print as print');\n\nexports = {\n\n  add: function (a, b) {\n    print(a+b);\n  }\n\n}\n"
    },
    "__tests__/test1/app.js": {
        "dirname": "__tests__/test1",
        "filename": "app.js",
        "src": "jsio('import .calculator as calculator');\n\ncalculator.add(2, 3);\n"
    }
});
jsio('import __tests__.test1.app;');
