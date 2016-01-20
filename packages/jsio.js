var fs = require('fs');
var path = require('path');
var vm = require('vm');

(function() {
  function init() {
    var INITIAL_FILE = '<initial file>';
    var MODULE_NOT_FOUND = 'MODULE_NOT_FOUND';
    var DEBUG = true;
    var SLICE = Array.prototype.slice;
    var ENV;

    // Checks if the last character in a string is `/`.
    var rexpEndSlash = /(\/|\\)$/;

    function getModuleDef(path) {
      path += '.js';
      return jsio.__modules[path] || new ModuleDef(path);
    }

    // Creates an object containing metadata about a module.
    function ModuleDef(path) {
      this.path = path;
      this.friendlyPath = path;

      util.splitPath(path, this);
      this.directory = util.resolve(ENV.getCwd(), this.directory);
    }

    ModuleDef.prototype.setBase = function(baseMod, basePath) {
      this.baseMod = baseMod;
      this.basePath = basePath + '/' + baseMod;
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
        // resolve relative paths
        if (modulePath.charAt(0) == '.') {
          return [
            getModuleDef(util.resolveRelativeModule(modulePath, directory)),
            getModuleDef(util.resolveRelativeModule(modulePath + '.index', directory))
          ];
        }

        // resolve absolute paths with respect to jsio packages/
        var pathSegments = modulePath.split('.');
        var n = pathSegments.length;
        for (var i = n; i > 0; --i) {
          var subpath = pathSegments.slice(0, i).join('.');
          var value = jsioPath.cache[subpath];
          var pathString = pathSegments.slice(i).join('/');
          if (value) {
            return [
              getModuleDef(util.buildPath(value, pathString)),
              getModuleDef(util.buildPath(value, pathString + '/index'))
            ];
          }
        }

        var baseMod = pathSegments[0];
        var pathString = pathSegments.join('/');
        var defs = [];
        var paths = jsioPath.get();
        var len = paths.length;
        for (var i = 0; i < len; ++i) {
          var base = paths[i];
          var path = util.buildPath(base, pathString);

          var moduleDef = getModuleDef(path);
          moduleDef.setBase(baseMod, base);
          defs.push(moduleDef);

          var moduleDef = getModuleDef(path + '/index');
          moduleDef.setBase(baseMod, base);
          defs.push(moduleDef);
        }
        return defs;
      },
      splitPath: function(path, result) {
        if (!result) {
          result = {};
        }
        var i = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\')) + 1;
        result.directory = path.substring(0, i);
        result.filename = path.substring(i);
        return result;
      }
    };

    var jsio = function(request) {
      _require.apply(this, [null, null, null, request]);
    };

    var srcCache;
    jsio.setCache = function(cache) {
      srcCache = jsio.__srcCache = cache;
    };
    jsio.setCache({});

    jsio.setCachedSrc = function(path, src, locked) {
      if (srcCache[path] && srcCache[path].locked) {
        console.warn('Cache is ignoring (already present and locked) src ' + path);
        return;
      }
      srcCache[path] = {
        path: path,
        src: src,
        locked: locked
      };
    };
    jsio.getCachedSrc = function(path) {
      return srcCache[path];
    };

    jsio.__modules = {
      preprocessors: {}
    };
    var jsioPath = {
      set: function(path) {
        this.value = [];
        (typeof path == 'string' ? [path] : path).map(this.add, this);
      },
      get: function() {
        return jsioPath.value.slice(0);
      },
      add: function(path) {
        if (arguments.length == 2) {
          var from = arguments[0];
          var to = util.resolve(ENV.getCwd(), arguments[1]);
          this.cache[from] = to;
        } else {
          path = util.resolve(ENV.getCwd(), path);
          var v = jsioPath.value,
            len = v.length;
          for (var i = 0; i < len; ++i) {
            if (v[i] == path) {
              return;
            }
          }
          v.push(path);
        }
      },
      remove: function(path) {
        var v = jsioPath.value,
          len = v.length;
        for (var i = 0; i < len; ++i) {
          if (v[i] == path) {
            v.splice(i, 1);
          }
        }
      },
      value: [],
      cache: {}
    };

    jsio.setEnv = function(envCtor) {
      if (typeof envCtor == 'string') {
        envCtor = ({
          node: ENV_node
        })[envCtor];
      }

      ENV = new envCtor(util);
      this.__env = ENV;
      this.__dir = ENV.getCwd();
    };

    jsio.setEnv('node');
    jsio.main = ENV && ENV.main;

    function ENV_node() {
      //console.trace();
      var Module = module.constructor;
      var parent = module.parent;

      this.requireCache = require.cache;
      this.main = require.main;
      this.global = global;
      this.isWindowsNode = (process.platform === 'win32');

      var _cwd = process.cwd();
      this.setCwd = function(cwd) {
        _cwd = path.resolve(_cwd, cwd);
      };
      this.getCwd = function() {
        return _cwd;
      };

      this.pathSep = path.sep;

      this.getPath = function() {
        return __dirname;
      };

      this.eval = function(code, path) {
        return vm.runInThisContext(code, path, true);
      };

      this.fetch = function(p) {
        p = util.resolve(this.getCwd(), p);

        var filename, lowercaseFilename, files;
        try {
          var dirname = path.dirname(p);
          filename = path.basename(p);
          lowercaseFilename = filename.toLowerCase();
          files = fs.readdirSync(dirname);
        } catch (e) {
          return false;
        }

        for (var i = 0, testName; testName = files[i]; ++i) {
          if (testName.toLowerCase() == lowercaseFilename && testName != filename) {
            throw "Invalid case when importing [" + p + "].  You probably meant" + testName;
          }
        }

        try {
          return fs.readFileSync(p, 'utf8');
        } catch (e) {
          return false;
        }
      };


    }

    var failedFetch = {};

    function findModule(possibilities) {
      var src;
      for (var i = 0, possible; possible = possibilities[i]; ++i) {
        var path = possible.path;
        var cachedVersion = srcCache[path];

        src = ENV.fetch(path);

        if (src !== false) {
          possible.src = src;
          return possible;
        } else {
          failedFetch[path] = true;
        }
      }
      return false;
    }

    var stackRe = /\((?!module.js)(?:file:\/\/)?(.*?)(:\d+)(:\d+)\)/g;
    this.loadModule = function(fromDir, fromFile, item, opts) {
      if (fromFile == INITIAL_FILE && !opts.initialImport) {
        var stack = new Error().stack;
        var match;
        stackRe.lastIndex = 0;
        do {
          match = stackRe.exec(stack);
        } while (match && /jsio\.js$/.test(match[1]));

        if (match) {
          fromDir = path.dirname(match[1]);
          fromFile = path.basename(match[1]);
        }
      }
      var modulePath = item.from;
      var possibilities = util.resolveModulePath(modulePath, fromDir);
      var moduleDef = findModule(possibilities);
      moduleDef.friendlyPath = modulePath;
      moduleDef.src = applyPreprocessors(fromDir, moduleDef, opts);
      return moduleDef;
    };

    function applyPreprocessors(fromDir, moduleDef, opts) {
      var importExpr = /^(\s*)(import\s+[^=+*"'\r\n;\/]+|from\s+[^=+"'\r\n;\/ ]+\s+import\s+[^=+"'\r\n;\/]+)(;|\/|$)/gm;
      return moduleDef.src.replace(importExpr,
        function(raw, p1, p2, p3) {
          if (!/\/\//.test(p1)) {
            return p1 + 'jsio(\'' + p2 + '\')' + p3;
          }
          return raw;
        });
    };

    function resolveImportRequest(request) {
      var imports = [];
      var match = request.match(/^\s*import\s+(.*)$/);
      if (match) {
        match[1].replace(/\s*([\w.\-$]+)(?:\s+as\s+([\w.\-$]+))?,?/g, function(_, fullPath, as) {
          imports.push(
            as ? {
              from: fullPath,
              as: as
            } : {
              from: fullPath,
              as: fullPath
            });
        });
      }
      return imports;
    }

    function makeContext(ctx, modulePath, moduleDef, dontAddBase) {
      if (!ctx) {
        ctx = {};
      }
      if (!ctx.exports) {
        ctx.exports = {};
      }

      ctx.jsio = (function(context, method, ctx, directory, filename) {
        return function(request) {
          args = [ctx, directory, filename, request];
          return method.apply(context, args);
        };
      }(this, _require, ctx, moduleDef.directory, moduleDef.filename));

      ctx.require = function(request, opts) {
        if (!opts) {
          opts = {};
        }
        opts.dontExport = true;
        return ctx.jsio(request, opts);
      };

      ctx.require.main = ENV.main;

      ctx.module = {
        id: modulePath,
        exports: ctx.exports
      };
      // TODO: FIX for "trailing ." case
      ctx.jsio.__jsio = jsio;
      ctx.jsio.__env = jsio.__env;
      ctx.jsio.__dir = moduleDef.directory;
      ctx.jsio.__filename = moduleDef.filename;
      ctx.jsio.path = jsioPath;

      ctx.__dirname = moduleDef.directory;
      ctx.__filename = util.buildPath(ctx.__dirname, moduleDef.filename);
      return ctx;
    }

    var importStack = [];

    function _require(boundContext, fromDir, fromFile, request, opts) {
      opts = opts || {};
      fromDir = fromDir || './';
      fromFile = fromFile || INITIAL_FILE;

      var exportInto = opts.exportInto || boundContext || global;

      // parse the import request(s)
      var imports = resolveImportRequest(request);
      var numImports = imports.length;
      var retVal = numImports > 1 ? {} : null;

      var item = imports[0];
      var modulePath = item.from;
      var modules = jsio.__modules;
      var path;
      var moduleDef;
      var err;
      moduleDef = loadModule(fromDir, fromFile, item, opts);


      if (moduleDef) {
        path = moduleDef.path;
      } else if (moduleDef === false) {
        return false;
      }

      if (moduleDef) {
        importStack.push({
          friendlyPath: moduleDef.friendlyPath,
          path: moduleDef.path,
          stack: new Error().stack
        });
      }

      // eval any packages that we don't know about already
      if (!(path in modules)) {
        modules[path] = moduleDef;
      }

      if (!moduleDef.exports) {
        var newContext = makeContext(opts.context, modulePath, moduleDef, item.dontAddBase);
        if (item.dontUseExports) {
          var src = [';(function(){'],
            k = 1;
          for (var j in item['import']) {
            newContext.exports[j] = undefined;
            src[k++] = 'if(typeof ' + j + '!="undefined"&&exports.' + j + '==undefined)exports.' + j + '=' + j + ';';
          }
          src[k] = '})();';
          moduleDef.src += src.join('');
        }

        var src = moduleDef.src;
        delete moduleDef.src;
        var code = "(function(_){with(_){delete _;return function $$" + moduleDef.friendlyPath.replace(/[\:\\\/.-]/g, '_') + "(){" + src + "\n}}})";
        var exports = moduleDef.exports = newContext.exports;
        var fn = ENV.eval(code, moduleDef.path, src);
        fn = fn(newContext);
        fn.call(exports);
        if (exports != newContext.module.exports) {
          moduleDef.exports = newContext.module.exports;
        } else {
          moduleDef.exports = newContext.exports;
        }
      }

      importStack.pop();

      var module = moduleDef.exports;

      // return the module if we're only importing one module
      if (numImports == 1) {
        retVal = module;
      }

      if (!opts.dontExport) {
        // add the module to the current context
        if (item.as) {
          // remove trailing/leading dots
          var as = item.as.match(/^\.*(.*?)\.*$/)[1],
            segments = as.split('.'),
            kMax = segments.length - 1,
            c = exportInto;

          // build the object in the context
          for (var k = 0; k < kMax; ++k) {
            var segment = segments[k];
            if (!segment) continue;
            if (!c[segment]) {
              c[segment] = {};
            }
            c = c[segment];
          }

          c[segments[kMax]] = module;

          // there can be multiple module imports with this syntax (import foo, bar)
          if (numImports > 1) {
            retVal[as] = module;
          }
        } else if (item['import']) {
          // there can only be one module import with this syntax
          // (from foo import bar), so retVal will already be set here
          if (item['import']['*']) {
            for (var k in modules[path].exports) {
              exportInto[k] = module[k];
            }
          } else {
            for (var k in item['import']) {
              exportInto[item['import'][k]] = module[k];
            }
          }
        }
      }
      return retVal;
    }
    return jsio;
  }
  module.exports = init();
}());
