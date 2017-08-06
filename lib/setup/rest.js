/* This file is responsible for building the REST endpoints for public models */
const Router = require('express').Router;
const sanitize = require('mongo-sanitize');
const notFoundError = require('../utils/error').notFoundError;
const tokenMiddleWare = require('../utils/token-auth').tokenMiddleWare;

const BASE_URL = '/api/';

module.exports = function (app, models)
{
    const routes = Router();
    models = models || app.modelConfig;

    buildRestEndpoints(app, routes, models);
    buildCustomEndpoints(app, routes, models);
    return routes;
};

/**
 * Attaches custom functions to their defined routes
 */
function buildCustomEndpoints(app, routes, models)
{
    models.forEach(m =>
    {
        let model = app.models[m.name];
        if (!model) return;

        if (!model.publicEndpoints || !model.publicEndpoints.length) return;

        model.publicEndpoints.forEach(endpoint =>
        {
            attachFnToRoute(routes, endpoint, [tokenMiddleWare.bind(null, app, endpoint)]);
        });
    });
}

function attachFnToRoute(routes, endpoint, middlewares)
{
    middlewares = middlewares || [];
    routes[endpoint.verb](`${BASE_URL}${endpoint.path}`, sanitizeInput, middlewares, endpoint.fn);
}

/**
 *  Build common REST Endpoints for publicaly exposed models
 */
function buildRestEndpoints(app, routes, models)
{
    const restMethods = methods(app);
    models.forEach(m =>
    {
        if (!m.public) return;
        if (!app.models[m.name]) return;

        //All REST endpoints protected
        const restOptions = {
            exposed: false
        };

        for (let verb in restMethods)
        {
            let endpoint = restMethods[verb](m);
            attachFnToRoute(routes, endpoint, [tokenMiddleWare.bind(null, app, restOptions)]);
        }
    });
}

/* Validation */

function sanitizeInput(req, res, next)
{
    req.body = sanitize(req.body);
    req.body = stripInviolables(req.body);
    req.query = sanitize(req.query);
    next();
}

function isValidId(app, query)
{
    if (app.adapter.hasValidId) return app.adapter.hasValidId(query);
    else return true;
}

function stripInviolables(data)
{
    const inviolableFields = ['id', '_id'];
    inviolableFields.forEach(f =>
    {
        if (data[f]) delete data[f];
    });
    return data;
}

/* Errors */

function error404Message(modelName, id)
{
    let message = `Resource "${modelName}" not found.`;
    if (id) message = `Resource "${modelName}" with id ${id} not found.`;
    return message;
}

/* Methods */
function methods(app)
{
    const idRegex = '([a-fA-F\\d]{24})';

    return {
        get: model =>
        {
            return {
                verb: 'get',
                path: `${model.name.toLowerCase()}`,
                fn: (req, res, next) =>
                {
                    if (!isValidId(app, req.query)) return res.status(200).send([]);
                    if (!app.models[model.name]) return next(notFoundError(error404Message(model.name)));

                    return app.models[model.name].rest('find', req.query).then(data =>
                    {
                        if (!data) data = [];
                        return res.status(200).json(data);
                    }).catch(next);
                }
            };
        },
        getById: model =>
        {
            return {
                verb: 'get',
                path: `${model.name.toLowerCase()}/:id${idRegex}`,
                fn: (req, res, next) =>
                {
                    if (!app.models[model.name]) return next(notFoundError(error404Message(model.name)));
                    if (!isValidId(app, req.params)) return next(notFoundError(error404Message(model.name, req.params.id)));

                    return app.models[model.name]
                        .findById(req.params.id)
                        .then(data =>
                        {
                            if (!data) return next(notFoundError(error404Message(model.name, req.params.id)));
                            return res.status(200).json(data);
                        })
                        .catch(next);
                }
            };
        },
        post: model =>
        {
            return {
                verb: 'post',
                path: `${model.name.toLowerCase()}`,
                fn: (req, res, next) =>
                {
                    app.models[model.name].rest('create', req.body).then(data =>
                    {
                        return res.status(200).send(data);
                    }).catch(next);
                }
            };
        },
        patch: model =>
        {
            return {
                verb: 'patch',
                path: `${model.name.toLowerCase()}/:id${idRegex}`,
                fn: (req, res, next) =>
                {
                    if (!app.models[model.name]) return next(notFoundError(error404Message(model.name)));
                    if (!isValidId(app, req.params)) return next(notFoundError(error404Message(model.name, req.params.id)));

                    const id = req.params.id;
                    app.models[model.name].rest('update', id, req.body).then(data =>
                    {
                        if (data === null) return next(notFoundError(error404Message(model.name, req.params.id)));
                        return res.status(200).send(data);
                    }).catch(next);
                }
            };
        },
        delete: model =>
        {
            return {
                verb: 'delete',
                path: `${model.name.toLowerCase()}/:id${idRegex}`,
                fn: (req, res, next) =>
                {
                    if (!app.models[model.name]) return next(notFoundError(error404Message(model.name)));
                    if (!isValidId(app, req.params)) return next(notFoundError(error404Message(model.name, req.params.id)));

                    const id = req.params.id;
                    app.models[model.name].rest('delete', id).then(data =>
                    {
                        return res.status(200).send(data);
                    }).catch(next);
                }
            };
        }
    };
}