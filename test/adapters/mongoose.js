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
const CrudModelDef = {
    name: 'CrudModel',
    properties:
    {
        name:
        {
            type: 'string'
        },
        secret:
        {
            type: 'string',
            hidden: true
        }
    }
};

const localModelConfig = [
{
    name: 'CrudModel',
    public: true
}];

describe('Crud Test Suite', () =>
{
    describe('App internal', () =>
    {

        let app;
        let createdModel;
        let anotherModel;
        let unchangedModel;
        let ids = [];

        const testData = {
            name: 'Crud',
            secret: 'secret',
        };

        const updateData = {
            name: 'updated'
        };

        const updateManyData = {
            name: 'updateMany'
        };

        before(done =>
        {
            app = appBoot(localModelConfig);
            done();
        });

        describe('Model.create()', () =>
        {
            it('should create new model', done =>
            {
                app.models.CrudModel.create(testData).then(res =>
                {
                    expect(res, 'Incorrect response type').to.be.an('object');
                    expect(res.name, 'returned data is incorrect').to.equal(testData.name);
                    expect(res.id, 'id not assigned').to.exist;
                    expect(res.secret, 'hidden field was incorrectly hidden internally').to.exist;

                    createdModel = res;

                    done();
                }).catch(done);
            });
        });

        describe('Model.find()', () =>
        {
            it('should find existing models', done =>
            {
                app.models.CrudModel.find().then(res =>
                {
                    expect(res, 'Incorrect response type').to.be.an('array');
                    expect(res.length, 'Incorrect number of results').to.equal(1);
                    expect(res[0].name, 'returned data is incorrect').to.equal(createdModel.name);
                    expect(res[0].id, 'incorrect id').to.equal(createdModel.id);
                    expect(res[0].secret, 'hidden field was incorrectly hidden internally').to.equal(createdModel.secret);
                    done();
                }).catch(done);
            });
        });

        describe('Model.find(query)', () =>
        {
            it('matching query - should find existing models', done =>
            {
                app.models.CrudModel.find(
                {
                    name: createdModel.name
                }).then(res =>
                {
                    expect(res, 'Incorrect response type').to.be.an('array');
                    expect(res.length, 'Incorrect number of results').to.equal(1);
                    expect(res[0].name, 'returned data is incorrect').to.equal(createdModel.name);
                    expect(res[0].id, 'incorrect id').to.equal(createdModel.id);
                    expect(res[0].secret, 'hidden field was incorrectly hidden internally').to.equal(createdModel.secret);
                    done();
                }).catch(done);
            });

            it('non-matching query - should find no models', done =>
            {
                app.models.CrudModel.find(
                {
                    name: 'bad query'
                }).then(res =>
                {
                    expect(res, 'Incorrect response type').to.be.an('array');
                    expect(res.length, 'A model was found incorrectly').to.equal(0);
                    done();
                }).catch(done);
            });

            it('non-matching query, multiple fields - should find no models', done =>
            {
                app.models.CrudModel.find(
                {
                    name: 'bad query',
                    id: createdModel.id
                }).then(res =>
                {
                    expect(res, 'Incorrect response type').to.be.an('array');
                    expect(res.length, 'A model was found incorrectly').to.equal(0);
                    done();
                }).catch(done);
            });
        });

        describe('Model.findById()', () =>
        {
            it('bad id - should find no model', done =>
            {
                const id = randomId(app);

                app.models.CrudModel.findById(id).then(res =>
                {
                    expect(res, 'Incorrect model found').to.not.exist;
                    done();
                }).catch(done);
            });

            it('correct id - should find correct existing model', done =>
            {
                app.models.CrudModel.findById(createdModel.id).then(res =>
                {
                    expect(res, 'Incorrect response type').to.be.an('object');
                    expect(res.name, 'returned data is incorrect').to.equal(createdModel.name);
                    expect(res.id, 'incorrect id').to.equal(createdModel.id);
                    expect(res.secret, 'hidden field was incorrectly hidden internally').to.equal(createdModel.secret);
                    done();
                }).catch(done);
            });
        });

        describe('Model.update()', () =>
        {
            it('incorrect id - should return null and NOT update', done =>
            {
                //Generate new random id
                const id = randomId(app);

                app.models.CrudModel.update(id, updateData).then(res =>
                {
                    expect(res, 'Valid response should not be returned').to.equal(null);
                    return app.models.CrudModel.findById(createdModel.id);
                }).then(res =>
                {
                    expect(res.name, 'Model was incorrectly updated').to.equal(createdModel.name);
                    expect(res.id, 'Model was incorrectly updated').to.equal(createdModel.id);
                    done();
                }).catch(done);
            });

            it('correct id - should update and return new instance', done =>
            {
                app.models.CrudModel.update(createdModel.id, updateData).then(res =>
                {
                    expect(res, 'Valid response should be returned').to.exist;
                    for (let key in updateData)
                    {
                        expect(res[key], 'incorrect data returned').to.equal(updateData[key]);
                    }

                    return app.models.CrudModel.findById(createdModel.id);
                }).then(res =>
                {
                    expect(res, 'Valid response should be returned').to.exist;
                    for (let key in updateData)
                    {
                        expect(res[key], 'incorrect data saved').to.equal(updateData[key]);
                    }
                    done();
                }).catch(done);
            });
        });

        describe('Model.updateMany(query)', () =>
        {
            before(done =>
            {
                let anotherModelData = {
                    name: 'another'
                };
                let unchangedModelData = {
                    name: 'unchanged'
                };
                app.models.CrudModel.create(anotherModelData).then((res) =>
                {
                    anotherModel = res;
                    ids = [createdModel.id, anotherModel.id];
                    return app.models.CrudModel.create(unchangedModelData);
                }).then(res =>
                {
                    unchangedModel = res;
                    done();
                }).catch(done);
            });

            it('query with no results - should return count: 0 and NOT update', done =>
            {
                //Generate new random id
                const id = randomId(app);
                const id2 = randomId(app);

                let query = {
                    id:
                    {
                        $in: [id, id2]
                    }
                }

                app.models.CrudModel.updateMany(query, updateManyData).then(res =>
                {
                    expect(res, 'Valid response should be returned').to.exist;
                    expect(res.count, 'Models were incorrectly updated').to.equal(0);
                    return app.models.CrudModel.findById(createdModel.id);
                }).then(res =>
                {
                    expect(res.name, 'Model was incorrectly updated').to.equal(updateData.name);
                    expect(res.id, 'Model was incorrectly updated').to.equal(createdModel.id);
                    done();
                }).catch(done);
            });

            it('should update all matching and return new instance', done =>
            {
                let query = {
                    id:
                    {
                        $in: ids
                    }
                };

                app.models.CrudModel.updateMany(query, updateManyData).then(res =>
                {
                    expect(res, 'Valid response should be returned').to.exist;
                    expect(res.count, 'Incorrect number of models were updated').to.equal(ids.length);

                    return app.models.CrudModel.find();
                }).then(results =>
                {
                    expect(results).to.be.an('array');
                    results.forEach(res =>
                    {
                        expect(res, 'Valid response should be returned').to.exist;
                        if (res.id === unchangedModel.id) expect(res.name).to.equal(unchangedModel.name);
                        else
                        {
                            for (let key in updateData)
                            {
                                expect(res[key], 'incorrect data saved').to.equal(updateManyData[key]);
                            }
                        }

                    });
                    done();
                }).catch(done);
            });
        });

        describe('Model.delete()', () =>
        {
            it('incorrect id - should return null and NOT delete', done =>
            {
                //Generate new random id
                const id = randomId(app);

                app.models.CrudModel.delete(id).then(res =>
                {
                    expect(res.count, 'Models deleted incorrectly').to.equal(0);
                    return app.models.CrudModel.findById(createdModel.id);
                }).then(res =>
                {
                    expect(res, 'Model was incorrectly deleted').to.exist;
                    expect(res.name, 'Model was incorrectly deleted').to.equal(updateManyData.name);
                    expect(res.id, 'Model was incorrectly deleted').to.equal(createdModel.id);
                    done();
                }).catch(done);
            });

            it('correct id - should delete', done =>
            {
                const query = {
                    id: createdModel.id
                };

                app.models.CrudModel.delete(createdModel.id).then(res =>
                {
                    expect(res.count, 'Models deleted incorrectly').to.equal(1);
                    return app.models.CrudModel.findById(createdModel.id);
                }).then(res =>
                {
                    expect(res, 'Model was not deleted').to.not.exist;
                    done();
                }).catch(done);
            });
        });

        describe('Model.deleteMany(query)', () =>
        {
            it('query with no results - should return count: 0 and NOT delete', done =>
            {
                //Generate new random id
                const id = randomId(app);
                const id2 = randomId(app);

                let query = {
                    id:
                    {
                        $in: [id, id2]
                    }
                }

                app.models.CrudModel.deleteMany(query, updateManyData).then(res =>
                {
                    expect(res, 'Valid response should be returned').to.exist;
                    expect(res.count, 'Models were incorrectly updated').to.equal(0);
                    return app.models.CrudModel.find();
                }).then(results =>
                {
                    expect(results).to.be.an('array');
                    expect(results.length, 'Models were incorrectly deleted').to.equal(2);
                    done();
                }).catch(done);
            });

            it('should delete remaining models', done =>
            {
                let deletionIds = [anotherModel.id, unchangedModel.id];
                const query = {
                    id:
                    {
                        $in: deletionIds
                    }
                };

                app.models.CrudModel.deleteMany(query).then(res =>
                {
                    expect(res.count, 'Models deleted incorrectly').to.equal(deletionIds.length);
                    return app.models.CrudModel.find();
                }).then(res =>
                {
                    expect(res).to.an('array');
                    expect(res.length).to.equal(0);
                    // expect(res, 'Model was not deleted').to.not.exist;
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

    describe('External', () =>
    {
        let app;
        let token;
        let createdModel;

        const testData = {
            name: 'Crud'
        };

        const updateData = {
            name: 'updated'
        };

        before(done =>
        {
            app = appBoot(localModelConfig);
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

        describe('POST /model', () =>
        {
            it('should create new model', done =>
            {
                request(app, 'post', makeUri(token)).send(testData).then(res =>
                {
                    res = res.body;
                    expect(res, 'Incorrect response type').to.be.an('object');
                    expect(res.name, 'returned data is incorrect').to.equal(testData.name);
                    expect(res.id, 'id not assigned').to.exist;
                    expect(res.secret, 'hidden field was not hidden').to.not.exist;

                    createdModel = res;

                    done();
                }).catch(done);
            });
        });

        describe('GET /model', () =>
        {
            it('should find existing models', done =>
            {
                request(app, 'get', makeUri(token)).then(res =>
                {
                    res = res.body;
                    expect(res, 'Incorrect response type').to.be.an('array');
                    expect(res.length, 'Incorrect number of results').to.equal(1);
                    expect(res[0].name, 'returned data is incorrect').to.equal(createdModel.name);
                    expect(res[0].id, 'incorrect id').to.equal(createdModel.id);
                    expect(res.secret, 'hidden field was not hidden').to.not.exist;
                    done();
                }).catch(done);
            });
        });

        describe('GET /model (with query)', () =>
        {
            it('matching query - should find existing models', done =>
            {
                request(app, 'get', makeUri(token)).query(
                {
                    name: createdModel.name
                }).then(res =>
                {
                    res = res.body;
                    expect(res, 'Incorrect response type').to.be.an('array');
                    expect(res.length, 'Incorrect number of results').to.equal(1);
                    expect(res[0].name, 'returned data is incorrect').to.equal(createdModel.name);
                    expect(res[0].id, 'incorrect id').to.equal(createdModel.id);
                    expect(res.secret, 'hidden field was not hidden').to.not.exist;
                    done();
                }).catch(done);
            });

            it('non-matching query - should find no models', done =>
            {
                request(app, 'get', makeUri(token)).query(
                {
                    name: 'bad query'
                }).then(res =>
                {
                    res = res.body;
                    expect(res, 'Incorrect response type').to.be.an('array');
                    expect(res.length, 'A model was found incorrectly').to.equal(0);
                    done();
                }).catch(done);
            });

            it('non-matching query, multiple fields - should find no models', done =>
            {
                request(app, 'get', makeUri(token)).query(
                {
                    name: 'bad query',
                    id: createdModel.id
                }).then(res =>
                {
                    res = res.body;
                    expect(res, 'Incorrect response type').to.be.an('array');
                    expect(res.length, 'A model was found incorrectly').to.equal(0);
                    done();
                }).catch(done);
            });
        });

        describe('GET /model/:id', () =>
        {
            it('bad id - should return error', done =>
            {
                const id = randomId(app);

                request(app, 'get', makeUri(token, id)).then(res =>
                {
                    expect(res.status, 'Incorrect error status').to.equal(404);
                    expect(res.body.error, 'Result is not an error').to.be.an('object');
                    expect(res.body.error.message).to.equal(`Resource "CrudModel" with id ${id} not found.`);
                    done();
                }).catch(done);
            });

            it('correct id - should find correct existing model', done =>
            {
                request(app, 'get', makeUri(token, createdModel.id)).then(res =>
                {
                    res = res.body;
                    expect(res, 'Incorrect response type').to.be.an('object');
                    expect(res.name, 'returned data is incorrect').to.equal(createdModel.name);
                    expect(res.id, 'incorrect id').to.equal(createdModel.id);
                    done();
                }).catch(done);
            });
        });

        describe('PATCH /model/:id', () =>
        {
            it('incorrect id - should return null and NOT update', done =>
            {
                //Generate new random id
                const id = randomId(app);

                request(app, 'patch', makeUri(token, id)).send(updateData).then(res =>
                {
                    expect(res.status, 'Incorrect error status').to.equal(404);
                    expect(res.body.error, 'Result is not an error').to.be.an('object');
                    expect(res.body.error.message).to.equal(`Resource "CrudModel" with id ${id} not found.`);
                    return app.models.CrudModel.findById(createdModel.id);
                }).then(res =>
                {
                    expect(res.name, 'Model was incorrectly updated').to.equal(createdModel.name);
                    expect(res.id, 'Model was incorrectly updated').to.equal(createdModel.id);
                    expect(res.secret, 'hidden field was not hidden').to.not.exist;
                    done();
                }).catch(done);
            });

            it('correct id - should update and return new instance', done =>
            {
                request(app, 'patch', makeUri(token, createdModel.id)).send(updateData).then(res =>
                {
                    res = res.body;
                    expect(res, 'Valid response should be returned').to.exist;
                    for (let key in updateData)
                    {
                        expect(res[key], 'incorrect data returned').to.equal(updateData[key]);
                    }

                    return app.models.CrudModel.findById(createdModel.id);
                }).then(res =>
                {
                    expect(res, 'Valid response should be returned').to.exist;
                    for (let key in updateData)
                    {
                        expect(res[key], 'incorrect data saved').to.equal(updateData[key]);
                    }
                    done();
                }).catch(done);
            });
        });

        describe('Model.delete()', () =>
        {
            it('incorrect id - should return null and NOT delete', done =>
            {
                //Generate new random id
                // const id = randomId(app);
                const id = app.adapter.test().randomId();

                request(app, 'delete', makeUri(token, id)).then(res =>
                {
                    res = res.body;
                    expect(res.count, 'Models deleted incorrectly').to.equal(0);
                    return app.models.CrudModel.findById(createdModel.id);
                }).then(res =>
                {
                    expect(res, 'Model was incorrectly deleted').to.exist;
                    expect(res.name, 'Model was incorrectly deleted').to.equal(updateData.name);
                    expect(res.id, 'Model was incorrectly deleted').to.equal(createdModel.id);
                    expect(res.secret, 'hidden field was not hidden').to.not.exist;
                    done();
                }).catch(done);
            });

            it('correct id - should delete', done =>
            {
                request(app, 'delete', makeUri(token, createdModel.id)).then(res =>
                {
                    res = res.body;
                    expect(res.count, 'Models deleted incorrectly').to.equal(1);
                    return app.models.CrudModel.findById(createdModel.id);
                }).then(res =>
                {
                    expect(res, 'Model was not deleted').to.not.exist;
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
        CrudModel:
        {
            definition: CrudModelDef,
        },
    };

    app.modelConfig = app.modelConfig.concat(localModelConfig);
    buildModels(app);
    app.use('/', rest(app));
    app.useErrorHandler();
    return app;
}

function makeUri(token, id)
{
    let uri = '/api/crudmodel/';
    if (id) uri += id;
    if (token) uri += `?access_token=${token}`;
    return uri;
}

function randomId(app)
{
    return app.adapter.test().randomId();
}