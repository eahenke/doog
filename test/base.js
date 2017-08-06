/* This file sets up globals and environment variables for the tests */
process.env.NODE_ENV = 'test';
global.expect = require('chai').expect;