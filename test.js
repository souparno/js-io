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

    compiler: "var srcTable = [];\n" +
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
      "          srcTable[module.path] = module.src;\n" +
      "          module.src = '';\n" +
      "        };\n" +

      "        exports.compile = function(request) {\n" +
      "          jsio(request, ['import', 'compiler']);\n" +
      "        };\n" +

      "        exports.generateSrc = function (callback) {\n" +
      "          callback(srcTable);\n" +
      "        };\n"
  },
  jsio: (function() {
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
      var preprocessors = preprocessors || ['import'];
      var request = resolveRequest(request);
      var module = loadModule(request);

      preprocessors.forEach(function(name, index) {
        var preprocessor = jsio('import packages.preprocessors.' + name, []);
        preprocessor(module, preprocessors);
      });

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
      return {
        src: eval(request.from),
        path: request.from
      }
    }

    function makeContext() {
      return {
        jsio: function(request, p) {
          return _require(this, request, p);
        },
        exports: {}
      };
    }

    return makeContext().jsio;
  }())
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

var jsio = packages.jsio;
//jsio('import example.app;');
var compiler = jsio('import packages.preprocessors.compiler;');
compiler.compile('import example.app;');
compiler.generateSrc(function(src) {
  console.log(src);
});
