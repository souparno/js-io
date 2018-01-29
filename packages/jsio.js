// Copyright (c) 2017
// Souparno Majumder (souparno.majumder@gmail.com)
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

;
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

  function _require(ctx, fromDir, fromFile, request) {
    var request = resolveRequest(request);
    var moduleDef = jsio.__loadModule(fromDir, fromFile, request);

    if (!moduleDef.exports) {
      var newContext = jsio.__makeContext(moduleDef);

      moduleDef.exports = newContext.exports;
      if (jsio.__preprocess) {
        jsio.__preprocess(moduleDef);
      }
      moduleDef.exports = execModule(newContext, moduleDef);
    }
    ctx[request.as] = moduleDef.exports;

    return ctx[request.as];
  }

  function setModule(module) {
    jsio.__modules = module;
  }

  function loadModule(fromDir, fromFile, request) {
    if (!jsio.__cache[request.from]) {
      jsio.__cache[request.from] = jsio.__modules[request.from];
    }

    return jsio.__cache[request.from];
  }

  function execModule(ctx, moduleDef) {
    var code = "(function (__) { with (__) {" + moduleDef.src + "};});";
    var fn = eval(code);

    fn(ctx);
    if (moduleDef.exports != ctx.module.exports) {
      return ctx.moduleDef.exports;
    }
    return ctx.exports;
  }

  function makeContext(moduleDef) {
    var context = {};
    var directory = moduleDef.directory;
    var filename = moduleDef.filename;

    context.exports = {};
    context.module = {};
    context.module.exports = context.exports;
    context.jsio = util.bind(_require, null, context, directory, filename);
    context.jsio.__util = util;
    context.jsio.__require = _require;
    context.jsio.__loadModule = loadModule;
    context.jsio.__setModule = setModule;
    context.jsio.__makeContext = makeContext;
    context.jsio.__preprocess = null;
    context.jsio.__init = init;
    context.jsio.__modules = {};
    context.jsio.__cache = {};
    return context;
  }

  return makeContext({
    directory: null,
    filename: null
  }).jsio;
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
