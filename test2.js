
function require(ctx, req) {
  var fn = eval(req);
  ctx[req] = fn(makeContext(ctx.jsio));
}

function makeContext(jsio) {
  ctx = {};
  ctx.exports = {};
  ctx.jsio = jsio || function(req) {
    var args = Array.prototype.slice.call(arguments);

    args.unshift(ctx);
    return ctx.jsio.__require.apply(null, args);
  }
  return ctx;
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
