 exports.generateSrc = function buildJsio(callback) {
   function getJsioSrc() {
     var src = jsio.__init.toString(-1);
     if (src.substring(0, 8) == 'function') {
       src = 'jsio=(' + src + ')();';
     }
     return src;
   }
   src = getJsioSrc() + "jsio.setCache(" + JSON.stringify(jsio.__srcCache) + ");";
   callback(src);
 };

 exports.compile = function(statement) {
   jsio.__jsio(statement);
 };
