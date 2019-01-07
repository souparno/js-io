var app = require('./app.js');

module.exports.add = function (a, b) {
  console.log(a + b);
};

app.add(2, 3);

