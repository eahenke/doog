const path = require('path');

//Express and Middleware
const express = require('express');
const compression = require('compression');
const bodyParser = require('body-parser');

const setupModels = require('./lib/setup/setup-models');
const buildModels = require('./lib/setup/model-builder');
const defaultModels = require('./lib/config/models');
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

    if (!options.manualSetup) setup(app, options);

    return app;
};