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

    jsio(imports, ['parser', 'compiler']);

    jsio('compiler').generateSrc(function (str) {
        console.log(str + "jsio('" + imports + "');");
    });
}

run(process.argv[2]);
