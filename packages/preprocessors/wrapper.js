(function(__) {
    with(__) {
        exports = function(moduleDef) {
            moduleDef.src = "(function (__) { with (__) {" + moduleDef.src + "}})"
        }
    }
})
