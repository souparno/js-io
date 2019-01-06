var commands = [];

// import myPackage as myPack;
commands.push(function (request, imports) {
    var match = request.match(/^\s*import\s+(.*)$/);

    if (match) {
        request.replace(/\s*([\w.\-$]+)(?:\s+as\s+([\w.\-$]+))?,?/g, function (_, fullPath, as) {
            imports.from = fullPath;
            imports.as = as;
        });
    }

    return match;
});

function resolveImportRequest(request) {
    var imports = {}, i;

    for (i = 0; i < commands.length; i++) {
        if (commands[i](request, imports)) {
            return imports;
        }
    }
}

function testComment(match) {
    return /\/\//.test(match);
}

function replace(raw, p1, p2, p3) {
    if (!testComment(p1)) {
        p2 = resolveImportRequest(p2);
        return p1 + 'var ' + p2.as + ' = jsio(\'' + p2.from + '\')' + p3;
    }

    return raw;
}

module.exports = function (moduleDef) {
    var importExpr = /^(.*)(import\s+[^=+*"'\r\n;\/]+)(;)/gm;

    return moduleDef.src.replace(importExpr, replace);
};
