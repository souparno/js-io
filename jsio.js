var jsio = require('./packages/jsio');
var compiler = jsio('import .packages.preprocessors.compiler', {
    preprocessors: 'import'
});


function run(imports) {
    compiler.compile(imports);

    compiler.generateSrc(function(src) {
        console.log(src + "jsio('" + imports + "');");
    });
};

run(process.argv[2]);
