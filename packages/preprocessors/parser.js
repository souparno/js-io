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

function resolveRequest(request) {
    var result = [],
            parts = request.split('.'),
            len = parts.length,
            relative = (len > 1 && !parts[0]),
            i = relative ? 0 : -1;

    (relative && parts[1]) ? result.push('.') : null;

    while (++i < len) {
        result.push(parts[i] ? parts[i] : '..');
    }
    return result.join('/');
}

function testComment(match) {
    return /\/\//.test(match);
}

function replace(raw, p1, p2, p3) {
    if (!testComment(p1)) {
        p2 = resolveImportRequest(p2);
        return p1 + 'var ' + p2.as + ' = require(\'' + resolveRequest(p2.from) + '\')' + p3;
    }

    return raw;
}

module.exports = function (moduleDef) {
    var importExpr = /^(.*)(import\s+[^=+*"'\r\n;\/]+)(;)/gm;

    return moduleDef.src.replace(importExpr, replace);
};
