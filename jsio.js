"use strict";
var jsio = require('./packages/jsio');

function help() {
    console.log("Usage:node jsio <path>/<to>/<file>");
}

function run(imports) {
    if (!imports) {
        return help();
    }

    jsio.path.add('packages/preprocessors/');
    jsio.path.add('__tests__/');
    jsio(imports, ['./packages/preprocessors/parser', './packages/preprocessors/compiler']);

    jsio('compiler').generateSrc(function(str) {
        console.log(jsio.__util.concat(str, "jsio('", imports, "');"));
    });
}

run(process.argv[2]);