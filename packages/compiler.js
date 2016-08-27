var fs = require('fs');
var JSIO = require('./jsio');

var Extends = function(fn) {
  var context = {
    jsio: {
      __require: JSIO.__require,
      __loadModule: JSIO.__loadModule
    },
    __jsio: JSIO
  }

  return bind(fn, context);
}

function bind(method, context) {
  var SLICE = Array.prototype.slice;
  var args = SLICE.call(arguments, 2);
  return function() {
    return method.apply(context, args.concat(SLICE.call(arguments, 0)));
  };
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
  this.__jsio.__setModule({
    src:  fs.readFileSync(request.from.split(".").join("/") + '.js', 'utf8').toString(),
    path: request.from
  }, request.from);

  var module = this.jsio.__loadModule(request);
  preprocess(module, preprocessors);
  return module;
});

var require = Extends(function(ctx, request, preprocessors) {
  ctx.jsio.__loadModule = bind(loadModule, null, preprocessors);
  return this.jsio.__require(ctx, request);
});

JSIO.__require = require;
JSIO.__preprocessors = ['import'];

module.exports = JSIO;
