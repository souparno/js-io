var jsio = require('./jsio');

function getJsioSrc() {
  var src = 'var jsio=(' + jsio.__init__.toString(-1) + '());';

  return src;
}


console.log(getJsioSrc());

