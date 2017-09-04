const doog = require('../../index');
const rest = require('../../lib/setup/rest');
const buildModels = require('../../lib/setup/model-builder');
const MongooseAdapter = require('../../lib/adapters/mongoose-adapter');
const request = require('../test-utils').request;

const appOptions = {
    manualSetup: true,
    suppressDevErrors: true
};

//Make fake models for testing
const HookModelDef = {
    name: 'HookModel',
    properties:
    {
        before:
        {
            type: 'string'
        },
        after:
        {
            type: 'string'
        }

    }
};

const HookModelLogic = function (HookModel)
{
    HookModel.hook('before save', (ctx, next) =>
    {
        ctx.data.before = 'Changed by before save hook';
        return next();
    });

    HookModel.hook('after save', (ctx, next) =>
    {
        ctx.data.after = 'Changed by after save hook';
        return next();
    });

    HookModel.hook('before find', (ctx, next) =>
    {
        const id = randomId(HookModel.app);
        ctx.query = {
            id: id
        };
        next();
    });

    HookModel.hook('after find', (ctx, next) =>
    {
        ctx.data = {
            data: 'Altered by after find hook'
        };
        next();
    });

    HookModel.hook('before delete', (ctx, next) =>
    {
        const id = randomId(HookModel.app);
        ctx.query = {
            id: id
        };
        next();
    });

    HookModel.hook('after delete', (ctx, next) =>
    {
        ctx.data = {
            count: 99
        };
        next();
    });
}

const localModelConfig = [
{
    name: 'HookModel',
    public: true
}];

describe('Operation hooks', () =>
{
    let app;
    let createdModel;

    const testData = {
        before: 'Before Hook',
        after: 'After Hook',
    };

    before(done =>
    {
        app = appBoot(localModelConfig);
        done();
    });

    describe('Save', () =>
    {
        it('should apply before and after save hooks', done =>
        {
            app.models.HookModel.create(testData).then(res =>
            {
                expect(res, 'Incorrect response type').to.be.an('object');
                expect(res.before, 'Before hook did not run').to.equal('Changed by before save hook');
                expect(res.after, 'After hook did not run').to.equal('Changed by after save hook');
                expect(res.id, 'id not assigned').to.exist;
                createdModel = res;
                done();
            }).catch(done);
        });
    });

    describe('Find', () =>
    {
        it('should apply before and after find hooks', done =>
        {
            app.models.HookModel.findById(createdModel.id).then(res =>
            {
                expect(res, 'Incorrect response type').to.be.an('object');
                expect(res.data).to.equal('Altered by after find hook');
                expect(res.before).to.not.exist;
                expect(res.after).to.not.exist;
                done();
            }).catch(done);
        });
    });

    describe('Delete', () =>
    {
        it('should apply before and after delete hooks', done =>
        {
            app.models.HookModel.delete(createdModel.id).then(res =>
            {
                expect(res.count).to.equal(99);
                done();
            }).catch(done);
        });
    });

    after(done =>
    {
        app.adapter.dropDatabase().then(() =>
        {
            done();
        }).catch(done);
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
    app.modelDefinitions = {
        HookModel:
        {
            definition: HookModelDef,
            logic: HookModelLogic,
        },
    };

    app.modelConfig = app.modelConfig.concat(localModelConfig);
    buildModels(app);
    return app;
}

function randomId(app)
{
    return app.adapter.test().randomId();
}