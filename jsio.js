var Jsio = require('./packages/compiler');
var compiler = Jsio('import packages.preprocessors.compiler');

function help() {
  console.log("Usage:node jsio <path>.<to>.<file>");
}

function run(imports) {
  if (!imports) {
    help();
    return;
  }

  imports = 'import ' + imports + ';';
  compiler.compile(imports);
  compiler.generateSrc(function(src) {
    console.log(src + "jsio('" + imports + "');");
  });
};

run(process.argv[2]);

