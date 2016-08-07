var fs = require('fs');
var __import = fs.readFileSync('packages/preprocessors/import.js', 'utf8');
var __compiler = fs.readFileSync('packages/preprocessors/compiler.js', 'utf8');

var packages = {
  preprocessors: {
    import: __import.toString(),
    compiler: __compiler.toString()
  },

  jsio: (function() {
    var jsio = (function init() {
      function resolveRequest(request) {
        var match = request.match(/^\s*import\s+(.*)$/),
          imports = {};

        if (match) {
          match[1].replace(/\s*([\w.\-$]+)(?:\s+as\s+([\w.\-$]+))?,?/g, function(_, from, as) {
            imports = {
              from: from,
              as: as || from
            };
          });
        }

        return imports;
      }

      function require(ctx, request) {
        var request = resolveRequest(request);
        var module = jsio.__loadModule(request);

        if (module.src) {
          if (!module.exports) {
            module.exports = execModule(makeContext(), module);
          }
          ctx[request.as] = module.exports;

          return ctx[request.as];
        }
      }

      function execModule(ctx, module) {
        var code = "(function (__) {\n with (__) {\n" + module.src + "\n};\n return __.exports;\n});";
        var fn = eval(code);

        return fn(ctx);
      }

      function loadModule(request) {
        if (!jsio.__cache[request.from]) {
          jsio.__cache[request.from] = jsio.__modules[request.from];
        }
        return jsio.__cache[request.from];
      }

      function setModule(modules, key) {
        if (key) {
          jsio.__modules[key] = modules
        } else {
          jsio.__modules = modules;
        }
      }

      function makeContext() {
        context = {
          exports: context.exports,
          jsio: context.jsio
        };

        return context;
      }

      var context = {
        exports: {},
        jsio: function() {
          var args = Array.prototype.slice.call(arguments);

          args.unshift(context);
          return context.jsio.__require.apply(null, args);
        }
      };

      context.jsio.__require = require;
      context.jsio.__loadModule = loadModule;
      context.jsio.__init = init;
      context.jsio.__modules = {};
      context.jsio.__cache = {};
      context.jsio.__setModule = setModule;

      return makeContext().jsio;
    }());

    return jsio;
  }()),

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
