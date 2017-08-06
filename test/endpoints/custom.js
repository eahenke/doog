const henk = require('../../index');
const rest = require('../../lib/setup/rest');
const setupModels = require('../../lib/setup/setup-models');
const buildModels = require('../../lib/setup/model-builder');
const MongooseAdapter = require('../../lib/adapters/mongoose-adapter');

const request = require('../utils').request;

const appOptions = {
    manualSetup: true,
    suppressDevErrors: true
};

//Make fake models for testing
const EndpointModelDef = {
    name: 'EndpointModel',
    properties:
    {
        name:
        {
            type: 'string'
        }
    }
};

/* Endpoint config */
const privateFn = () =>
{
    return Promise.resolve(
    {
        text: 'Private'
    });
};
const privateFnOpts = {
    name: 'private',
    private: true,
    http:
    {
        verb: 'get',
        path: '/private'
    },
    args: []
};

const publicFn = () =>
{
    return Promise.resolve(
    {
        text: 'Public'
    });
};

const publicFnOpts = {
    name: 'public',
    private: false,
    exposed: false,
    http:
    {
        verb: 'get',
        path: '/public'
    },
    args: []
};

const exposedFn = () =>
{
    return Promise.resolve(
    {
        text: 'Exposed'
    });
};

const exposedFnOpts = {
    name: 'exposed',
    private: false,
    exposed: true,
    http:
    {
        verb: 'get',
        path: '/exposed'
    },
    args: []
};

function EndpointModelLogic(EndpointModel)
{
    EndpointModel.registerEndpoint(privateFn, privateFnOpts);
    EndpointModel.registerEndpoint(publicFn, publicFnOpts);
    EndpointModel.registerEndpoint(exposedFn, exposedFnOpts);
}

describe('Custom Endpoints Router Test', () =>
{
    let app;
    let localAppConfig = [
    {
        name: 'EndpointModel',
        public: false,
    }];

    before(done =>
    {
        app = appBoot(localAppConfig);
        done();
    });

    it('should create endpoints for custom public endpoints', done =>
    {
        const routes = rest(app, localAppConfig);
        expect(routes.stack.length, 'Wrong number of routes').to.equal(2);
        expect(routes.stack[0].regexp.test('/api/endpointmodel/public')).to.equal(true);
        expect(routes.stack[1].regexp.test('/api/endpointmodel/exposed')).to.equal(true);

        // Test internal methods
        const model = app.models.EndpointModel;
        expect(model.private, 'Did not apply private function as model method').to.equal(privateFn);
        expect(model.public, 'Did not apply public function as model method').to.equal(publicFn);
        expect(model.exposed, 'Did not apply exposed function as model method').to.equal(exposedFn);
        done();
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

describe('Custom Endpoints Test', () =>
{
    let app;
    let token;
    const publicUri = '/api/endpointmodel/public';
    const exposedUri = '/api/endpointmodel/exposed';
    const privateUri = '/api/endpointmodel/private';

    before(done =>
    {
        let localAppConfig = [
        {
            name: 'EndpointModel',
            public: true,
        }];

        app = appBoot(localAppConfig);

        app.use('/', rest(app, app.modelConfig));
        app.useErrorHandler();

        //Make a user and login, save token for use
        var userData = {
            username: 'test',
            password: 'secret'
        };
        app.models.User.create(userData).then(user =>
        {
            return app.models.User.login(userData.username, userData.password);
        }).then(res =>
        {
            token = res.id;
            done();
        }).catch(done);
    });

    it('should allow access to exposed endpoint without token', done =>
    {
        request(app, 'get', exposedUri).then(res =>
        {
            expect(res.status).to.equal(200);
            expect(res.body.text).to.equal('Exposed');
            done();
        }).catch(done);
    });

    it('should allow access to exposed endpoint with token', done =>
    {
        request(app, 'get', `${exposedUri}?access_token=${token}`).then(res =>
        {
            expect(res.status).to.equal(200);
            expect(res.body.text).to.equal('Exposed');
            done();
        }).catch(done);
    });

    it('should allow internal access to exposed endpoint', done =>
    {
        app.models.EndpointModel.exposed().then(res =>
        {
            expect(res.text).to.equal('Exposed');
            done();
        }).catch(done);
    });

    it('should not allow access to public endpoint without token', done =>
    {
        request(app, 'get', publicUri).then(res =>
        {
            expect(res.status).to.equal(401);
            expect(res.body.error.message).to.equal('Unauthorized');
            done();
        }).catch(done);
    });

    it('should allow access to public endpoint with token', done =>
    {
        request(app, 'get', `${publicUri}?access_token=${token}`).then(res =>
        {
            expect(res.status).to.equal(200);
            expect(res.body.text).to.equal('Public');
            done();
        }).catch(done);
    });

    it('should allow internal access to public endpoint', done =>
    {
        app.models.EndpointModel.public().then(res =>
        {
            expect(res.text).to.equal('Public');
            done();
        }).catch(done);
    });

    it('should not allow access to private endpoint without token', done =>
    {
        request(app, 'get', privateUri).then(res =>
        {
            expect(res.status).to.equal(404);
            done();
        }).catch(done);
    });

    it('should not allow access to private endpoint with token', done =>
    {
        request(app, 'get', `${privateUri}?access_token=${token}`).then(res =>
        {
            expect(res.status).to.equal(404);
            done();
        }).catch(done);
    });

    it('should allow internal access to private endpoint', done =>
    {
        app.models.EndpointModel.private().then(res =>
        {
            expect(res.text).to.equal('Private');
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

function appBoot(modelConfig)
{
    let app = henk(appOptions);

    app.adapter = new MongooseAdapter(
    {
        host: 'localhost',
        database: 'henk-test'
    });
    app.adapter.addConnection();
    app.addDefaultModels();
    app.modelDefinitions = {};
    app.modelDefinitions.EndpointModel = {
        definition: EndpointModelDef,
        logic: EndpointModelLogic
    };
    app.modelConfig = app.modelConfig.concat(modelConfig);
    buildModels(app);

    return app;
}