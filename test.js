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
        var jsio = ctx.jsio;
        var request = resolveRequest(request);
        var module = jsio.__loadModule(request);

        if (module.src) {
          if (!module.exports) {
            execModule(makeContext(ctx), module);
          }
          ctx[request.as] = module.exports;
          return ctx[request.as];
        }
      }

      function execModule(ctx, module) {
        var code = "(function (__) { with (__) {\n" + module.src + "\n}});";
        var fn = eval(code);
        fn(ctx);
        module.exports = ctx.exports;
      }

      function loadModule(request) {
        if (!JSIO.__cache[request.from]) {
          JSIO.__cache[request.from] = JSIO.__modules[request.from];
        }
        return JSIO.__cache[request.from];
      }

      function makeContext(ctx) {
        if (!ctx) {
          ctx = {};
          ctx.exports = {}
          ctx.jsio = function() {
            var args = Array.prototype.slice.call(arguments);

            args.unshift(ctx);
            return ctx.jsio.__require.apply(null, args);
          }
        }
        return ctx;
      }

      var JSIO = makeContext().jsio;

      JSIO.__require = require;
      JSIO.__loadModule = loadModule;
      JSIO.__init = init;
      JSIO.__modules = {};
      JSIO.__cache = {};
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
        __require: JSIO.__require,
        __loadModule: JSIO.__loadModule,
        __modules: JSIO.__modules
      }

      return fn.bind(context);
    }

    var preprocess = function(jsio, module, preprocessors) {
      preprocessors = preprocessors || ['import'];
      preprocessors.forEach(function(preprocessor, index) {
        preprocessor = jsio('import packages.preprocessors.' + preprocessor, []);
        preprocessor(module, preprocessors);
      });
    }

    var loadModule = Extends(function(ctx, preprocessors, request) {
      this.__modules[request.from] = {
        src: eval(request.from),
        path: request.from
      }

      var module = this.__loadModule(request);
      preprocess(ctx.jsio, module, preprocessors);
      return module;
    });

    var require = Extends(function(ctx, request, preprocessors) {
      ctx.jsio.__loadModule = loadModule.bind(null, ctx, preprocessors);
      return this.__require(ctx, request);
    });

    JSIO.__require = require;
    return JSIO;
  }
}

var example = {
  app: "import example.calculator as calculator;" +
    "   calculator.add(2, 3);",

  calculator: "import example.print as print;" +
    "          exports = {" +
    "            add: function (a, b) {" +
    "              print(a+b);" +
    "            }" +
    "          }",

  print: "exports = function(res) {" +
    "       console.log(res);" +
    "     }"
};

var Jsio = packages.compiler();
var compiler = Jsio('import packages.preprocessors.compiler;');
compiler.compile('import example.app;');
compiler.generateSrc(function(src) {
  console.log(src + "jsio('import example.app;');");
});
