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
jsio.__preprocessors = [];
jsio.__modules = {};

jsio.setModules = function(modules) {
    jsio.__modules = modules;
};

function loadModule(from) {
    var module = jsio.__modules[from];
    module.src = applyPreprocessors(module.src);
    return module;
};

jsio.addCmd = function(fn) {
    jsio.__cmds.push(fn);
};

jsio.addPreprocessors = function(fn) {
    jsio.__preprocessors.push(fn);
}

function applyPreprocessors(src) {
    var preprocessors = jsio.__preprocessors;

    for (var index in preprocessors) {
        src = preprocessors[index](src);
    }
    return src;
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

jsio.addPreprocessors(function(src) {
    var importExpr = /^(\s*)(import\s+[^=+*"'\r\n;\/]+|from\s+[^=+"'\r\n;\/ ]+\s+import\s+[^=+"'\r\n;\/]+)(;|\/|$)/gm;
    return src.replace(importExpr,
        function(raw, p1, p2, p3) {
            if (!/\/\//.test(p1)) {
                return p1 + 'jsio(\'' + p2 + '\')' + p3;
            }
            return raw;
        });
});

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

jsio.setModules({
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
