const db = require('./db');
const setupModels = require('./setup-models');
const modelBuilder = require('./model-builder');
const rest = require('./rest');

module.exports = function (app, options)
{
    //Setup database connection
    db(app, options);

    //Set up default and custom models with definition files
    const models = setupModels(app, options);

    //Build models and attach to the app
    modelBuilder(app);

    //Build the api routes
    app.use('/', rest(app, models));

    //Apply error handling
    app.useErrorHandler();
    return app;
};