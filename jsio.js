var jsio = require('./packages/jsio');
var compiler = jsio('./packages/preprocessors/compiler');

function help() {
    console.log("Usage:node jsio <path>/<to>/<file>");
}

function run(imports) {
    if (!imports) {
        return help();
    }

    imports = imports.substring(0, imports.lastIndexOf('.'));
    compiler.run(jsio, imports, ['parser', 'compiler']);
    compiler.generateSrc(function (str) {
        console.log(str + "jsio('" + imports + "');");
    });
}

run(process.argv[2]);
