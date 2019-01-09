const assert = require('assert');
const shelljs = require('shelljs');

describe('jsio.js', () => {
  describe('test case #1', () => {
    it('should handle regular jsio.js syntax', done => {
      shelljs.exec('node jsio.js ./__tests__/test1/app.js | node', { silent: true} ,(code, stdout, stderr) => {
        assert.equal(stdout, 5);
        done();
      });
    });
  });
  describe('test case #2', () => {
    it('should handle self dependent jsio.js syntax', done => {
      shelljs.exec('node jsio.js ./__tests__/test2/app.js | node', { silent: true} ,(code, stdout, stderr) => {
        assert.equal(stdout, 5);
        done();
      });
    });
  });
  describe('test case #3', () => {
    it('should handle self one to many dependency jsio.js syntax', done => {
      shelljs.exec('node jsio.js ./__tests__/test3/app.js | node', { silent: true} ,(code, stdout, stderr) => {
        assert.equal(stdout, 5);
        done();
      });
    });
  });
  describe('test case #4', () => {
    it('should handle regular javascript syntax', done => {
      shelljs.exec('node jsio.js ./__tests__/test4/app.js | node', { silent: true} ,(code, stdout, stderr) => {
        assert.equal(stdout, 5);
        done();
      });
    });
  });
  describe('test case #5', () => {
    it('should handle self dependent javascript syntax', done => {
      shelljs.exec('node jsio.js ./__tests__/test5/app.js | node', { silent: true} ,(code, stdout, stderr) => {
        assert.equal(stdout, 5);
        done();
      });
    });
  });
  describe('test case #6', () => {
    it('should handle self contained javascript syntax', done => {
      shelljs.exec('node jsio.js ./__tests__/test6/app.js | node', { silent: true} ,(code, stdout, stderr) => {
        assert.equal(stdout, 5);
        done();
      });
    });
  });
});
