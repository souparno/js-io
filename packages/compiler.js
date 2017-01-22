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
    }
  }

  return bind(fn, context);
}

var preprocess = function(preprocessors, module) {
  preprocessors = preprocessors || ['import'];
  preprocessors.forEach(function(preprocessor, index) {
    var request = 'import packages.preprocessors.' + preprocessor;

    preprocessor = jsio(request, []);
    preprocessor(module, preprocessors);
  });
};

jsio.__loadModule = Extends(function(request) {
  var path = request.from.split(".").join("/") + '.js';
  var src = fs.readFileSync(path, 'utf8').toString();

  jsio.__setModule({
    src: src,
    path: request.from
  }, request.from);

  var module = this.jsio.__loadModule(request);
  return module;
});

jsio.__require = Extends(function(ctx, request, preprocessors) {
  jsio.__preprocess = bind(preprocess, null, preprocessors);

  return this.jsio.__require(ctx, request);
});

module.exports = jsio;
