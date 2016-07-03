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

    compiler: "import packages.preprocessors.test as test;var srcTable = {};\n" +

      "       function updatePreprocessors(preprocessors) {\n" +
      "          if(!preprocessors.indexOf('compiler')){\n" +
      "            preprocessors.push('compiler');\n" +
      "          }\n" +
      "          return preprocessors;\n" +
      "        }\n" +

      "        function getJsioSrc() {\n" +
      "          var src = jsio.__init.toString();\n" +
      "          if (src.substring(0, 8) == 'function') {\n" +
      "            src = 'jsio=(' + src + '());\\n';\n" +
      "          }\n" +
      "          return src;\n" +
      "        }\n" +

      "        exports = function (module, preprocessors) {\n" +
      "          var jsioNormal = /^(.*)jsio\\s*\\(\\s*(['\"].+?['\"])\\s*(,\\s*\\{[^}]+\\})?\\)/gm;\n" +
      "          var match = jsioNormal.exec(module.src);\n" +
      "          if(match) {\n" +
      "            var request = eval(match[2]);\n" +
      "            jsio(request, updatePreprocessors(preprocessors));\n" +
      "          } \n" +
      "          srcTable[module.path] = module.src;\n" +
      "          module.src = '';\n" +
      "        };\n" +

      "        exports.compile = function(request) {\n" +
      "          jsio(request, ['import', 'compiler']);\n" +
      "        };\n" +

      "        exports.generateSrc = function (callback) {\n" +
      "          var jsioSrc = getJsioSrc();\n" +
      "          jsioSrc = jsioSrc + 'jsio.modules('+ JSON.stringify(srcTable) +');';\n" +
      '          callback(jsioSrc);\n' +
      "        };\n",
      test: "exports = function() {console.log('hello');}"
  },

  base: (function init(opts) {
    var _cache_context = [];

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

    function _require(previousCtx, request, preprocessors) {
      var request = resolveRequest(request);
      var module = loadModule(request);
      if (opts) opts.preprocess(module, preprocessors);
      if (module.src) {
        if (!_cache_context[request.from]) {
          var code = "(function (__) { with (__) {\n" + module.src + "\n}});";
          var fn = eval(code);
          var context = makeContext();
          fn(context);
          _cache_context[request.from] = context.exports;
        }
        previousCtx[request.as] = _cache_context[request.from];
        return previousCtx[request.as];
      }
    }

    function loadModule(request) {
      if (opts) opts.loadModule(request);

      return {
        src: jsio.__modules[request.from],
        path: request.from
      }
    }

    function makeContext() {
      var ctx = {
        jsio: function(request, preprocessors) {
          return _require(this, request, preprocessors);
        },
        exports: {}
      };

      ctx.jsio.__init = init;
      ctx.jsio.__modules = {};
      return ctx;
    }

    var jsio = makeContext().jsio;

    jsio.modules = function(modules) {
      jsio.__modules = modules;
    };

    return jsio;
  }()),
  jsio: function() {
    var opts = {
      loadModule: function(request) {
        jsio.__modules[request.from] = eval(request.from);
      },

      preprocess: function(module, preprocessors) {
        preprocessors = preprocessors || ['import'];
        preprocessors.forEach(function(preprocessor, index) {
          preprocessor = jsio('import packages.preprocessors.' + preprocessor, []);
          preprocessor(module, preprocessors);
        });
      }
    }

    return packages.base.__init(opts);
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

var jsio = packages.jsio();
var compiler = jsio('import packages.preprocessors.compiler;');
compiler.compile('import example.app;');
compiler.generateSrc(function(src) {
  console.log(src + "jsio('import example.app;');");
});
