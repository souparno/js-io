var fs = require('fs');
var path = require('path');
var jsio = require('./jsio');

var util = {
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
    try {
      return fs.readFileSync(p, 'utf8');
    } catch (e) {
      return false;
    }
  };
};

var ENV = new ENV_node();

function ModuleDef(path) {
  var splitPath = util.splitPath(path, this);

  this.directory = ENV.getCwd() + "/" + splitPath.directory;
  this.filename = splitPath.filename;
  this.path = path;
  this.src = ENV.fetch(this.directory + this.filename);
  this.breakpoint = "something";
};

function getModuleDef(path) {
  return new ModuleDef(path += '.js');
};

var preprocess = function(ctx, preprocessors, moduleDef) {
  for (var key in preprocessors) {
    var preprocessor = preprocessors[key];
    var request = 'import packages.preprocessors.' + preprocessor;

    preprocessor = ctx.jsio(request);
    preprocessor(moduleDef, preprocessors, ctx);
  }
};

jsio.__setModule = jsio.__setModule.Extends(function(key, moduleDef) {
  if (!jsio.__modules[key]) {
    jsio.__modules[key] = moduleDef;
  }
});

jsio.__loadModule = jsio.__loadModule.Extends(function(fromDir, fromFile, request) {
  var moduleDef = getModuleDef(fromDir + request.from.split(".").join("/"));
  jsio.__setModule(request.from, moduleDef);

  return this.supr(fromDir, fromFile, request);
});

jsio.__require = jsio.__require.Extends(function(ctx, fromDir, fromFile, request, preprocessors) {
  jsio.__preprocess = jsio.__util.bind(preprocess, null, ctx, preprocessors);

  return this.supr(ctx, fromDir, fromFile, request);
});

jsio.__makeContext = jsio.__makeContext.Extends(function(moduleDef) {
  var context = this.supr(moduleDef);
  var directory = moduleDef.directory;
  var filename = moduleDef.filename;

  context.jsio = jsio.__util.bind(jsio.__require, null, context, directory, filename);
  return context;
});

module.exports = jsio.__makeContext({
  directory: "",
  filename: null
}).jsio;
