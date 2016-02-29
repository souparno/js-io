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
  var splitPath = util.splitPath(path, this);

  this.directory = util.resolve(ENV.getCwd(), splitPath.directory);
  this.filename = splitPath.filename;
  this.path = path;
  this.friendlyPath = path;
};

var util = {

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
  splitPath: function(path) {
    var i = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\')) + 1;

    return {
      directory: path.substring(0, i),
      filename: path.substring(i)
    }
  }
};

function ENV_node() {

  var _cwd = process.cwd();

  this.getCwd = function() {
    return _cwd;
  };

  this.fetch = function(p) {
    p = util.resolve(this.getCwd(), p);

    try {
      return fs.readFileSync(p, 'utf8');
    } catch (e) {
      return false;
    }
  };

};

var ENV = new ENV_node();

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

    possible.src = ENV.fetch(path);
    return possible;
  }
};

function loadModule(fromFile, fromDir) {
  var possibilities = util.resolveModulePath(fromFile, fromDir);
  var moduleDef = findModule(possibilities);

  moduleDef.friendlyPath = fromFile;
  moduleDef.src = applyPreprocessors(moduleDef.src);
  return moduleDef;
};

function getJsioSrc(imports) {
  var src = 'jsio=(' + jsio.__clone.toString() + ')();' + "jsio.setModules(" + JSON.stringify(jsio.__modules) + ");jsio('" + imports + "', {});";
  return src;
};

var imports = process.argv[2];
jsio = jsio.__clone(loadModule);
jsio(imports, {}, './');
console.log(getJsioSrc(imports));
