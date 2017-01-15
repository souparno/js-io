var jsio = (function quine() {
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
    var code = "(function (__) {\n with (__) {\n" + module.src + "\n};\n return __.exports;\n});";
    var fn = eval(code);

    return fn(ctx);
  }

  function loadModule(request) {
    if (!jsio.__cache[request.from]) {
      jsio.__cache[request.from] = jsio.__modules[request.from];
    }

    return jsio.__cache[request.from];
  }

  function setModule(key, module) {
    jsio.__modules[key] = module;
  }

  function setModules(modules) {
    jsio.__modules = modules;
  }

  function makeContext() {
    return {
      jsio: context.jsio,
      exports: context.exports
    };
  }

  var context = {
    exports: {},
    jsio: function() {
      var args = Array.prototype.slice.call(arguments);

      args.unshift(this);
      return jsio.__require.apply(null, args);
    }
  };

  context.jsio.__require = require;
  context.jsio.__loadModule = loadModule;
  context.jsio.__setModule = setModule;
  context.jsio.__setModules = setModules;
  context.jsio.__quine = quine;
  context.jsio.__modules = {};
  context.jsio.__cache = {};

  return makeContext().jsio;
}());

module.exports = jsio;
