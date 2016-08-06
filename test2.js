//var ctx = {};

var context = {
  exports: {},
  jsio: function() {
    var args = Array.prototype.slice.call(arguments);

    args.unshift(context);
    return context.jsio.__require.apply(null, args);
  }
};

function makeContext() {
  var _ctx = {};
  for (var p in context) {
    _ctx[p] = context[p];
  }
  context = _ctx;
  return context;
}

function require(ctx, req) {
  var jsio = ctx.jsio;
  var fn = eval(req);
  ctx[req] = fn(makeContext());
}

var jsio = makeContext().jsio;
jsio.__require = require;

var print = function(__) {
  with(__) {
    exports = function(p) {
      console.log(p);
    }
  }

  return __.exports;
}

var bar = function(__) {
  with(__) {
    jsio('print');
    exports = function() {
      print("hello World");
    }
  }
  return __.exports;
}

var foo = function(__) {
  with(__) {
    jsio('bar');
    console.log(__);
    bar();
  }
  return __.exports;
}

//var jsio = makeContext().jsio;
jsio('foo');
