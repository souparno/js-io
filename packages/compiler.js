var fs = require('fs');
var jsio = require('./jsio');


var preprocess = function(preprocessors, module) {
  preprocessors = preprocessors || ['import'];
  preprocessors.forEach(function(preprocessor, index) {
    var request = 'import packages.preprocessors.' + preprocessor;

    preprocessor = jsio(request, []);
    preprocessor(module, preprocessors);
  });
};

jsio.__loadModule = jsio.__loadModule.Extends(function(request) {
  var path = request.from.split(".").join("/") + '.js';
  var src = fs.readFileSync(path, 'utf8').toString();

  jsio.__setModule({
    src: src,
    path: request.from
  }, request.from);

  return this.supr(request);
});

jsio.__require = jsio.__require.Extends(function(ctx, request, preprocessors) {
  jsio.__preprocess = jsio.__util.bind(preprocess, null, preprocessors);

  return this.supr(ctx, request);
});

module.exports = jsio;
