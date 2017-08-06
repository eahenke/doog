const fs = require('fs');
const path = require('path');
const defaultModels = require('../config/models');

/**
 *  Set up default and custom models
 *  First looks for a models.js/on file in project-root.
 *  Second, looks for a model.js/on file in project-root/config/
 *
 *  Looks for model definition files in project-root/models/
 */
module.exports = function (app, options)
{
    app.modelDefinitions = app.modelDefinitions ||
    {};
    app.modelConfig = app.modelConfig || [];

    const libPath = `${app.modulePath}/lib`;

    defaultModels.forEach(model =>
    {
        model.definitionFile = findDefFilePath(libPath, model);
        model.logicFile = findLogicFilePath(libPath, model);
        registerModelDef(app, model);
    });

    const models = defaultModels;

    let customModels = [];
    const modelListPath = `${app.projectRoot}/models.js`;
    const modelListPathJson = `${modelListPath}on`;
    const modelListConfigPath = `${app.projectRoot}/config/models.js`;
    const modelListConfigPathJson = `${modelListConfigPath}on`;

    if (fs.existsSync(modelListPath)) customModels = require(modelListPath);
    else if (fs.existsSync(modelListPathJson)) customModels = require(modelListPathJson);
    if (fs.existsSync(modelListConfigPath)) customModels = require(modelListConfigPath);
    else if (fs.existsSync(modelListConfigPathJson)) customModels = require(modelListConfigPathJson);

    customModels.forEach(model =>
    {
        model.definitionFile = findDefFilePath(app.projectRoot, model);
        model.logicFile = findLogicFilePath(app.projectRoot, model);

        registerModelDef(app, model);
    });

    const totalModels = models.concat(customModels);

    app.modelConfig = totalModels;
    return totalModels;
};

function registerModelDef(app, model)
{
    let modelLogic;
    let modelDef;
    try
    {
        modelDef = require(model.definitionFile);
    }
    catch (e)
    {
        throw new Error(`Unable to load model definition for ${model.name}`);
    }
    try
    {
        modelLogic = require(model.logicFile);
    }
    catch (e)
    {}

    app.modelDefinitions[model.name] = {
        definition: modelDef,
        logic: modelLogic,
    };
}

function findDefFilePath(projectRoot, model)
{
    if (!model || !model.name) return null;
    const defFilePath = `${projectRoot}/models/${model.name}.json`;

    if (fs.existsSync(defFilePath)) return defFilePath;
    else
        throw new Error(
            `No definition file found for model ${model.name}. Please add a model definition file to project-root/models folder`
        );
}

function findLogicFilePath(projectRoot, model)
{
    if (!model || !model.name) return null;
    const logicFilePath = `${projectRoot}/models/${model.name}.js`;
    if (fs.existsSync(logicFilePath)) return logicFilePath;
}