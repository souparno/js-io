var fs = require('fs');
var JSIO = require('./jsio');

var preprocess = function(preprocessors, module, ctx) {
  preprocessors = preprocessors || ['import'];
  preprocessors.forEach(function(preprocessor, index) {
    var request = 'import packages.preprocessors.' + preprocessor;

    preprocessor = ctx.jsio(request, []);
    preprocessor(module, preprocessors, ctx);
  });
};

JSIO.__setModule = JSIO.__setModule.Extends(function(module, key) {
  if (!JSIO.__modules[key]) {
    JSIO.__modules[key] = module;
  }
});

JSIO.__loadModule = JSIO.__loadModule.Extends(function(request) {
  var path = request.from.split(".").join("/") + '.js';
  var src = fs.readFileSync(path, 'utf8').toString();

  JSIO.__setModule({
    src: src,
    path: request.from
  }, request.from);

  return this.supr(request);
});

JSIO.__require = JSIO.__require.Extends(function(ctx, request, preprocessors) {
  JSIO.__preprocess = JSIO.__util.bind(preprocess, null, preprocessors);

  return this.supr(ctx, request);
});

JSIO.__makeContext = JSIO.__makeContext.Extends(function() {
  var context = this.supr();

  context.jsio = JSIO.__util.bind(JSIO.__require, null, this);
  return context;
});

module.exports = jsio = JSIO.__makeContext().jsio;
