module.exports = function (app, models)
{
    app.models = app.models ||
    {};

    models.forEach(m =>
    {
        if (!m.name) return;
        try
        {
            let modelClass = require(m.definitionFile).buildModel();
            modelClass.app = app;
            app.models[m.name] = modelClass;
        }
        catch (e)
        {
            throw new Error(`Model ${m.name} has no definition file`);
        }
    });
    if (!app.modelConfig) app.modelConfig = models;
    else app.modelConfig = app.modelConfig.concat(models);
};