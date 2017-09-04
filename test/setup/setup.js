const doog = require('../../index');

const defaultModels = require('../../lib/config/models');
const customModels = require('./config/models');
const totalModels = defaultModels.concat(customModels);

/**
 * Tests automatic setup of app
 */
describe('App.setup() Suite', () =>
{
    let app;
    before(done =>
    {
        app = doog(__dirname);
        done();
    });

    it('should add correct models to app.modelConfig', done =>
    {
        expect(app.modelConfig, 'app.modelConfig not created').to.exist;
        expect(app.modelConfig, 'app.modelConfig not an array').to.be.an('array');
        expect(app.modelConfig.length, 'app.modelConfig.length incorrect').to.equal(totalModels.length);

        app.modelConfig.forEach((m, i) =>
        {
            expect(m.name, 'app.modelConfig name mismatch').to.equal(totalModels[i].name);
            expect(m.public, 'app.modelConfig public mismatch').to.equal(totalModels[i].public);
            expect(m.definitionFile, `app.modelConfig model ${m.name} has no definitionFile`).to.exist;
        });
        done();
    });

    it('should add correct models to app.models', done =>
    {
        expect(app.models, 'app.models not created').to.exist;
        expect(app.models, 'app.modelConfig not an object').to.be.an('object');
        expect(Object.keys(app.models).length, 'app.models length incorrect').to.equal(totalModels.length);

        totalModels.forEach((m, i) =>
        {
            let model = app.models[m.name];
            expect(model, `Model ${m.name} not added to app.models`).to.exist;
            expect(model.app, `app not attached to model ${m.name}`).to.exist;
        });
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