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
  import: "var importExpr =/^(\\s*)(import\\s+[^=+*\"'\\r\\n;\\/]+|from\\s+[^=+\"'\\r\\n;\\/ ]+\\s+import\\s+[^=+\"'\\r\\n;\\/]+)(;|\\/|$)/gm;" +
    "function replace(raw, p1, p2, p3) {" +
    "  return p1 + 'jsio(\"' + p2 + '\")' + p3;" +
    "};" +
    "exports = function(src) {" +
    "  return src.replace(importExpr, replace);" +
    "};",
  compiler: ""
};

function _require(previousCtx, request, dontPreprocess) {
  var request = resolveRequest(request);
  var src = eval(request.from);
  if (!dontPreprocess) {
    var preprocessor = jsio('import preprocessors.import;', true);
    src = preprocessor(src);
  }
  var code = "(function (__) { with (__) {" + src + "}});";
  var fn = eval(code);
  var context = makeContext();
  fn(context);
  previousCtx[request.as] = context.exports;
  return context.exports;
}

function makeContext() {
  return {
    jsio: function(request, dontPreprocess) {
      return _require(this, request, dontPreprocess);
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

jsio("import example.app;");
