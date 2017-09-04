const doog = require('../../index');
const rest = require('../../lib/setup/rest');
const MongooseAdapter = require('../../lib/adapters/mongoose-adapter');
const buildModels = require('../../lib/setup/model-builder');
const request = require('../test-utils').request;

const appOptions = {
    manualSetup: true,
    suppressDevErrors: true
};

//Make fake models for testing
const PublicModelDef = {
    name: 'PublicModel',
    properties:
    {
        name:
        {
            type: 'string'
        }
    }
};

//Make fake models for testing
const PrivateModelDef = {

    name: 'PrivateModel',
    properties:
    {
        name:
        {
            type: 'string'
        }
    }
};

const localModelConfig = [
{
    name: 'PublicModel',
    public: true
},
{
    name: 'PrivateModel',
    public: false
}];

//TODO - add patchMany
let verbs = [
{
    name: 'get',
    verb: 'get',
    idParam: false
},
{
    name: 'getById',
    verb: 'get',
    idParam: true
},
{
    name: 'post',
    verb: 'post',
    idParam: false
},
{
    name: 'patch',
    verb: 'patch',
    idParam: true
},
{
    name: 'delete',
    verb: 'delete',
    idParam: true
}];

describe('REST Router Test', () =>
{
    before(done =>
    {
        app = appBoot(localModelConfig);
        done();
    });

    it('should create routes for default verbs for public models', done =>
    {

        const routes = rest(app, localModelConfig);
        expect(routes.stack.length, 'Number of routes does not match number of verbs').to.equal(verbs.length);
        routes.stack.forEach((r, i) =>
        {
            let verb = verbs[i];
            if (!verb.idParam) expect(r.route.path, 'Incorrect path').to.equal('/api/publicmodel');
            else expect(r.route.path, 'Incorrect path').to.equal('/api/publicmodel/:id([a-fA-F\\d]{24})');

            let final = r.route.stack[r.route.stack.length - 1];
            expect(final.method, 'Wrong HTTP verb').to.equal(verb.verb);
        });
        done();
    });
});

describe('REST Endpoint Test', () =>
{
    let app;
    let token;
    before(done =>
    {
        app = appBoot(localModelConfig);
        app.use('/', rest(app, app.modelConfig));
        app.useErrorHandler();

        const userData = {
            username: 'test',
            password: 'secret'
        };

        app.models.User.create(userData).then(() =>
        {
            return app.models.User.login(userData.username, userData.password);
        }).then(res =>
        {
            token = res.id;
            done();
        }).catch(done);
    });

    it('should not allow access to REST endpoints without a token', done =>
    {
        request(app, 'get', '/api/publicmodel').then(res =>
        {
            expect(res.status).to.equal(401);
            expect(res.body.error.message).to.equal('Unauthorized');
            done();
        }).catch(done);
    });

    it('should allow access to REST endpoints with a token', done =>
    {
        request(app, 'get', `/api/publicmodel?access_token=${token}`).then(res =>
        {
            expect(res.status).to.equal(200);
            expect(res.body).to.be.an('array');
            expect(res.body.length).to.equal(0);
            done();
        }).catch(done);
    });

    after(done =>
    {
        app.adapter.dropDatabase().then(() =>
        {
            done();
        });
    });
});

function appBoot(modelConfig)
{
    let app = doog(appOptions);

    app.adapter = new MongooseAdapter(
    {
        host: 'localhost',
        database: 'doog-test'
    });
    app.adapter.addConnection();
    app.addDefaultModels();
    app.modelDefinitions = {
        PublicModel:
        {
            definition: PublicModelDef,
        },
        PrivateModel:
        {
            definition: PrivateModelDef,
        }
    };

    app.modelConfig = app.modelConfig.concat(localModelConfig);
    buildModels(app);
    return app;
}