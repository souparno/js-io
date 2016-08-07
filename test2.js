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
  context = {
    exports: context.exports,
    jsio: context.jsio
  }

  return context;
}

function require(ctx, req) {
  var jsio = ctx.jsio;
  var fn = eval(req);
  ctx[req] = fn(makeContext());
}

var jsio = makeContext().jsio;
jsio.__require = require;
jsio.__init = function () {
  console.log("Hello world");
}

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
  
   function check() {
     jsio.__init();
   }

    exports = function() {
      check();
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

jsio('foo');
