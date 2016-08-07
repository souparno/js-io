var packages = {
  preprocessors: {
    import: "var importExpr = /^(\\s*)(import\\s+[^=+*\"'\\r\\n;\\/]+|from\\s+[^=+\"'\\r\\n;\\/ ]+\\s+import\\s+[^=+\"'\\r\\n;\\/]+)(;|\\/|$)/gm;\n" +

      "      function replace(raw, p1, p2, p3) {\n" +
      "        if (!/\\/\\//.test(p1)) {\n" +
      "          return p1 + 'jsio(\"' + p2 + '\")' + p3;\n" +
      "        }\n" +
      "        return raw;\n" +
      "      };\n" +

      "      exports = function(module, preprocessors) {\n" +
      "        module.src = module.src.replace(importExpr, replace);\n" +
      "      };\n",

    compiler: "var srcTable = {};\n" +

      "       function updatePreprocessors(preprocessors) {\n" +
      "          if(!preprocessors.indexOf('compiler')){\n" +
      "            preprocessors.push('compiler');\n" +
      "          }\n" +
      "          return preprocessors;\n" +
      "        }\n" +

      "        exports = function (module, preprocessors) {\n" +
      "          var jsioNormal = /^(.*)jsio\\s*\\(\\s*(['\"].+?['\"])\\s*(,\\s*\\{[^}]+\\})?\\)/gm;\n" +
      "          var match = jsioNormal.exec(module.src);\n" +
      "          if(match) {\n" +
      "            var request = eval(match[2]);\n" +
      "            jsio(request, updatePreprocessors(preprocessors));\n" +
      "          } \n" +
      "          srcTable[module.path] = JSON.parse(JSON.stringify(module));\n" +
      "          module.src = '';\n" +
      "        };\n" +

      "        exports.compile = function(request) {\n" +
      "          jsio(request, ['import', 'compiler']);\n" +
      "        };\n" +

      "        exports.generateSrc = function (callback) {\n" +
      "          function getJsioSrc() {\n" +
      "            var src = jsio.__init.toString();\n" +
      "            if (src.substring(0, 8) == 'function') {\n" +
      "              src = 'var jsio=(' + src + '());\\n';\n" +
      "            }\n" +
      "            return src;\n" +
      "          }\n" +
      "          var jsioSrc = getJsioSrc();\n" +
      "          jsioSrc = jsioSrc + 'jsio.modules('+ JSON.stringify(srcTable) +');';\n" +
      '          callback(jsioSrc);\n' +
      "        };\n"
  },

  jsio: (function() {
    var _jsio = (function init() {
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
        var module = JSIO.__loadModule(request);

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
        if (!JSIO.__cache[request.from]) {
          JSIO.__cache[request.from] = JSIO.__modules[request.from];
        }

        return JSIO.__cache[request.from];
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

      var JSIO = makeContext().jsio;
      JSIO.modules = function(modules) {
        JSIO.__modules = modules;
      };

      return JSIO;
    }());

    return _jsio;
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
      this.__jsio.__modules[request.from] = {
        src: eval(request.from),
        path: request.from
      }

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
