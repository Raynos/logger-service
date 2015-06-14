'use strict';

var test = require('tape');

var loggerService = require('../index.js');

test('loggerService is a function', function t(assert) {
    assert.equal(typeof loggerService, 'function');
    assert.end();
});
