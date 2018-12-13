var fs = require('fs');
var jsio = require('./jsio');

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

jsio.__loadModule = jsio.__loadModule.Extends(function(request) {
  var path = request.from.split(".").join("/") + '.js';
  var src = fs.readFileSync(path, 'utf8').toString();

  jsio.__setModule(request.from, {
    src: src,
    path: request.from
  });

  return this.supr(request);
});

jsio.__require = jsio.__require.Extends(function(ctx, request, preprocessors) {
  jsio.__preprocess = jsio.__util.bind(preprocess, null, ctx, preprocessors);

  return this.supr(ctx, request);
});

jsio.__makeContext = jsio.__makeContext.Extends(function() {
  var context = this.supr();

  context.jsio = jsio.__util.bind(jsio.__require, null, context);
  context.jsio.__init = jsio.__init;

  return context;
});

module.exports = jsio.__makeContext().jsio;
