var jsio = require('./core');
var fs = require('fs');
var path = require('path');
var HOST = /^([a-z][a-z0-9+\-\.]*:\/\/.*?\/)(.*)$/;
var PROTOCOL = /^[a-z][a-z0-9+\-\.]*:/;
var SLICE = Array.prototype.slice;

jsio = jsio.__init(loadModule);

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
  addEndSlash: function(str) {
    return rexpEndSlash.test(str) ? str : str + '/';
  },
  removeEndSlash: function(str) {
    return str.replace(rexpEndSlash, '');
  },
  relative: function(relativeTo, path) {
    var len = relativeTo.length;
    if (path.substring(0, len) == relativeTo) {
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

function loadModule(fromFile, fromDir, opts) {
  var possibilities = util.resolveModulePath(fromFile, fromDir);
  var moduleDef = findModule(possibilities);

  moduleDef.friendlyPath = fromFile;
  opts = opts || {};
  if (!opts.hasOwnProperty('dontPreprocess')) {
    applyPreprocessors(moduleDef, ['import']);
  }
  return moduleDef;
};


var applyPreprocessors = function(moduleDef, names) {
  for (var i = 0, len = names.length; i < len; ++i) {
    getPreprocessor(moduleDef, names[i]);
  }
};

function getPreprocessor(moduleDef, name) {
  var module = jsio('import .packages.preprocessors.' + name, {
    dontPreprocess: true
  });

  module(moduleDef);
}

function findModule(possibilities) {
  for (var i = 0, possible; possible = possibilities[i]; ++i) {
    var path = possible.path;

    possible.src = ENV.fetch(path);
    return possible;
  }
};


module.exports = jsio;
