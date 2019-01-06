import .foo as foo;

module.exports.hello = function () {
  console.log("hello from foo");
};

foo.hello();

