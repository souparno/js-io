var jsio = (function init() {
  var SLICE = Array.prototype.slice,
    util = {
      bind: function bind(method, context) {
        var args = SLICE.call(arguments, 2);

        return function() {
          return method.apply(context, args.concat(SLICE.call(arguments, 0)));
        };
      }
    }

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

    if (!module.exports) {
      var newContext = jsio.__makeContext();

      module.exports = newContext.exports;
      if (jsio.__preprocess) {
        jsio.__preprocess(module, newContext);
      }
      module.exports = execModule(newContext, module);
    }
    ctx[request.as] = module.exports;

    return ctx[request.as];
  }

  function loadModule(request) {
    if (!jsio.__cache[request.from]) {
      jsio.__cache[request.from] = jsio.__modules[request.from];
    }

    return jsio.__cache[request.from];
  }

  function execModule(ctx, module) {
    var code = "(function (__) { with (__) {" + module.src + "};});";
    var fn = eval(code);

    fn(ctx);
    if (module.exports != ctx.module.exports) {
      return ctx.module.exports;
    }
    return ctx.exports;
  }

  function setModule(module) {
    jsio.__modules = module;
  }

  function makeContext() {
    var context = {};

    context.exports = {};
    context.module = {};
    context.module.exports = context.exports;
    context.jsio = util.bind(require, null, context);
    context.jsio.__util = util;
    context.jsio.__require = require;
    context.jsio.__loadModule = loadModule;
    context.jsio.__setModule = setModule;
    context.jsio.__makeContext = makeContext;
    context.jsio.__preprocess = null;
    context.jsio.__init = init;
    context.jsio.__modules = {};
    context.jsio.__cache = {};
    return context;
  }

  return makeContext().jsio;
}());


for (var key in jsio) {
  var prop = jsio[key];

  if (typeof prop === "function") {
    prop.Extends = (function() {
      return function(fn) {
        var context = {
          supr: this
        }

        return jsio.__util.bind(fn, context);
      }
    }())
  }
}

module.exports = jsio;
