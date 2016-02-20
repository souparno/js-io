var fs = require('fs');
var path = require('path');

var INITIAL_FILE = '<initial file>';
var INITIAL_FOLDER = './';
var SLICE = Array.prototype.slice;

var ENV = {
    getCwd: function() {
        return process.cwd();;
    }
};

function ModuleDef(path) {
    var i = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\')) + 1;

    this.path = path;
    this.friendlyPath = path;
    this.filename = path.substring(i);
    this.directory = util.resolve(ENV.getCwd(), path.substring(0, i));
};

var HOST = /^([a-z][a-z0-9+\-\.]*:\/\/.*?\/)(.*)$/;
var PROTOCOL = /^[a-z][a-z0-9+\-\.]*:/;

// Utility functions
var util = {
    buildPath: function() {
        var pieces = [];
        for (var i = 0, n = arguments.length; i < n; ++i) {
            var piece = arguments[i];
            if (PROTOCOL.test(piece)) {
                pieces.length = 0;
            }

            if (piece != '.' && piece != './' && piece) {
                pieces.push(piece);
            }
        }
        return util.resolveRelativePath(pieces.join('/'));
    },

    // `resolveRelativePath` removes relative path indicators.  For example:
    //     util.resolveRelativePath('a/../b') -> b
    resolveRelativePath: function(path) {
        /* If the path starts with a protocol+host, store it and remove it (add it
           back later) so we don't accidently modify it. */
        var protocol = path.match(HOST);
        if (protocol) {
            path = protocol[2];
        }

        /* Remove multiple slashes and trivial dots (`/./ -> /`). */
        path = path.replace(/\/+/g, '/').replace(/\/\.\//g, '/');

        /* Loop to collapse instances of `../` in the path by matching a previous
           path segment.  Essentially, we find substrings of the form `/abc/../`
           where abc is not `.` or `..` and replace the substrings with `/`.
           We loop until the string no longer changes since after collapsing
           possible instances once, we may have created more instances that can
           be collapsed.
        */
        var o;
        while ((o = path) != (path = path.replace(/(^|\/)(?!\.?\.\/)([^\/]+)\/\.\.\//g, '$1'))) {}
        /* Don't forget to prepend any protocol we might have removed earlier. */
        return protocol ? protocol[1] + path.replace(/^\//, '') : path;
    },

    isAbsolutePath: function(path) {
        return /^\//.test(path) || PROTOCOL.test(path) || ENV.isWindowsNode && /^[a-zA-Z]:|[\\\/]{2}[^\\\/]+[\\\/]+[^\\\/]+/.test(path);
    },

    resolve: function(from, to) {
        return this.isAbsolutePath(to) ? util.resolveRelativePath(to) : util.buildPath(from, to);
    },

    resolveRelativeModule: function(modulePath, directory) {
        var result = [],
            parts = modulePath.split('.'),
            len = parts.length,
            relative = (len > 1 && !parts[0]),
            i = relative ? 0 : -1;

        while (++i < len) {
            result.push(parts[i] ? parts[i] : '..');
        }
        return util.buildPath(relative ? directory : '', result.join('/'));
    },
    resolveModulePath: function(modulePath, directory) {
        var path = util.resolveRelativeModule(modulePath, directory) + ".js";
        return new ModuleDef(path);
    }
};

function jsio(request, fromDir) {
    fromDir = fromDir || INITIAL_FOLDER;

    var item = resolveImportRequest(request);
    var moduleDef = loadModule(fromDir, item.from);

    var ctx = {
        exports: {},
        jsio: function(request, fromDir) {
            var as = resolveImportRequest(request).as;
            ctx[as] = jsio(request, moduleDef.directory);
        }
    };

    var fn = eval("(function(args){ with(args){" + moduleDef.src + "}});");
    fn = fn(ctx);
    return ctx.exports;
};

function loadModule(fromDir, fromFile) {
    var possible = util.resolveModulePath(fromFile, fromDir);
    var path = possible.path;
    var src = fs.readFileSync(path, 'utf8');

    possible.src = applyPreprocessors(src);
    return possible;
};

function applyPreprocessors(src) {
    var importExpr = /^(\s*)(import\s+[^=+*"'\r\n;\/]+|from\s+[^=+"'\r\n;\/ ]+\s+import\s+[^=+"'\r\n;\/]+)(;|\/|$)/gm;
    return src.replace(importExpr,
        function(raw, p1, p2, p3) {
            if (!/\/\//.test(p1)) {
                return p1 + 'jsio(\'' + p2 + '\')' + p3;
            }
            return raw;
        });
};

function resolveImportRequest(request) {
    var imports = {};
    var match = request.match(/^\s*import\s+(.*)$/);
    if (match) {
        match[1].replace(/\s*([\w.\-$]+)(?:\s+as\s+([\w.\-$]+))?,?/g, function(_, fullPath, as) {

            as = as || fullPath;
            as = as.match(/^\.*(.*?)\.*$/)[1];

            var _segments = as.split('.'),
                _KMax = _segments.length - 1;

            imports = {
                from: fullPath,
                as: _segments[_KMax]
            };
        });
    }
    return imports;
};

module.exports = jsio;
