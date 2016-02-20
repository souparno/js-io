var util = {
    isEmpty: function(obj) {
        for (var prop in obj) {
            if (obj.hasOwnProperty(prop))
                return false;
        }
        return true;
    }
};

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
jsio.__modules = {};

jsio.setModules = function(modules) {
    jsio.__modules = modules;
};

function loadModule(from) {
    return jsio.__modules[from];
};

jsio.addCmd = function(fn) {
    jsio.__cmds.push(fn);
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

