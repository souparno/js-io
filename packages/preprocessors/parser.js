var importExpr = /^(.*)(import\s+[^=+*"'\r\n;\/]+|from\s+[^=+"'\r\n;\/ ]+\s+import\s+[^=+"'\r\n;\/]+)(;|\/|$)/gm;
var commands = [];

// import myPackage;
// import myPackage as myPack;
commands.push(function (request, imports) {
    var match = request.match(/^\s*import\s+(.*)$/);

    if (match) {
        match[1].replace(/\s*([\w.\-$]+)(?:\s+as\s+([\w.\-$]+))?,?/g, function (_, fullPath, as) {
            imports.from = fullPath;
            imports.as = as ? as : fullPath;
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

function replace(raw, p1, p2, p3) {
    if (!/\/\//.test(p1)) {
      raw = resolveImportRequest(p2)
      raw = p1 + 'var ' + raw.as + ' = jsio(\'' + raw.from + '\')' + p3;
    }

    return raw;
}

module.exports = function (moduleDef) {
    return moduleDef.src.replace(importExpr, replace);
};
