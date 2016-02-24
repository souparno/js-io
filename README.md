# js.io

js.io is a multi-platform package management and module system for JavaScript. js.io
modules can be evaluated in a JavaScript runtime (e.g. node.js) or
precompiled into a single package for use on the client side.

js.io provides the following:

A module system.
Dependency graph that works in the client and the browser.

js.io compiler:

    $ jsio-compile

Eample:

    $ node jsio-compile example.app > build.js
    $ node build.js
