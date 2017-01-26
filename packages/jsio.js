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

    if (module.src) {
      if (!module.exports) {
        var newContext = makeContext();

        module.exports = newContext.exports;
        if (jsio.__preprocess) {
          jsio.__preprocess(module);
        }
        module.exports = execModule(newContext, module);
      }
      ctx[request.as] = module.exports;

      return ctx[request.as];
    }
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

  function setModule(module, key) {
    if (key) {
      if (!jsio.__modules[key]) {
        jsio.__modules[key] = module;
      }
      return;
    }

    jsio.__modules = module;
  }

  function __jsio() {
    return jsio.__require.apply(null, arguments);
  }

  function makeContext() {
    var context = {
      jsio: util.bind(__jsio, null, this),
      exports: {},
      module: {}
    };

    context.module.exports = context.exports;
    context.jsio.__util = util;
    context.jsio.__require = require;
    context.jsio.__loadModule = loadModule;
    context.jsio.__setModule = setModule;
    context.jsio.__preprocess = null;
    context.jsio.__init = init;
    context.jsio.__modules = {};
    context.jsio.__cache = {};
    return context;
  }

  return makeContext().jsio;
}());

[jsio.__require, jsio.__loadModule].forEach(function(supr) {
  supr.Extends = function(fn) {
    var context = {
      supr: this
    }

    return jsio.__util.bind(fn, context);
  }
});

module.exports = jsio;
