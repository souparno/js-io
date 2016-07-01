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
  'import': "var importExpr =/^(\\s*)(import\\s+[^=+*\"'\\r\\n;\\/]+|from\\s+[^=+\"'\\r\\n;\\/ ]+\\s+import\\s+[^=+\"'\\r\\n;\\/]+)(;|\\/|$)/gm;"+
	"function replace(raw, p1, p2, p3) {"+
	  "  return p1 + 'jsio(\"' + p2 + '\")' + p3;"+
	"};"+

	"exports = function(src) {"+
	"  return src.replace(importExpr, replace);"+
	"};"
};

var context = {
  jsio: function(request, dontPreprocess) {
    var request = resolveRequest(request);
    var src = eval(request.from);
    if(!dontPreprocess){
      var preprocessor = context.jsio('import preprocessors.import', true);
      src = preprocessor(src);
    }
    var code = "(function (__) { with (__) {" + src + "}});";
    var fn = eval(code);
    context.exports = {};
    fn(context);
    context[request.as] = context.exports;
    return context.exports;
  }
};

var example = {
  app: "import example.calculator as calculator;"+
       "calculator.add(2, 3); console.log(__);",
  calculator: "import example.print as print;" + 
	"exports = {"+
	  "add: function (a, b) {"+
	    "print(a+b);"+
	  "}"+
	"}",
 print: "exports = function(res) {"+
          "console.log(res);"+
         "}"
};

(function(__) {
  with(__) {
    jsio("import example.app");
  }
})(context);
