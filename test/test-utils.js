const supertest = require('supertest');

function request(app, verb, uri)
{
    return supertest(app)[verb](uri).set('Content-Type', 'application/json').set('Accept', 'application/json');
    // .expect('Content-Type', /json/);
}

module.exports = {
    request: request
};