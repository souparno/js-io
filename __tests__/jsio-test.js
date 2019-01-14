const assert = require('assert');
const shelljs = require('shelljs');

describe('jsio.js', () => {
    describe('test case #1', () => {
        it('should handle regular jsio.js syntax', done => {
            shelljs.exec('node jsio.js ./__tests__/test1/app.js | node', {
                silent: true
            }, (code, stdout, stderr) => {
                assert.equal(stdout, 5);
                done();
            });
        });
    });

    describe('test case #2', () => {
        it('should handle recursive jsio.js dependencies', done => {
            shelljs.exec('node jsio.js ./__tests__/test2/app.js | node', {
                silent: true
            }, (code, stdout, stderr) => {
                assert.equal(stdout, 5);
                done();
            });
        });
    });

    describe('test case #3', () => {
        it('should handle self one to many dependency jsio.js syntax', done => {
            shelljs.exec('node jsio.js ./__tests__/test3/app.js | node', {
                silent: true
            }, (code, stdout, stderr) => {
                assert.equal(stdout, 5);
                done();
            });
        });
    });

    describe('test case #4', () => {
        it('should handle regular es6 require', done => {
            shelljs.exec('node jsio.js ./__tests__/test4/app.js | node', {
                silent: true
            }, (code, stdout, stderr) => {
                assert.equal(stdout, 5);
                done();
            });
        });
    });

    describe('test case #5', () => {
        it('should handle recursive es6 dependencies', done => {
            shelljs.exec('node jsio.js ./__tests__/test5/app.js | node', {
                silent: true
            }, (code, stdout, stderr) => {
                assert.equal(stdout, 5);
                done();
            });
        });
    });

    describe('test case #6', () => {
        it('module.exports should be able to get accesed withing the source itself', done => {
            shelljs.exec('node jsio.js ./__tests__/test6/app.js | node', {
                silent: true
            }, (code, stdout, stderr) => {
                assert.equal(stdout, 5);
                done();
            });
        });
    });

    describe('test case #7', () => {
        it('jsio should cache absolute paths', done => {
            shelljs.exec('node jsio.js ./__tests__/test7/app.js | node', {
                silent: true
            }, (code, stdout, stderr) => {
                assert.equal(stdout, 5);
                done();
            });
        });
    });

    describe('test case #8', () => {
        it('jsio should be able to handle exports alias to module.exports', done => {
            shelljs.exec('node jsio.js ./__tests__/test8/app.js | node', {
                silent: true
            }, (code, stdout, stderr) => {
                assert.equal(stdout, 5);
                done();
            });
        });
    });
});