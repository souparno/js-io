# js.io

js.io is a multi-platform package management and module system for JavaScript. js.io
modules can be evaluated in a JavaScript runtime (e.g. node.js) or
precompiled into a single package for use on the client side.


js.io compiler:

    $ packages/compiler.js

Eample:

    $ node testWithNode.js 'import .example.app' > build.js
    $ node build.js
