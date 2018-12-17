var jsio = require('./packages/compiler');

jsio('import packages.preprocessors.browserify as browserify');

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

    jsio.global.browserify.run(jsio.global, imports, ['import']);
    jsio.global.browserify.generateSrc(function (src) {
        console.log(src + "jsio('" + imports + "');");
    });
}

run(process.argv[2]);
