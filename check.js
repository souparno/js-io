  var SLICE = Array.prototype.slice,
      util = {
          bind: function bind(method, context) {
              var args = SLICE.call(arguments, 2);

              return function() {
                  return method.apply(context, args.concat(SLICE.call(arguments, 0)));
              };
          },
          resolveRequest: function(request) {
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
          },
          // `buildPath` accepts an arbitrary number of string arguments to concatenate into a path.
          //     util.buildPath('a', 'b', 'c/', 'd/') -> 'a/b/c/d/'
          buildPath: function() {
              var pieces = [],
                  piece, i;

              for (i = 0; i < arguments.length; i++) {
                  piece = arguments[i];
                  if (piece != '.' && piece != './' && piece) {
                      pieces.push(piece);
                  }
              }
              return pieces.join('/');
          },
          resolveRelativeRequest: function(request) {
              var result = [],
                  parts = request.split('.'),
                  len = parts.length,
                  relative = (len > 1 && !parts[0]),
              i = relative ? 0 : -1;
            console.log(parts);
            while (++i < len) {
                  console.log(i, parts[i]);
                  result.push(parts[i] ? parts[i] : '..');
              }
              return result.join('/');
          },
          // `resolveRelativePath` removes relative path indicators.  For example:
          //     util.resolveRelativePath('a/../b') -> b
          resolveRelativePath: function(path) {
              /* Remove multiple slashes and trivial dots (`/./ -> /`). */
              var tempPath = path.replace(/\/+/g, '/').replace(/\/\.\//g, '/');

              /* Loop to collapse instances of `../` in the path by matching a previous
                 path segment.  Essentially, we find substrings of the form `/abc/../`
                 where abc is not `.` or `..` and replace the substrings with `/`.
                 We loop until the string no longer changes since after collapsing
                 possible instances once, we may have created more instances that can
                 be collapsed.
              */
              while ((path = tempPath) != (tempPath = tempPath.replace(/(^|\/)(?!\.?\.\/)([^\/]+)\/\.\.\//g, '$1'))) {}
              return path;
          },
          resolveModulePath: function(fromDir, request) {
              if (request.charAt(0) == '.') {
                  var modulePath = util.resolveRelativePath(util.buildPath(fromDir, util.resolveRelativeRequest(request)));
                  return [
                      modulePath + '.js',
                      modulePath + '/index.js'
                  ]
              }
              //else consider the request on the absolute path
          }
      };
  var fromDir = '/abc/def/ghi/';
  var request = "foo..bar";

  console.log(util.resolveRelativeRequest(request));
