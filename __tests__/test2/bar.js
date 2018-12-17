import .foo as foo;

exports = function () {
  foo.hello();
  console.log("hello from bar");
}
