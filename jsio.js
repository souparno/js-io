var jsio = require('./packages/jsio');
var defaultPreprocessor = ['import'];
var browserify = jsio('import packages.preprocessors.browserify', defaultPreprocessor);

function help() {
    console.log("Usage:node jsio <path>/<to>/<file>");
}

function run(imports) {
    if (!imports) {
        return help();
    }

    imports = imports.split(".")[0];
    imports = 'import ' + imports.split("/").join(".");

    browserify.run(jsio, imports, defaultPreprocessor);
    browserify.generateSrc(function (str) {
        console.log(str + "jsio('" + imports + "');");
    });
}

run(process.argv[2]);
