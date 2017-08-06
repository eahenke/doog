const BaseModel = require('../models/BaseModel');

module.exports = function (app)
{
    app.models = app.models ||
    {};

    for (let model in app.modelDefinitions)
    {
        if (!app.models[model]) buildModel(app, model, app.modelDefinitions[model]);
    }
};

function buildModel(app, name, definition)
{
    var model = new BaseModel(name, definition);
    model.build(app);
    app.models[name] = model;
}