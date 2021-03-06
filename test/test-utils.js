const supertest = require('supertest');

function request(app, verb, uri)
{
    return supertest(app)[verb](uri).set('Content-Type', 'application/json').set('Accept', 'application/json');
}

module.exports = {
    request: request
};