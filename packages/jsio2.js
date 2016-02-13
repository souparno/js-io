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
        fn = eval(item.from);

    fn(args);
    exportInto = exportInto || {};
    exportInto[item.as] = args.exports;
};

jsio.__cmds = [];

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



function print(args) {
    with(args) {
        exports = function(req) {
            console.log(req);
        };
    }
};

function calculator(args) {
    with(args) {
        jsio('import print as print');
        exports = {
            add: function(a, b) {
                print(a + b);
                return a + b;
            }
        }
    }
};

function app(args) {
    with(args) {
        jsio('import calculator as calculator');
        //jsio('import print as print');
        print(calculator.add(2, 3));
    }
};

jsio('import app');
