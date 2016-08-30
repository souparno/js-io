var fs = require('fs');
var jsio = require('./jsio');

function bind(method, context) {
  var SLICE = Array.prototype.slice;
  var args = SLICE.call(arguments, 2);
  return function() {
    return method.apply(context, args.concat(SLICE.call(arguments, 0)));
  };
}

function Extends(fn) {
  var context = {
    jsio: {
      __require: jsio.__require,
      __loadModule: jsio.__loadModule
    },
    __jsio: jsio
  }

  return bind(fn, context);
}

var preprocess = Extends(function(module, preprocessors) {
  preprocessors = preprocessors || this.__jsio.__preprocessors;
  preprocessors.forEach(bind(function(preprocessor, index) {
    var request = 'import packages.preprocessors.' + preprocessor;
    preprocessor = this.__jsio(request, []);
    preprocessor(module, preprocessors);
  }, this));
});

var loadModule = Extends(function(preprocessors, request) {
  this.__jsio.__setModule(request.from, {
    src: fs.readFileSync(request.from.split(".").join("/") + '.js', 'utf8').toString(),
    path: request.from
  });

  var module = this.jsio.__loadModule(request);
  preprocess(module, preprocessors);
  return module;
});

var require = Extends(function(ctx, request, preprocessors) {
  ctx.jsio.__loadModule = bind(loadModule, null, preprocessors);
  return this.jsio.__require(ctx, request);
});

jsio.__require = require;
jsio.__preprocessors = ['import'];

module.exports = jsio;
