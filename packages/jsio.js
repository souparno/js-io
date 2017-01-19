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
    var code = "(function (__) {\n with (__) {\n" + module.src + "\n};\n return __;});";
    var fn = eval(code);

    ctx = fn(ctx);
    if(ctx.module.exports){
      return ctx.module.exports;
    }
    return ctx.exports;
  }

  function loadModule(request) {
    if (!jsio.__cache[request.from]) {
      jsio.__cache[request.from] = jsio.__modules[request.from];
    }

    return jsio.__cache[request.from];
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

  function makeContext() {
    var context = {};

    context.exports = null;
    context.module = {
      exports: null
    };
    context.jsio = function() {
      var args = Array.prototype.slice.call(arguments);

      args.unshift(this);
      return jsio.__require.apply(null, args);
    }

    context.jsio.__require = require;
    context.jsio.__loadModule = loadModule;
    context.jsio.__setModule = setModule;
    context.jsio.__init = init;
    context.jsio.__modules = {};
    context.jsio.__cache = {};
    return context;
  }

  return makeContext().jsio;
}());

module.exports = jsio;
