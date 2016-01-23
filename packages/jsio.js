var fs = require('fs');
var path = require('path');

var INITIAL_FILE = '<initial file>';
var INITIAL_FOLDER = './';
var SLICE = Array.prototype.slice;
var ENV = new ENV_node();

// Checks if the last character in a string is `/`.
var rexpEndSlash = /(\/|\\)$/;

function getModuleDef(path) {
  path += '.js';
  return new ModuleDef(path);
};

function ModuleDef(path) {
  var i = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\')) + 1;

  this.path = path;
  this.friendlyPath = path;
  this.filename = path.substring(i);
  this.directory = util.resolve(ENV.getCwd(), path.substring(0, i));
};

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
  }
};

function jsio(request, exportInto, fromDir, fromFile) {
  exportInto = exportInto || {};
  fromDir = fromDir || INITIAL_FOLDER;
  fromFile = fromFile || INITIAL_FILE;

  var item = resolveImportRequest(request);
  var moduleDef = loadModule(fromDir, fromFile, item);

  var ctx = {
    exports: {},
    jsio: (function(directory, filename) {
      return function(request) {
        jsio(request, ctx, directory, filename);
      };
    }(moduleDef.directory, moduleDef.filename))
  };
  var fn = eval("(function(args){ with(args){" + moduleDef.src + "}});");
  fn = fn(ctx);

  // remove trailing/leading dots
  var as = item.as.match(/^\.*(.*?)\.*$/)[1];
  var segments = as.split('.');
  var kMax = segments.length - 1;

  // build the object in the context
  for (var k = 0; k < kMax; ++k) {
    var segment = segments[k];
    if (!segment) continue;
    if (!exportInto[segment]) {
      exportInto[segment] = {};
    }
    exportInto = exportInto[segment];
  }
  exportInto[segments[kMax]] = ctx.exports;
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

function ENV_node() {
  var _cwd = process.cwd();

  this.getCwd = function() {
    return _cwd;
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
};

function findModule(possibilities) {
  for (var i = 0, possible; possible = possibilities[i]; ++i) {
    var path = possible.path;
    var cachedVersion = srcCache[path];
    var src = ENV.fetch(path);

    possible.src = src;
    return possible;
  }
  return false;
};

function loadModule(fromDir, fromFile, item, opts) {
  var modulePath = item.from;
  var possibilities = util.resolveModulePath(modulePath, fromDir);
  var moduleDef = findModule(possibilities);
  moduleDef.friendlyPath = modulePath;
  moduleDef.src = applyPreprocessors(moduleDef.src, opts);
  return moduleDef;
};

function applyPreprocessors(src, opts) {
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
      imports = as ? {
        from: fullPath,
        as: as
      } : {
        from: fullPath,
        as: fullPath
      };
    });
  }
  return imports;
};

module.exports = jsio;
