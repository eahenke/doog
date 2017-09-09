const path = require('path');

//Express and Middleware
const express = require('express');
const compression = require('compression');
const bodyParser = require('body-parser');

const setupModels = require('./lib/setup/setup-models');
const buildModels = require('./lib/setup/model-builder');
const setup = require('./lib/setup/setup');

const getType = require('./lib/utils/get-type');
const clientErrorHandler = require('./lib/utils/error').clientErrorHandler;
const errorLogger = require('./lib/utils/error').errorLogger;

module.exports = function (projectRoot, options)
{
    if (arguments.length === 1 && getType(projectRoot) === 'Object')
    {
        options = projectRoot;
        projectRoot = null;
    }

    projectRoot = projectRoot || process.cwd();

    const defaultOptions = {
        manualSetup: false,
        suppressDevErrors: false
    };

    //Todo - more extendable, merge
    options = options || defaultOptions;

    const app = express();
    app.static = express.static;
    app.modulePath = path.resolve(__dirname);
    app.projectRoot = projectRoot;
    app.disable('x-powered-by');
    app.use(compression());
    app.use(bodyParser.json());

    app.modelConfig = [];
    app.models = {};

    app.addDefaultModels = function ()
    {
        const models = setupModels(app);
        buildModels(app);
    };

    app.useErrorHandler = function ()
    {
        if (options.suppressDevErrors) app.use(clientErrorHandler);
        else app.use(errorLogger, clientErrorHandler);
    };


    //Export non-hidden models and properties
    app.exportData = function ()
    {
        if (!app.models || !Object.keys(app.models).length) return Promise.resolve(
        {});

        const dbProms = [];
        for (let modelName in app.models)
        {
            const model = app.models[modelName];
            if (!model || !model.modelDefinition) continue;
            if (model.modelDefinition.export === false) continue;

            const prom = app.models[modelName].rest('find').then(data =>
            {
                return {
                    [modelName]: data
                };
            });
            dbProms.push(prom);
        }
        return Promise.all(dbProms).then(res =>
        {
            return res.reduce((obj, data) =>
            {
                return Object.assign(obj, data);
            },
            {});
        });
    }

    if (!options.manualSetup) setup(app, options);

    return app;
};