var jsio = require('./cc');

function getJsioSrc() {
  var src = jsio.__init__.toString(-1);
  if (src.substring(0, 8) == 'function') {
    src = 'var jsio=(' + src + '());';
  }
  return src;
}


console.log(getJsioSrc());

