var fs = require('fs');

var packages = {
  preprocessors: {
    import: fs.readFileSync('packages/preprocessors/import.js', 'utf8').toString(),
    compiler: fs.readFileSync('packages/preprocessors/compiler.js', 'utf8').toString()
  },

  jsio: require('./packages/jsio.js'),
  compiler: function() {
    var JSIO = packages.jsio;

    var Extends = function(fn) {
      var context = {
        jsio: {
          __require: JSIO.__require,
          __loadModule: JSIO.__loadModule
        },
        __jsio: JSIO
      }

      return fn.bind(context);
    }

    var preprocess = Extends(function(module, preprocessors) {
      preprocessors = preprocessors || ['import'];
      preprocessors.forEach(function(preprocessor, index) {
        var request = 'import packages.preprocessors.' + preprocessor;
        preprocessor = this.__jsio(request, []);
        preprocessor(module, preprocessors);
      }.bind(this));
    });

    var loadModule = Extends(function(preprocessors, request) {
      this.__jsio.__setModule({
        src: eval(request.from),
        path: request.from
      }, request.from);

      var module = this.jsio.__loadModule(request);
      preprocess(module, preprocessors);
      return module;
    });

    var require = Extends(function(ctx, request, preprocessors) {
      ctx.jsio.__loadModule = loadModule.bind(null, preprocessors);
      return this.jsio.__require(ctx, request);
    });

    JSIO.__require = require;
    return JSIO;
  }
}

var example = {
  app: "import example.calculator as calculator;\n" +
    "   calculator.add(2, 3);\n",

  calculator: "import example.print as print;\n" +
    "          exports = {\n" +
    "            add: function (a, b) {\n" +
    "              print(a+b);\n" +
    "            }\n" +
    "          }\n",

  print: "exports = function(res) {\n" +
    "       console.log(res);\n" +
    "     }\n"
};

var Jsio = packages.compiler();
var compiler = Jsio('import packages.preprocessors.compiler;');
compiler.compile('import example.app;');
compiler.generateSrc(function(src) {
  console.log(src + "jsio('import example.app;');");
});
