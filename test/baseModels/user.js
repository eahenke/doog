const expect = require('chai').expect;
const models = require('../../lib/config/models');
const User = require('../../lib/models/User');
const request = require('../test-utils').request;

const henk = require('../../index');
const rest = require('../../lib/setup/rest');
const MongooseAdapter = require('../../lib/adapters/mongoose-adapter');

const appOptions = {
    manualSetup: true,
    suppressDevErrors: true
};

describe('User Model Tests', () =>
{
    let app;

    let createdUser;
    let returnedToken;
    const userInfo = {
        username: 'test',
        password: 'secret',
        admin: true
    };

    before(done =>
    {
        app = henk(appOptions);
        app.adapter = new MongooseAdapter(
        {
            host: 'localhost',
            database: 'henk-test'
        });
        app.adapter.addConnection();

        app.addDefaultModels();
        app.use('/', rest(app, app.modelConfig));
        done();
    });

    it('should create a new user', done =>
    {
        app.models.User.create(userInfo).then(user =>
        {
            createdUser = user;
            expect(user).to.exist;
            done();
        }).catch(done);
    });

    it('should login the user locally', done =>
    {
        app.models.User.login(userInfo.username, userInfo.password).then(token =>
        {
            expect(token).to.exist;
            expect(token.userId, 'User.login did not return an Access Token with the correct user id').to.equal(
                createdUser.id
            );
            returnedToken = token;
            done();
        }).catch(done);
    });

    it('should login the user via endpoint', done =>
    {
        request(app, 'post', '/api/user/login').send(userInfo).then(res =>
        {
            expect(res.status).to.equal(200);
            expect(res.body.id, 'User.login did not return the same access token').to.equal(returnedToken.id);
            expect(res.body.userId, 'User.login did not return an Access Token with the correct user id').to.equal(
                createdUser.id
            );
            done();
        }).catch(done);
    });

    after(done =>
    {
        //Cleanup
        app.adapter.dropDatabase().then(() =>
        {
            done();
        }).catch(done);
    });
});