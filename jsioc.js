var fs = require('fs'),
    util = {
        isEmpty: function(obj) {
            for (var prop in obj) {
                if (obj.hasOwnProperty(prop))
                    return false;
            }
            return true;
        }
    }

function jsio(req, exportInto) {
    exportInto = exportInto || {};

    var item = resolveImportRequest(req),
        moduleDef = loadModule(item.from),
        newContext = makeContext(),
        module = execModuleDef(newContext, moduleDef);

    // add the module to the current context
    if (item.as) {
        // remove trailing/leading dots
        var as = item.as.match(/^\.*(.*?)\.*$/)[1],
            segments = as.split('.'),
            kMax = segments.length - 1,
            c = exportInto;

        // build the object in the context
        for (var k = 0; k < kMax; ++k) {
            var segment = segments[k];
            if (!segment) continue;
            if (!c[segment]) {
                c[segment] = {};
            }
            c = c[segment];
        }
        c[segments[kMax]] = module;
    }
};

jsio.__cmds = [];
jsio.__preprocessors = [];
jsio.__modules = {};

function execModuleDef(context, moduleDef) {
    var code = "(function (_) { with (_) {" + moduleDef.src + "}});",
        fn = eval(code);

    fn = fn(context);
    return context.exports;

}

function makeContext() {
    var args = {
        exports: {},
        jsio: function(req) {
            jsio(req, args);
        }
    };
    return args;
}

function loadModule(path) {
    var result = [],
        parts = path.split('.'),
        len = parts.length,
        i = -1;

    while (++i < len) {
        result.push(parts[i]);
    }

    var _path = result.join('/') + ".js";
    var src = applyPreprocessors(fs.readFileSync(_path, 'utf8'));
    jsio.__modules[path] = {
        path: path,
        src: src
    }

    return jsio.__modules[path];
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

// import myPackage as pack
// OR
// import myPackage
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

fs.readFile('jsio.js', 'utf8', function(err, data) {
    if (err) {
        return console.log(err);
    }
    jsio('import example.app');

    var result = data + "jsio.setModules(" + JSON.stringify(jsio.__modules) + ");jsio('import example.app')";
    fs.writeFile('build.js', result, 'utf8', function(err) {
        if (err) return console.log(err);
    });
});
