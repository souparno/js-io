var util = {
    isEmpty: function(obj) {
        for (var prop in obj) {
            if (obj.hasOwnProperty(prop))
                return false;
        }
        return true;
    }
}


function jsio(req, exportInto) {
    var args = {
            exports: {},
            jsio: function(req) {
                jsio(req, args);
            }
        },
        item = resolveImportRequest(req),
        module = loadModule(item.from),
        src = "(function (_) { with (_) {" + module.src + "}});",
        fn = eval(src);

    fn(args);
    exportInto = exportInto || {};
    exportInto[item.as] = args.exports;
};

jsio.__cmds = [];

jsio.setCache = function(cache) {
    jsio.__srcCache = cache;
};

function loadModule(from) {
    var module = jsio.__srcCache[from];
    module.src = applyPreprocessors(module.src);
    return module;
};

jsio.addCmd = function(fn) {
    jsio.__cmds.push(fn);
};

function applyPreprocessors(src) {
    var importExpr = /^(\s*)(import\s+[^=+*"'\r\n;\/]+|from\s+[^=+"'\r\n;\/ ]+\s+import\s+[^=+"'\r\n;\/]+)(;|\/|$)/gm;
    return src.replace(importExpr,
        function(raw, p1, p2, p3) {
            if (!/\/\//.test(p1)) {
                return p1 + 'jsio(\'' + p2 + '\')' + p3;
            }
            return raw;
        });
};

function resolveImportRequest(request) {
    var cmds = jsio.__cmds,
        imports = {};

    for (var index in cmds) {
        imports = cmds[index](request);
        if (!util.isEmpty(imports)) {
            break;
        }
    }
    return imports;
};

jsio.addCmd(function(request) {
    var match = request.match(/^\s*import\s+(.*)$/),
        imports = {};

    if (match) {
        match[1].replace(/\s*([\w.\-$]+)(?:\s+as\s+([\w.\-$]+))?,?/g, function(_, from, as) {
            imports = {
                from: from,
                as: as || from
            };
        });
    }
    return imports;
});

jsio.setCache({
    "print": {
        src: "exports = function (req) { console.log(req);}"
    },
    "calculator": {
        src: "import print as print; exports = {add: function (a, b) { print(a+b);}}"
    },
    "app": {
        src: "import calculator as calculator; calculator.add(2, 3);"
    }

});

jsio('import app');
