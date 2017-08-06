const operationHooks = require('../hooks/operation-hooks');
const getType = require('../utils/get-type');

module.exports = class BaseModel
{
    constructor(name, definition)
    {
        const baseSchemaDef = require('./BaseModel.json').properties;

        this.modelName = name;
        this.modelDefinition = definition.definition;
        this.modelLogic = definition.logic;
        this.operationHookQueue = {
            before:
            {},
            after:
            {},
        };

        this.instanceMethods = {};
        this.publicEndpoints = [];

        let modelProperties = definition.definition.properties ||
        {};
        this.modelProperties = Object.assign(
        {}, baseSchemaDef, modelProperties);
        this.hiddenFields = Object.keys(this.modelProperties).filter(prop =>
        {
            return this.modelProperties[prop].hidden === true;
        });
    }

    hook(hookType, fn)
    {
        let hookTypeComponents = hookType.split(' ');
        let phase = hookTypeComponents[0];
        let operation = hookTypeComponents[1];

        //Error message for non-supported hooks?
        if (!phase || !operation) return;

        let currentHooks = this.operationHookQueue[phase] && this.operationHookQueue[phase][operation];
        if (getType(currentHooks) === 'Array' && currentHooks.length) currentHooks.push(fn);
        else this.operationHookQueue[phase][operation] = [fn];
    }

    addInstanceMethod(name, fn)
    {
        this.instanceMethods[name] = fn;
    }

    build(app)
    {
        this.app = app;

        //Run main logic file to set up hooks and remote endpoints
        if (this.modelLogic && typeof this.modelLogic === 'function') this.modelLogic(this);

        app.adapter.addModel(this.modelName, this.modelProperties);

        methods().forEach(m =>
        {
            this[m.name] = methodUnsupportedError(m.name, app.adapter.name);

            let adapterMethods = app.adapter.methods(this.modelName);
            if (adapterMethods[m.name])
            {
                this[m.name] = this.addMethod(m, adapterMethods[m.name]);
            }
        });
    }

    filterHiddenProps(data)
    {
        if (!data) return data;

        if (getType(data) === 'Array')
        {
            return data.map((d) =>
            {
                return this.filterHiddenProps(d);
            });
        }

        this.hiddenFields.forEach(f =>
        {
            if (data[f]) delete data[f];
        });
        return data;
    }

    rest(...args)
    {
        const method = args.shift();
        const methodConfig = methods().find(m =>
        {
            return m.name === method;
        });
        return this[method](...args).then(res =>
        {
            if (methodConfig.returnsInstance)
            {
                return this.filterHiddenProps(res);
            }
            return res;
        });
    }

    addMethod(method, fn)
    {
        return function ()
        {
            //Clone args
            let args = new Array(arguments.length);
            for (let i = 0, len = args.length; i < len; i++)
            {
                args[i] = JSON.parse(JSON.stringify(arguments[i]));
            }

            const events = method.events;
            if (!events || !events.length) return fn.apply(this, args);

            //TODO add more info to contex
            let defaultCtx = {
                modelName: this.modelName,
                Model: this,
                query: queryContext(method.name, args),
                data: dataContext(method.name, args),
                state:
                {}
            };
            let context = Object.assign(defaultCtx, method.context);

            let beforeHooks = concatOperationHooks('before', events, this.operationHookQueue);
            let afterHooks = concatOperationHooks('after', events, this.operationHookQueue);

            return operationHooks(context, beforeHooks).then(ctx =>
            {
                args = deQueryContext(method.name, args, ctx);
                return fn.apply(this, args);
            }).then(res =>
            {
                context.data = res;

                return operationHooks(context, afterHooks);
            }).then(ctx =>
            {
                applyInstanceMethods(this, ctx.data);
                return ctx.data;
            });
        };
    }

    /**
     *  Registers an endpoint to be exposed via the api
     * fn                   Function. Required.  Promise-based function to run when endpoint requested.
     * options
     *      name            String. Required. Name of endpoint, will be use when calling internally.
     *      private         Bool. Optional. If true, endpoint will not be exposed, but will be available internally
     *      exposed         Bool. Optional. If true, endpoint will not require an access token
     *      http            Object. Required.  Http information
     *          verb            String.  Required. HTTP verb (GET, POST, PUT, PATCH, DELETE)
     *          path            String. Required.  Path to endpoint
     *      args            Object. Optional. Argument name, type, location information.
     *          type            String. Required. Javascript type
     *          required        Bool. Optional
     *          fromPath        Bool.  If true, param will be pulled from route path
     *
     */
    registerEndpoint(fn, options)
    {
        if (!fn) throw new Error('Must include a function to register endpoint');

        options.modelName = this.modelName;
        const endpoint = buildEndpoint(this, options, fn);
        if (!options.private) this.publicEndpoints.push(endpoint);
        this[options.name] = fn;
    }
};

function buildEndpoint(model, options, fn)
{
    validateEndpointOptions(options);
    let path = options.http.path;

    //If `:id` is found in the path, apply a regex to match id to the path as well
    path = addIdRegexToPath(model.app.adapter, path);

    return {
        path: `${model.modelName.toLowerCase()}${path}`,
        verb: options.http.verb.toLowerCase(),
        exposed: options.exposed,
        fn: wrapEndpoint(model, fn, options)
    };
}

/**
 *  Checks that the options object contains all required fields
 */
function validateEndpointOptions(options)
{
    if (!options.hasOwnProperty('name') || !checkType(options.name, 'string'))
        throw new Error('Name is required for endpoints');
    if (!options.http || !checkType(options.http, 'object')) throw new Error('http object is required for endpoints');
    if (!options.http.verb || !checkType(options.http.verb, 'string'))
        throw new Error('http.verb is required for endpoints');
    if (!options.http.path || !checkType(options.http.path, 'string'))
        throw new Error('http.path is required for endpoints');

    //Check that options.args have all the required informaton here
    options.args = options.args || [];
    options.args.forEach(arg =>
    {
        if (!arg.arg || !checkType(arg.arg, 'string'))
            throw new Error("Argument property 'arg' is required for endpoint arugments");
        if (!arg.type || !checkType(arg.type, 'string'))
            throw new Error("Argument property 'type' is required for endpoint arugments");
    });
}

/**
 * Responsible for applying arguments to a public endpoint
 */
function wrapEndpoint(model, fn, options)
{
    return function (req, res, next)
    {
        const args = gatherArgs(req, options);
        return fn
            .apply(model, args)
            .then(result =>
            {
                res.status(200).send(result);
            })
            .catch(next);
    };
}

/**
 * Responsible for pulling arguments from correct location based on options
 * and validating those arguments.
 */
function gatherArgs(req, options)
{
    if (!options.args) return [];

    return options.args.map(arg =>
    {
        const argSource = arg.fromPath ? req.params : req.body;

        if (arg.required && !argSource.hasOwnProperty(arg.arg)) throw new Error(`${arg.arg} is required`);
        if (!checkType(argSource[arg.arg], arg.type)) throw new Error(`${arg.arg} is not of type ${arg.type}`);
        return argSource[arg.arg];
    });
}

/**
 * Adds an id matching regex to an endpoints path
 */
function addIdRegexToPath(adapter, path)
{
    const idRegex = adapter.idPathRegex || '';
    if (/:id/.test(path)) path = path.replace(':id', `:id${idRegex}`);
    return path;
}

function checkType(value, type)
{
    return Object.prototype.toString.call(value).slice(8, -1).toLowerCase() === type.toLowerCase();
}

function applyInstanceMethods(model, instance)
{
    let instances = instance;
    if (getType(instances) !== 'Array') instances = [instance];

    instances.forEach(inst =>
    {
        for (let method in model.instanceMethods)
        {
            inst[method] = model.instanceMethods[method].bind(inst);
        }
    });
}

function concatOperationHooks(phase, events, queue)
{
    return events.reduce((prev, curr) =>
    {
        let hooks = queue[phase][curr] || [];
        return prev.concat(hooks);
    }, []);
}


function queryContext(methodName, args)
{
    let query = {};
    if (methodName === 'findById' || methodName === 'update' || methodName === 'delete')
    {
        query = {
            id: args[0]
        };
    }
    else query = args[0];
    return query;
}

function dataContext(methodName, args)
{
    let data = {};
    if (methodName === 'create') data = args[0];
    else if (methodName === 'update') data = args[1];
    return data;
}

function deQueryContext(methodName, args, ctx)
{
    if (methodName === 'findById' || methodName === 'update' || methodName === 'delete')
    {
        if (ctx.query) args[0] = ctx.query.id;
    }
    return args;
}


function methods()
{
    return [
    {
        name: 'find',
        events: ['find'],
        context:
        {
            method: 'find'
        },
        returnsInstance: true
    },
    {
        name: 'findOne',
        events: ['find'],
        context:
        {
            method: 'findOne'
        },
        returnsInstance: true
    },
    {
        name: 'findById',
        events: ['find'],
        context:
        {
            method: 'findById'
        },
        returnsInstance: true
    },
    {
        name: 'create',
        events: ['save'],
        context:
        {
            method: 'create',
            isNew: true
        },
        returnsInstance: true
    },
    {
        name: 'update',
        events: ['save'],
        context:
        {
            method: 'update',
            isNew: false
        },
        returnsInstance: true
    },
    {
        name: 'updateMany',
        events: [],
        context:
        {
            method: 'update',
            isNew: false
        },
        returnsInstance: false
    },
    {
        name: 'delete',
        events: ['delete'],
        context:
        {
            method: 'delete'
        },
        returnsInstance: false
    },
    {
        name: 'deleteMany',
        events: ['delete'],
        context:
        {
            method: 'deleteMany'
        },
        returnsInstance: false
    }];
}

function methodUnsupportedError(method, adapterName)
{
    return () =>
    {
        throw new Error(`${method} is not supported by adapter ${adapterName}`);
    };
}