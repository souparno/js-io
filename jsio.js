var jsio = require('./packages/compiler');
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

    browserify.run(imports, ['import']);
    browserify.generateSrc(function (src) {
        console.log(src + "jsio('" + imports + "');");
    });
}

run(process.argv[2]);