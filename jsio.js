var jsio = require('./packages/compiler');
var compiler = jsio('import .packages.preprocessors.compiler');

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
    compiler.compile(imports, ['import']);
    compiler.generateSrc(function (src) {
        console.log(src + "jsio('" + imports + "');");
    });
}

run(process.argv[2]);

