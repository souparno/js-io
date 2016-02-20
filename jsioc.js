var fs = require("fs"),
    jsio = './jsio.js';

fs.readFile(jsio, 'utf8', function(err, data) {
    if (err) {
        return console.log(err);
    }
    var result = data + 'jsio.setModules({"print":{ src: "exports = function (req) { console.log(req);}" }, "calculator": {src: "import print as print; exports = {add: function (a, b) { print(a+b);}}"},"app": {src: "import calculator as calculator; calculator.add(2, 3);"}}); jsio("import app")';

    console.log(result);
});
