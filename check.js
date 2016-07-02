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

var preprocessors = {
  import: "var importExpr = /^(\\s*)(import\\s+[^=+*\"'\\r\\n;\\/]+|from\\s+[^=+\"'\\r\\n;\\/ ]+\\s+import\\s+[^=+\"'\\r\\n;\\/]+)(;|\\/|$)/gm;" +
    "function replace(raw, p1, p2, p3) {" +
    "  return p1 + 'jsio(\"' + p2 + '\")' + p3;" +
    "};" +
    "exports = function(src) {" +
    "  return src.replace(importExpr, replace);" +
    "};",
  compiler: "var srcTable = [];"+
    "        exports = function (src) {" +
    "          var jsioNormal = " + /^(.*)jsio\s*\(\s*(['"].+?['"])\s*(,\s*\{[^}]+\})?\)/gm + "\n;" +
    "          var match = jsioNormal.exec(src);\n" +
    "          if(match) {" +
    "            var request = eval(match[2]);\n" +
    "            jsio(request, ['import', 'compiler']);\n" +
    "          } \n" +
    "          srcTable.push(src);"+
    "          return '';\n" +
    "        };" +
    "        exports.compile = function(request) {" +
    "          jsio(request, ['import', 'compiler']);" +
    "        };" + 
    "        exports.generateSrc = function (callback) {"+
    "          callback(srcTable);"+
    "        };"
};

function _require(previousCtx, request, p) {
  var p = p || ['import'];
  var request = resolveRequest(request);
  var src = eval(request.from);

  p.forEach(function(name, index) {
    var args = name == 'import' ? [] : null;
    var preprocessor = jsio('import preprocessors.' + name, args);

    src = preprocessor(src);
  });

  var code = "(function (__) { with (__) {" + src + "}});";
  var fn = eval(code);
  var context = makeContext();
  fn(context);
  previousCtx[request.as] = context.exports;
  return context.exports;
}

function makeContext() {
  return {
    jsio: function(request, p) {
      return _require(this, request, p);
    },
    exports: {}
  };
}

var jsio = makeContext().jsio;

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

var compiler = jsio('import preprocessors.compiler;');
compiler.compile('import example.app;');
compiler.generateSrc(function(src) {
  console.log(src);
});