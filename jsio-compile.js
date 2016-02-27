var jsio = require('./jsio');
var fs = require('fs');
var path = require('path');
var HOST = /^([a-z][a-z0-9+\-\.]*:\/\/.*?\/)(.*)$/;
var PROTOCOL = /^[a-z][a-z0-9+\-\.]*:/;
var SLICE = Array.prototype.slice;


function getModuleDef(path) {
  path += '.js';
  return new ModuleDef(path);
};

function ModuleDef(path) {
  this.path = path;
  this.friendlyPath = path;

  util.splitPath(path, this);
  this.directory = util.resolve(ENV.getCwd(), this.directory);
};

var util = {
  // `util.bind` returns a function that, when called, will execute
  // the method passed in with the provided context and any additional
  // arguments passed to `util.bind`.
  //       util.bind(obj, 'f', a) -> function() { return obj.f(a); }
  //       util.bind(obj, g, a, b, c) -> function() { return g.call(g, a, b, c); }
  bind: function(context, method /*, args... */ ) {
    var args = SLICE.call(arguments, 2);
    return function() {
      method = (typeof method == 'string' ? context[method] : method);
      return method.apply(context, args.concat(SLICE.call(arguments, 0)));
    };
  },

  // `util.addEndSlash` accepts a string.  That string is returned with a `/`
  // appended if the string did not already end in a `/`.
  addEndSlash: function(str) {
    return rexpEndSlash.test(str) ? str : str + '/';
  },

  // `util.removeEndSlash` accepts a string.  It removes a trailing `/` if
  // one is found.
  removeEndSlash: function(str) {
    return str.replace(rexpEndSlash, '');
  },

  // `util.relative` accepts two paths (strings) and returns the second path
  // relative to the first.
  //
  //  - if `path` starts with `relativeTo`, then strip `path` off the
  //    `relativeTo` part
  //
  //         util.relative('abc/def/', 'abc') -> 'def'
  //
  //  - if `path` starts with some substring of `relativeTo`, remove
  //    this substring and add `../` for each remaining segment of
  //    `relativeTo`.
  //
  //         util.relative('abc/def/', 'abc/hij') -> '../def'
  //
  relative: function(relativeTo, path) {
    var len = relativeTo.length;
    if (path.substring(0, len) == relativeTo) {
      // if the relative path now starts with a path separator
      // either (/ or \), remove it
      /* Note: we're casting a boolean to an int by adding len to it */
      return path.slice(len + /[\/\\]/.test(path.charAt(len)));
    }

    var sA = util.removeEndSlash(path).split(ENV.pathSep),
      sB = util.removeEndSlash(relativeTo).split(ENV.pathSep),
      i = 0;

    /* Count how many segments match. */
    while (sA[i] == sB[i]) {
      ++i;
    }

    if (i) {
      /* If at least some segments matched, remove them.  The result is our new path. */
      path = sA.slice(i).join(ENV.pathSep);

      /* Prepend `../` for each segment remaining in `relativeTo`. */
      for (var j = sB.length - i; j > 0; --j) {
        path = '../' + path;
      }
    }

    return path;
  },

  // `buildPath` accepts an arbitrary number of string arguments to concatenate into a path.
  //     util.buildPath('a', 'b', 'c/', 'd/') -> 'a/b/c/d/'
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
}

function ENV_node() {
  var Module = module.constructor;

  var parent = module.parent;
  var req = util.bind(parent, parent && parent.require || require);
  this.requireCache = require.cache;
  this.main = require.main;
  this.name = 'node';
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

  // var parentPath = util.splitPath(module.parent.filename);
  // module.parent.require = function(request, opts) {
  //   if (!opts) { opts = {}; }
  //   opts.dontExport = true;
  //   return _require({}, parentPath.directory, parentPath.filename, request, opts);
  // };

  this.log = function() {
    var msg;
    try {
      msg = Array.prototype.map.call(arguments, function(a) {
        if ((a instanceof Error) && a.message) {
          return 'Error:' + a.message + '\nStack:' + a.stack + '\nArguments:' + a.arguments;
        }
        return (typeof a == 'string' ? a : JSON.stringify(a));
      }).join(' ') + '\n';
    } catch (e) {
      msg = Array.prototype.join.call(arguments, ' ') + '\n';
    }

    process.stderr.write(msg);
    return msg;
  };

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

  var stackRe = /\((?!module.js)(?:file:\/\/)?(.*?)(:\d+)(:\d+)\)/g;
  this.loadModule = function(baseLoader, fromDir, fromFile, item, opts) {
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

    try {
      return baseLoader(null, fromDir, item, opts);
    } catch (e) {
      if (e.code == MODULE_NOT_FOUND) {
        var require = req;
        // lookup node module for relative imports
        var module;
        var filename = path.join(fromDir, fromFile);
        module = this.requireCache[filename];
        if (!module) {
          module = new Module(filename);
          module.filename = filename;
          module.paths = Module._nodeModulePaths(path.dirname(filename));
        }
        var request = item.original || item.from;
        try {
          return {
            exports: module ? module.require(request) : require(request),
            path: item.from
          };
        } catch (e2) {
          if (e2.code == MODULE_NOT_FOUND) {
            throw e;
          }

          throw e2;
        }
      } else {
        throw e;
      }
    }
  };
};

var ENV = new ENV_node(util);

var applyPreprocessors = function(src) {
  var importExpr = /^(\s*)(import\s+[^=+*"'\r\n;\/]+|from\s+[^=+"'\r\n;\/ ]+\s+import\s+[^=+"'\r\n;\/]+)(;|\/|$)/gm;
  return src.replace(importExpr,
    function(raw, p1, p2, p3) {
      if (!/\/\//.test(p1)) {
        return p1 + 'jsio(\'' + p2 + '\')' + p3;
      }
      return raw;
    });
};

function findModule(possibilities) {
  for (var i = 0, possible; possible = possibilities[i]; ++i) {
    var path = possible.path;
    var src = ENV.fetch(path);

    if (src !== false) {
      possible.src = src;
      return possible;
    }
  }
};

// load a module from a file
function loadModule(fromFile, fromDir) {
  var possibilities = util.resolveModulePath(fromFile, fromDir);
  var moduleDef = findModule(possibilities);

  moduleDef.friendlyPath = fromFile;
  moduleDef.src = applyPreprocessors(moduleDef.src);
  return moduleDef;
};


function getJsioSrc() {
  var src = 'jsio=(' + jsio.__clone.toString() + ')();' + "jsio.setModules(" + JSON.stringify(jsio.__modules) + ");";
  return src;
};

var imports = process.argv[2];
jsio = jsio.__clone(loadModule);
jsio(imports, {}, './');
console.log(getJsioSrc());
