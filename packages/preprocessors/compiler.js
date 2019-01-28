"use strict";
var gSrcTable = {};
var gPathList = {};

function testComment(match) {
    return /\/\//.test(match[1]);
}

function getJsioSrc() {
    var src = require.__init.toString();

    return require.__util.concat('var jsio=(', src, '());');
}

function getSrcCache() {
    var str = "{";

    for (var prop in gSrcTable) {
        str = require.__util.concat(str, JSON.stringify(prop), ":", gSrcTable[prop], ",");
    }

    str = require.__util.concat(str.substring(0, str.length - 1), "}");

    return require.__util.concat("jsio.setCache(", str, ");");
}

function setgPathList(cmd) {
    if (!require.__util.isRelativePath(cmd) && require.__pathCache[cmd]) {
        gPathList[cmd] = require.__pathCache[cmd];
    }
}

function getPathJS() {
    var str = JSON.stringify(gPathList);

    return require.__util.concat("jsio.setCachePath(", str, ");");
}

function replace(raw, p1, p2, p3, p4) {
    return require.__util.concat(p1, '', p4);
}

module.exports = function(moduleDef, preprocessors, jsio) {
    var removeFuncBody = /^(\(\s*function\s*\([^=+*"'\r\n.;]+\)\s*\{)((\s*.*)*)(\s*\}\s*\))/gm,
        requireRegex = /^(.*)require\s*\(\s*['"](.+?)['"]\s*(,\s*\{[^}]+\})?\)/gm,
        match, cmd;

    do {
        match = requireRegex.exec(moduleDef.src);

        if (match && !testComment(match)) {
            cmd = match[2];

            jsio(cmd, preprocessors);
            setgPathList(cmd.split('/')[0]);
        }
    } while (match)

    gSrcTable[moduleDef.path] = moduleDef.src;
    // stops eval module src by removing body
    moduleDef.src = moduleDef.src.replace(removeFuncBody, replace);
};

module.exports.generateSrc = function(callback) {
    var str = require.__util.concat(getJsioSrc(), getPathJS(), getSrcCache());

    callback(str);
};