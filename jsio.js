var jsio = require('./packages/jsio');
var browserify = jsio('import packages.preprocessors.browserify');

function help() {
    console.log("Usage:node jsio <path>/<to>/<file>");
}

function run(imports) {
    if (!imports) {
        help();
        return;
    }

    imports = imports.split(".")[0];
    imports = 'import ' + imports.split("/").join(".") + ';';

    browserify.run(jsio, imports, ['import']);
    browserify.generateSrc(function (str) {
        console.log(str + "jsio('" + imports + "');");
    });
}

run(process.argv[2]);
